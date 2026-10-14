package com.tcp.cleanmanagement.dto;

import com.tcp.cleanmanagement.enums.ZoneType;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ZoneResponse {
    private Long id;
    private String name;
    private String address;
    private Double latitude;
    private Double longitude;
    private ZoneType zoneType;
    private Boolean isOurSolution;
    private Float pleasantThreshold;
    private Float needsVentilationThreshold;
}
