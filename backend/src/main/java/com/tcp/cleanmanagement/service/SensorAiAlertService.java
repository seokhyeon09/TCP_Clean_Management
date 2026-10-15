package com.tcp.cleanmanagement.service;

import com.tcp.cleanmanagement.entity.Alert;
import com.tcp.cleanmanagement.entity.DeviceSetHistory;
import com.tcp.cleanmanagement.enums.AlertStatus;
import com.tcp.cleanmanagement.enums.AlertType;
import com.tcp.cleanmanagement.repository.AlertRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.Set;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SensorAiAlertService {
    private final AlertRepository alerts;

    @Transactional
    public void record(DeviceSetHistory history, Map<String, Object> result) {
        if (!Boolean.TRUE.equals(result.get("ready"))
                || !Set.of("주의", "긴급").contains(result.get("level"))) return;
        if (!(result.get("items") instanceof List<?> items)) return;
        for (Object value : items) {
            if (!(value instanceof Map<?, ?> item)
                    || !Set.of("주의", "긴급").contains(item.get("level"))
                    || !(item.get("code") instanceof String code) || code.length() > 64
                    || !(item.get("message") instanceof String description)) continue;
            // Deduplicate each item separately: a wet-floor warning must never
            // suppress a later smoking alarm. Upstream escalation codes differ.
            if (alerts.hasActiveOrRecentAiAlert(history.getId(), code,
                    LocalDateTime.now(ZoneOffset.UTC).minusMinutes(30))) continue;
            String message = "[AI " + item.get("level") + "] " + description;
            alerts.save(Alert.builder().zone(history.getZone()).deviceSetHistory(history)
                    .alertType(AlertType.AI_ANOMALY).aiCode(code).status(AlertStatus.UNRESOLVED)
                    .message(message.substring(0, Math.min(message.length(), 255))).build());
        }
    }
}
