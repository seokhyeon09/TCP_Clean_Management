package com.tcp.cleanmanagement.service;

import com.tcp.cleanmanagement.dto.AiAssessment;
import com.tcp.cleanmanagement.dto.AiSample;
import com.tcp.cleanmanagement.entity.DeviceSet;
import com.tcp.cleanmanagement.entity.DeviceSetHistory;
import com.tcp.cleanmanagement.repository.DeviceSetHistoryRepository;
import com.tcp.cleanmanagement.repository.SensorDataRawRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SensorAiService {
    private final DeviceSetHistoryRepository histories;
    private final SensorDataRawRepository readings;
    private final AiSampleAssembler assembler;
    private final SensorAiClient client;
    private final SensorAiAlertService alerts;
    private final Map<Long, AiAssessment> latest = new ConcurrentHashMap<>();

    @Value("${app.sensor-ai.enabled:true}")
    private boolean enabled = true;
    @Value("${app.device.online-threshold-seconds:30}")
    private long onlineThresholdSeconds = 30;

    @Scheduled(fixedDelayString = "${app.sensor-ai.poll-interval-ms:15000}", initialDelay = 5000)
    public void refresh() {
        if (!enabled) return;
        List<DeviceSetHistory> active = histories.findCurrentActiveHistories();
        Set<Long> activeIds = active.stream().map(DeviceSetHistory::getId).collect(Collectors.toSet());
        latest.keySet().retainAll(activeIds);
        for (DeviceSetHistory history : active) {
            try {
                evaluate(history);
            } catch (RuntimeException error) {
                // An inference outage never prevents ingestion or dashboard reads.
                latest.put(history.getId(), state(history, "UNAVAILABLE", "AI 판정 서비스 연결을 확인해 주세요."));
                log.warn("Sensor AI unavailable for installation {}: {}", history.getId(), error.toString());
            }
        }
    }

    private void evaluate(DeviceSetHistory history) {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        if (!online(history.getDeviceSet(), now)) {
            latest.put(history.getId(), state(history, "OFFLINE", "기기 연결 대기 중입니다."));
            return;
        }
        // Allow 5 s for independently posted channels to commit before closing a bin.
        long endSecond = Math.floorDiv(now.minusSeconds(5).toEpochSecond(ZoneOffset.UTC), 15) * 15;
        LocalDateTime end = LocalDateTime.ofEpochSecond(endSecond, 0, ZoneOffset.UTC);
        List<AiSample> samples = assembler.assemble(
                readings.findAiHistory(history.getId(), end.minusHours(10), end), end);
        if (samples.isEmpty()) {
            latest.put(history.getId(), state(history, "NO_DATA", "온도·습도·MQ-135의 연속 데이터 수집 대기 중입니다."));
            return;
        }
        Map<String, Object> result = client.evaluate("installation-" + history.getId(), samples);
        boolean ready = Boolean.TRUE.equals(result.get("ready"));
        String alertError = null;
        if (ready) {
            try {
                alerts.record(history, result);
            } catch (RuntimeException error) {
                alertError = "AI 판정은 완료됐지만 알림 저장에 실패했습니다. DB 설정을 확인해 주세요.";
                log.error("AI alert persistence failed for installation {}: {}", history.getId(), error.toString());
            }
        }
        AiAssessment assessment = new AiAssessment(history.getDeviceSet().getId(), history.getId(),
                history.getSetCode(), history.getInstallationLabel(), ready ? "READY" : "WARMING_UP",
                Objects.toString(result.get("headline"), ""), now, result, alertError);
        latest.put(history.getId(), assessment);
    }

    public List<AiAssessment> getAssessments(List<DeviceSet> sets) {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        return sets.stream().map(set -> {
            DeviceSetHistory history = histories.findFirstByDeviceSetIdOrderByIdDesc(set.getId()).orElse(null);
            if (history == null) return new AiAssessment(set.getId(), null, set.getSetCode(),
                    set.getInstallationLabel(), "NO_DATA", "설치 이력과 센서 데이터 수집 대기 중입니다.", null, null, null);
            if (!enabled) return state(history, "DISABLED", "AI 판정이 비활성화되어 있습니다.");
            if (!online(set, now)) return state(history, "OFFLINE", "기기 연결 대기 중입니다.");
            AiAssessment assessment = latest.get(history.getId());
            if (assessment == null) return state(history, "PENDING", "첫 AI 판정 대기 중입니다.");
            if (assessment.evaluatedAt().isBefore(now.minusSeconds(60))) {
                return state(history, "UNAVAILABLE", "최신 AI 판정을 기다리는 중입니다.");
            }
            return assessment;
        }).toList();
    }

    private boolean online(DeviceSet set, LocalDateTime now) {
        return set.isActive() && set.getLastSeenAt() != null
                && set.getLastSeenAt().isAfter(now.minusSeconds(onlineThresholdSeconds));
    }

    private AiAssessment state(DeviceSetHistory h, String status, String message) {
        return new AiAssessment(h.getDeviceSet().getId(), h.getId(), h.getSetCode(), h.getInstallationLabel(),
                status, message, LocalDateTime.now(ZoneOffset.UTC), null, null);
    }
}
