package com.tcp.cleanmanagement.dto;

import com.tcp.cleanmanagement.enums.SensorModel;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

@Data @Builder
public class DeviceSetResponse {
    private Long deviceSetId;
    private String setCode;
    private String macAddress;
    private Long zoneId;
    private String zoneName;
    private String installationLabel;
    private Boolean active;
    private LocalDateTime lastSeenAt;
    private Boolean online;
    private Map<SensorModel, Long> sensorIds;
    private Map<String, BigDecimal> latestValues; // "TEMPERATURE", "HUMIDITY", "MQ135", "MQ7"
}

