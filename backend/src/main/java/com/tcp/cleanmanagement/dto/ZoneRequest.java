package com.tcp.cleanmanagement.dto;

import com.tcp.cleanmanagement.enums.ZoneType;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ZoneRequest {
    @NotBlank
    private String name;

    private String address;
    private Double latitude;
    private Double longitude;
    private ZoneType zoneType;
}
