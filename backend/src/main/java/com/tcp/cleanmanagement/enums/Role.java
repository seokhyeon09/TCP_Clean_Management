package com.tcp.cleanmanagement.enums;

/**
 * ADMIN: web administrator — manages ESP32 sets, zones and permissions; sees every zone.
 * ZONE_MANAGER: toilet manager — sees only the zones granted through zone_permissions.
 */
public enum Role { ADMIN, ZONE_MANAGER }
