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
@RequestMapping("/api/alerts")
@RequiredArgsConstructor
public class AlertController {
    private final AdminAlertService alertService;

    @GetMapping
    public ResponseEntity<List<AlertResponse>> getAlerts(
            @RequestParam(required = false) AlertStatus status,
            @RequestParam(required = false) Long zoneId,
            AuthUser caller) {
        return ResponseEntity.ok(alertService.getAlerts(caller, status, zoneId));
    }

    @PostMapping("/{alertId}/actions")
    public ResponseEntity<Void> resolveAlert(
            @PathVariable Long alertId,
            @RequestBody(required = false) ActionRequest request,
            AuthUser caller) {
        alertService.resolveAlert(alertId, request, caller);
        return ResponseEntity.ok().build();
    }
}
