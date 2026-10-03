package com.tcp.cleanmanagement.dto;

import com.tcp.cleanmanagement.enums.SensorModel;
import lombok.Builder;
import lombok.Data;

import java.util.Map;

@Data @Builder
public class DeviceSetResponse {
    private Long deviceSetId;
    private String setCode;
    private String macAddress;
    private Long zoneId;
    private String zoneName;
    private String installationLabel;
    private Map<SensorModel, Long> sensorIds;
}
