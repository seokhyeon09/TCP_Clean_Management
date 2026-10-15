package com.tcp.cleanmanagement.service;

import com.tcp.cleanmanagement.dto.DeviceSetResponse;
import com.tcp.cleanmanagement.dto.SensorReadingResponse;
import com.tcp.cleanmanagement.dto.ZoneDashboardResponse;
import com.tcp.cleanmanagement.entity.DeviceSet;
import com.tcp.cleanmanagement.entity.Sensor;
import com.tcp.cleanmanagement.entity.SensorMetric;
import com.tcp.cleanmanagement.entity.Zone;
import com.tcp.cleanmanagement.enums.MetricCode;
import com.tcp.cleanmanagement.enums.SensorModel;
import com.tcp.cleanmanagement.repository.*;
import com.tcp.cleanmanagement.security.AuthUser;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ZoneDashboardService {
    private final ZoneRepository zoneRepository;
    private final ZonePermissionRepository zonePermissionRepository;
    private final DeviceSetRepository deviceSetRepository;
    private final SensorMetricRepository sensorMetricRepository;
    private final SensorDataRawRepository rawRepository;
    private final SensorRepository sensorRepository;
    private final SensorAiService sensorAiService;

    @Value("${app.device.online-threshold-seconds:30}")
    private long onlineThresholdSeconds;

    @Transactional(readOnly = true)
    public ZoneDashboardResponse getDashboard(Long zoneId, AuthUser caller) {
        verifyZoneAccess(zoneId, caller);

        Zone zone = zoneRepository.findById(zoneId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Zone not found"));

        List<DeviceSet> sets = deviceSetRepository.findActiveByZoneIds(List.of(zoneId));
        List<SensorMetric> metrics = sensorMetricRepository.findDashboardMetricsByZoneId(zoneId);

        Map<Long, Map<String, BigDecimal>> devMetricsMap = new HashMap<>();
        Map<Long, Map<SensorModel, Long>> devSensorIdsMap = new HashMap<>();

        List<BigDecimal> tempValues = new ArrayList<>();
        List<BigDecimal> humidValues = new ArrayList<>();
        List<BigDecimal> mq135Values = new ArrayList<>();
        List<BigDecimal> mq7Values = new ArrayList<>();
        LocalDateTime lastDataReceivedAt = null;

        for (SensorMetric m : metrics) {
            Sensor sensor = m.getSensor();
            DeviceSet ds = sensor != null ? sensor.getDeviceSet() : null;
            Long dsId = ds != null ? ds.getId() : null;

            if (dsId != null && sensor.getSensorModel() != null) {
                devSensorIdsMap.computeIfAbsent(dsId, k -> new EnumMap<>(SensorModel.class))
                        .put(sensor.getSensorModel(), sensor.getId());
            }

            List<RawPoint> latest = rawRepository.findLatest(m.getId(), zoneId, PageRequest.of(0, 1));
            if (!latest.isEmpty()) {
                RawPoint pt = latest.get(0);
                BigDecimal val = pt.value();
                if (lastDataReceivedAt == null || pt.measuredAt().isAfter(lastDataReceivedAt)) {
                    lastDataReceivedAt = pt.measuredAt();
                }

                String metricKey = null;
                if (m.getMetricCode() == MetricCode.TEMPERATURE) {
                    metricKey = "TEMPERATURE";
                    tempValues.add(val);
                } else if (m.getMetricCode() == MetricCode.HUMIDITY) {
                    metricKey = "HUMIDITY";
                    humidValues.add(val);
                } else if (sensor != null && sensor.getSensorModel() == SensorModel.MQ135) {
                    metricKey = "MQ135";
                    mq135Values.add(val);
                } else if (sensor != null && sensor.getSensorModel() == SensorModel.MQ7) {
                    metricKey = "MQ7";
                    mq7Values.add(val);
                }

                if (dsId != null && metricKey != null) {
                    devMetricsMap.computeIfAbsent(dsId, k -> new HashMap<>()).put(metricKey, val);
                }
            }
        }

        List<DeviceSetResponse> deviceResponses = new ArrayList<>();
        boolean hasOnlineDevice = false;

        for (DeviceSet set : sets) {
            boolean isOnline = set.getLastSeenAt() != null &&
                    set.getLastSeenAt().isAfter(LocalDateTime.now(ZoneOffset.UTC).minusSeconds(onlineThresholdSeconds));
            if (set.isActive() && isOnline) {
                hasOnlineDevice = true;
            }

            Map<SensorModel, Long> sIds = devSensorIdsMap.getOrDefault(set.getId(), Collections.emptyMap());
            Map<String, BigDecimal> lVals = devMetricsMap.getOrDefault(set.getId(), Collections.emptyMap());

            deviceResponses.add(DeviceSetResponse.builder()
                    .deviceSetId(set.getId())
                    .setCode(set.getSetCode())
                    .macAddress(set.getMacAddress())
                    .zoneId(set.getZone().getId())
                    .zoneName(set.getZone().getName())
                    .installationLabel(set.getInstallationLabel())
                    .active(set.isActive())
                    .lastSeenAt(set.getLastSeenAt())
                    .online(set.isActive() && isOnline)
                    .sensorIds(sIds)
                    .latestValues(lVals)
                    .build());
        }

        // Aggregate zone metrics across multiple devices
        Map<String, ZoneDashboardResponse.LatestMetricInfo> latestMetrics = new HashMap<>();
        BigDecimal latestTemp = averageBigDecimal(tempValues);
        BigDecimal latestHumid = averageBigDecimal(humidValues);
        BigDecimal latestMq135 = averageBigDecimal(mq135Values);
        BigDecimal latestMq7 = maxBigDecimal(mq7Values); // Fire/smoke takes maximum for safety

        if (latestTemp != null) {
            String eval = "NORMAL";
            if (latestTemp.compareTo(BigDecimal.ZERO) < 0 || latestTemp.compareTo(new BigDecimal("35")) > 0) {
                eval = "DANGER";
            } else if (latestTemp.compareTo(new BigDecimal("15")) < 0 || latestTemp.compareTo(new BigDecimal("28")) > 0) {
                eval = "CAUTION";
            }
            latestMetrics.put("TEMPERATURE", ZoneDashboardResponse.LatestMetricInfo.builder()
                    .metricCode(MetricCode.TEMPERATURE)
                    .unitCode("C")
                    .currentValue(latestTemp)
                    .measuredAt(lastDataReceivedAt)
                    .evaluationStatus(eval)
                    .build());
        }

        if (latestHumid != null) {
            String eval = latestHumid.compareTo(new BigDecimal("80")) > 0 ? "CAUTION" : "NORMAL";
            latestMetrics.put("HUMIDITY", ZoneDashboardResponse.LatestMetricInfo.builder()
                    .metricCode(MetricCode.HUMIDITY)
                    .unitCode("%")
                    .currentValue(latestHumid)
                    .measuredAt(lastDataReceivedAt)
                    .evaluationStatus(eval)
                    .build());
        }

        if (latestMq135 != null) {
            String eval = "NORMAL";
            if (latestMq135.compareTo(new BigDecimal("3000")) > 0) {
                eval = "DANGER";
            } else if (latestMq135.compareTo(new BigDecimal("2000")) > 0) {
                eval = "CAUTION";
            }
            ZoneDashboardResponse.LatestMetricInfo info = ZoneDashboardResponse.LatestMetricInfo.builder()
                    .sensorModel(SensorModel.MQ135)
                    .metricCode(MetricCode.GAS)
                    .unitCode("ADC")
                    .currentValue(latestMq135)
                    .measuredAt(lastDataReceivedAt)
                    .evaluationStatus(eval)
                    .build();
            latestMetrics.put("MQ135", info);
            latestMetrics.put("GAS", info);
        }

        if (latestMq7 != null) {
            String eval = latestMq7.compareTo(new BigDecimal("1500")) > 0 ? "DANGER" : "NORMAL";
            latestMetrics.put("MQ7", ZoneDashboardResponse.LatestMetricInfo.builder()
                    .sensorModel(SensorModel.MQ7)
                    .metricCode(MetricCode.GAS)
                    .unitCode("ADC")
                    .currentValue(latestMq7)
                    .measuredAt(lastDataReceivedAt)
                    .evaluationStatus(eval)
                    .build());
        }

        Integer score = calculateComfortScore(latestTemp, latestHumid, latestMq135);
        String overallStatus;
        String statusMsg;

        if (score == null) {
            overallStatus = "NO_DATA";
            statusMsg = "센서 데이터 수집 대기 중입니다.";
        } else if (score >= 80) {
            overallStatus = "PLEASANT";
            statusMsg = "실내 공기질과 온습도가 쾌적하게 유지되고 있습니다.";
        } else if (score >= 50) {
            overallStatus = "NEEDS_VENTILATION";
            statusMsg = "공기질 또는 습도 관리를 위해 환기가 권장됩니다.";
        } else {
            overallStatus = "WARNING";
            statusMsg = "주의가 필요한 이상 수치가 감지되었습니다. 즉시 확인 바랍니다.";
        }

        return ZoneDashboardResponse.builder()
                .zoneId(zone.getId())
                .zoneName(zone.getName())
                .comfortScore(score)
                .overallStatus(overallStatus)
                .statusMessage(statusMsg)
                .hasOnlineDevice(hasOnlineDevice)
                .lastDataReceivedAt(lastDataReceivedAt)
                .devices(deviceResponses)
                .aiAssessments(sensorAiService.getAssessments(sets))
                .latestMetrics(latestMetrics)
                .build();
    }

    @Transactional(readOnly = true)
    public List<SensorReadingResponse> getSeries(Long zoneId, LocalDateTime from, LocalDateTime to,
                                                MetricCode metricCode, AuthUser caller) {
        verifyZoneAccess(zoneId, caller);

        if (from == null) {
            from = LocalDateTime.now(ZoneOffset.UTC).minusHours(1);
        }
        if (to == null) {
            to = LocalDateTime.now(ZoneOffset.UTC);
        }

        List<SensorMetric> metrics = sensorMetricRepository.findDashboardMetricsByZoneId(zoneId);
        if (metricCode != null) {
            metrics = metrics.stream().filter(m -> m.getMetricCode() == metricCode).toList();
        }

        List<Long> metricIds = metrics.stream().map(SensorMetric::getId).toList();
        if (metricIds.isEmpty()) {
            return Collections.emptyList();
        }

        Map<Long, SensorMetric> metricMap = new HashMap<>();
        for (SensorMetric m : metrics) {
            metricMap.put(m.getId(), m);
        }

        List<RawPoint> rawPoints = rawRepository.findSeries(metricIds, zoneId, from, to);
        return rawPoints.stream().map(pt -> {
            SensorMetric m = metricMap.get(pt.metricId());
            return SensorReadingResponse.builder()
                    .metricId(pt.metricId())
                    .metricCode(m != null ? m.getMetricCode() : null)
                    .unitCode(m != null ? m.getUnitCode() : null)
                    .measuredValue(pt.value())
                    .measuredAt(pt.measuredAt())
                    .build();
        }).toList();
    }

    public void verifyZoneAccess(Long zoneId, AuthUser caller) {
        if (caller == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Login required");
        }
        if (caller.isAdmin()) {
            return;
        }
        boolean allowed = zonePermissionRepository.existsByUserIdAndZoneId(caller.id(), zoneId);
        if (!allowed) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access to zone " + zoneId + " is denied");
        }
    }

    private Integer calculateComfortScore(BigDecimal temp, BigDecimal humid, BigDecimal gas) {
        if (temp == null && humid == null && gas == null) {
            return null;
        }
        int score = 100;

        // 온도 감점
        if (temp != null) {
            double t = temp.doubleValue();
            if (t < 15.0 || t > 28.0) {
                score -= Math.min(25, (int)(Math.abs(t - 22.0) * 3));
            }
        }
        // 습도 감점
        if (humid != null) {
            double h = humid.doubleValue();
            if (h > 70.0) {
                score -= Math.min(25, (int)((h - 70.0) * 1.5));
            } else if (h < 30.0) {
                score -= Math.min(15, (int)((30.0 - h) * 1.0));
            }
        }
        // 가스 감점 (MQ 센서 원시값 기준)
        if (gas != null) {
            double g = gas.doubleValue();
            if (g > 1500.0) {
                score -= Math.min(50, (int)((g - 1500.0) / 40.0));
            }
        }

        return Math.max(0, Math.min(100, score));
    }

    private DeviceSetResponse responseForDeviceSet(DeviceSet set) {
        Map<SensorModel, Long> ids = new EnumMap<>(SensorModel.class);
        for (Sensor sensor : sensorRepository.findByDeviceSetIdOrderByIdAsc(set.getId())) {
            ids.put(sensor.getSensorModel(), sensor.getId());
        }
        boolean isOnline = set.getLastSeenAt() != null &&
                set.getLastSeenAt().isAfter(LocalDateTime.now(ZoneOffset.UTC).minusSeconds(onlineThresholdSeconds));

        return DeviceSetResponse.builder()
                .deviceSetId(set.getId())
                .setCode(set.getSetCode())
                .macAddress(set.getMacAddress())
                .zoneId(set.getZone().getId())
                .zoneName(set.getZone().getName())
                .installationLabel(set.getInstallationLabel())
                .active(set.isActive())
                .lastSeenAt(set.getLastSeenAt())
                .online(set.isActive() && isOnline)
                .sensorIds(ids)
                .build();
    }

    private BigDecimal averageBigDecimal(List<BigDecimal> list) {
        if (list == null || list.isEmpty()) {
            return null;
        }
        BigDecimal sum = BigDecimal.ZERO;
        for (BigDecimal b : list) {
            sum = sum.add(b);
        }
        return sum.divide(BigDecimal.valueOf(list.size()), 2, RoundingMode.HALF_UP);
    }

    private BigDecimal maxBigDecimal(List<BigDecimal> list) {
        if (list == null || list.isEmpty()) {
            return null;
        }
        BigDecimal max = list.get(0);
        for (BigDecimal b : list) {
            if (b.compareTo(max) > 0) {
                max = b;
            }
        }
        return max;
    }
}

