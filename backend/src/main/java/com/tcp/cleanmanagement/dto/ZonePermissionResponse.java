package com.tcp.cleanmanagement.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ZonePermissionResponse {
    private Long permissionId;
    private Long userId;
    private String username;
    private String userDisplayName;
    private Long zoneId;
    private String zoneName;
    private LocalDateTime createdAt;
}
