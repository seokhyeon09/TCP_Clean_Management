package com.tcp.cleanmanagement.controller;

import com.tcp.cleanmanagement.dto.ActionRequest;
import com.tcp.cleanmanagement.dto.AlertResponse;
import com.tcp.cleanmanagement.enums.AlertStatus;
import com.tcp.cleanmanagement.security.AuthUser;
import com.tcp.cleanmanagement.service.AdminAlertService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/alerts")
@RequiredArgsConstructor
public class AdminAlertController {
    private final AdminAlertService adminAlertService;

    @GetMapping
    public ResponseEntity<List<AlertResponse>> getAlerts(
            @RequestParam(required = false) AlertStatus status,
            @RequestParam(required = false) Long zoneId,
            AuthUser caller) {
        if (status == null && zoneId == null && caller == null) {
            return ResponseEntity.ok(adminAlertService.getUnresolvedAlerts());
        }
        return ResponseEntity.ok(adminAlertService.getAlerts(caller, status, zoneId));
    }

    @PostMapping("/{alertId}/actions")
    public ResponseEntity<Void> resolveAlert(
            @PathVariable Long alertId, 
            @RequestBody(required = false) ActionRequest request,
            AuthUser caller) {
        adminAlertService.resolveAlert(alertId, request, caller);
        return ResponseEntity.ok().build();
    }
}
