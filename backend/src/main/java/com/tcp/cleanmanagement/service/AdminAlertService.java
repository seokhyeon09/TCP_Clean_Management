package com.tcp.cleanmanagement.service;

import com.tcp.cleanmanagement.dto.ActionRequest;
import com.tcp.cleanmanagement.dto.AlertResponse;
import com.tcp.cleanmanagement.entity.ActionLog;
import com.tcp.cleanmanagement.entity.Alert;
import com.tcp.cleanmanagement.entity.DeviceSet;
import com.tcp.cleanmanagement.entity.DeviceSetHistory;
import com.tcp.cleanmanagement.entity.User;
import com.tcp.cleanmanagement.entity.ZonePermission;
import com.tcp.cleanmanagement.enums.AlertStatus;
import com.tcp.cleanmanagement.repository.ActionLogRepository;
import com.tcp.cleanmanagement.repository.AlertRepository;
import com.tcp.cleanmanagement.repository.UserRepository;
import com.tcp.cleanmanagement.repository.ZonePermissionRepository;
import com.tcp.cleanmanagement.security.AuthUser;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AdminAlertService {
    private final AlertRepository alertRepository;
    private final ActionLogRepository actionLogRepository;
    private final UserRepository userRepository;
    private final ZonePermissionRepository zonePermissionRepository;

    @Autowired
    public AdminAlertService(AlertRepository alertRepository,
                             ActionLogRepository actionLogRepository,
                             UserRepository userRepository,
                             ZonePermissionRepository zonePermissionRepository) {
        this.alertRepository = alertRepository;
        this.actionLogRepository = actionLogRepository;
        this.userRepository = userRepository;
        this.zonePermissionRepository = zonePermissionRepository;
    }

    // Constructor for tests
    public AdminAlertService(AlertRepository alertRepository, ActionLogRepository actionLogRepository) {
        this(alertRepository, actionLogRepository, null, null);
    }

    @Transactional(readOnly = true)
    public List<AlertResponse> getUnresolvedAlerts() {
        return alertRepository.findByStatus(AlertStatus.UNRESOLVED).stream()
                .map(this::responseFor)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AlertResponse> getAlerts(AuthUser caller, AlertStatus status, Long zoneId) {
        if (caller == null) {
            return getUnresolvedAlerts();
        }

        List<Alert> alerts;
        if (caller.isAdmin()) {
            if (status != null) {
                alerts = alertRepository.findByStatusOrderByCreatedAtDescIdDesc(status);
            } else {
                alerts = alertRepository.findAllByOrderByCreatedAtDescIdDesc();
            }
            if (zoneId != null) {
                alerts = alerts.stream().filter(a -> a.getZone().getId().equals(zoneId)).toList();
            }
        } else {
            List<Long> permittedZoneIds = (zonePermissionRepository != null) ?
                    zonePermissionRepository.findByUserIdWithZone(caller.id()).stream()
                            .map(p -> p.getZone().getId()).toList() : Collections.emptyList();
            if (permittedZoneIds.isEmpty()) {
                return Collections.emptyList();
            }
            if (zoneId != null) {
                if (!permittedZoneIds.contains(zoneId)) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to zone " + zoneId);
                }
                permittedZoneIds = List.of(zoneId);
            }
            if (status != null) {
                alerts = alertRepository.findByZoneIdInAndStatusOrderByCreatedAtDescIdDesc(permittedZoneIds, status);
            } else {
                alerts = alertRepository.findByZoneIdInOrderByCreatedAtDescIdDesc(permittedZoneIds);
            }
        }

        return alerts.stream().map(this::responseFor).toList();
    }

    private AlertResponse responseFor(Alert alert) {
        DeviceSetHistory history = alert.getDeviceSetHistory();
        DeviceSet set = history != null ? history.getDeviceSet()
                : alert.getSensor() == null ? null : alert.getSensor().getDeviceSet();
        return AlertResponse.builder()
                .alertId(alert.getId())
                .zoneId(alert.getZone().getId())
                .zoneName(history == null ? alert.getZone().getName() : history.getZoneName())
                .sensorId(alert.getSensor() == null ? null : alert.getSensor().getId())
                .sensorModel(alert.getSensor() == null ? null : alert.getSensor().getSensorModel())
                .deviceSetId(set == null ? null : set.getId())
                .deviceSetHistoryId(history == null ? null : history.getId())
                .setCode(history != null ? history.getSetCode() : set == null ? null : set.getSetCode())
                .installationLabel(history != null ? history.getInstallationLabel()
                        : set == null ? null : set.getInstallationLabel())
                .alertType(alert.getAlertType())
                .message(alert.getMessage())
                .createdAt(alert.getCreatedAt())
                .build();
    }

    @Transactional
    public void resolveAlert(Long alertId, ActionRequest request) {
        resolveAlert(alertId, request, null);
    }

    @Transactional
    public void resolveAlert(Long alertId, ActionRequest request, AuthUser caller) {
        Alert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invalid Alert ID"));

        if (caller != null && !caller.isAdmin()) {
            boolean allowed = (zonePermissionRepository != null) &&
                    zonePermissionRepository.existsByUserIdAndZoneId(caller.id(), alert.getZone().getId());
            if (!allowed) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to resolve this alert");
            }
        }

        alert.setStatus(AlertStatus.RESOLVED);
        alert.setResolvedAt(LocalDateTime.now(ZoneOffset.UTC));
        alertRepository.save(alert);

        Long userId = (caller != null) ? caller.id() : (request != null ? request.getAdminId() : null);
        User adminUser = null;
        if (userId != null && userRepository != null) {
            adminUser = userRepository.findById(userId).orElse(null);
        }
        if (adminUser == null && userId != null) {
            adminUser = User.builder().id(userId).build();
        }

        ActionLog log = ActionLog.builder()
                .alert(alert)
                .admin(adminUser)
                .actionDetail(request != null ? request.getActionDetail() : "Resolved")
                .build();
        actionLogRepository.save(log);
    }
}
