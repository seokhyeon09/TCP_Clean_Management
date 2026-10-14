package com.tcp.cleanmanagement.dto;

import com.tcp.cleanmanagement.enums.Role;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserResponse {
    private Long id;
    private String username;
    private String displayName;
    private Role role;
}
