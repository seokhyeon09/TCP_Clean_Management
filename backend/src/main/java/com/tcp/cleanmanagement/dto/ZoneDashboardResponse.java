package com.tcp.cleanmanagement.dto;

import com.tcp.cleanmanagement.enums.MetricCode;
import com.tcp.cleanmanagement.enums.SensorModel;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
public class ZoneDashboardResponse {
    private Long zoneId;
    private String zoneName;
    private Integer comfortScore; // 0 ~ 100 or null if no data
    private String overallStatus; // PLEASANT, NORMAL, NEEDS_VENTILATION, WARNING, NO_DATA
    private String statusMessage;
    private Boolean hasOnlineDevice;
    private LocalDateTime lastDataReceivedAt;
    private List<DeviceSetResponse> devices;
    private List<AiAssessment> aiAssessments;
    private Map<String, LatestMetricInfo> latestMetrics; // Keys: "TEMPERATURE", "HUMIDITY", "MQ135", "MQ7"

    @Data
    @Builder
    public static class LatestMetricInfo {
        private Long metricId;
        private SensorModel sensorModel;
        private MetricCode metricCode;
        private String unitCode;
        private BigDecimal currentValue;
        private LocalDateTime measuredAt;
        private String evaluationStatus; // NORMAL, CAUTION, DANGER
    }
}
