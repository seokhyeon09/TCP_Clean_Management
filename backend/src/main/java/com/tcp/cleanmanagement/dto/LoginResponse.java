package com.tcp.cleanmanagement.dto;

import com.tcp.cleanmanagement.enums.Role;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class LoginResponse {
    private String token;
    private Long userId;
    private String username;
    private String displayName;
    private Role role;
    private List<Long> permittedZoneIds;
}
