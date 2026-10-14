package com.tcp.cleanmanagement.security;

import com.tcp.cleanmanagement.enums.Role;

/** Authenticated caller extracted from a verified JWT. Inject it as a controller method parameter. */
public record AuthUser(Long id, String username, Role role) {
    public static final String REQUEST_ATTRIBUTE = AuthUser.class.getName();

    public boolean isAdmin() {
        return role == Role.ADMIN;
    }
}
