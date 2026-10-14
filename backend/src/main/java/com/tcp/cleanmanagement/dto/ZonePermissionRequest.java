package com.tcp.cleanmanagement.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ZonePermissionRequest {
    @NotNull
    private Long userId;

    @NotNull
    private Long zoneId;
}
