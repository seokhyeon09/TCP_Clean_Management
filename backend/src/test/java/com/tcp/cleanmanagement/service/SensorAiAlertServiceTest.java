package com.tcp.cleanmanagement.service;

import com.tcp.cleanmanagement.entity.*;
import com.tcp.cleanmanagement.enums.AlertType;
import com.tcp.cleanmanagement.repository.AlertRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import java.util.Map;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SensorAiAlertServiceTest {
    @Test
    void onlyActionableReadyResultsCreateAlertsAndDuplicateAlertsAreSuppressed() {
        var repository = mock(AlertRepository.class);
        var service = new SensorAiAlertService(repository);
        var zone = Zone.builder().id(3L).build();
        var history = DeviceSetHistory.builder().id(7L).zone(zone).build();
        service.record(history, Map.of("ready", false, "level", "긴급"));
        service.record(history, Map.of("ready", true, "level", "정보"));
        verifyNoInteractions(repository);

        var result = Map.<String, Object>of("ready", true, "level", "긴급", "items",
                List.of(Map.of("level", "긴급", "code", "leak", "message", "누수 의심")));
        service.record(history, result);
        var capture = ArgumentCaptor.forClass(Alert.class);
        verify(repository).save(capture.capture());
        assertSame(history, capture.getValue().getDeviceSetHistory());
        assertSame(zone, capture.getValue().getZone());
        assertEquals(AlertType.AI_ANOMALY, capture.getValue().getAlertType());

        when(repository.hasActiveOrRecentAiAlert(eq(7L), eq("leak"), any())).thenReturn(true);
        service.record(history, result);
        verify(repository, times(1)).save(any());

        // Another condition, or escalation from suspect to alarm, still notifies.
        service.record(history, Map.of("ready", true, "level", "긴급", "items",
                List.of(Map.of("level", "긴급", "code", "smoking_alarm", "message", "흡연 경보"))));
        verify(repository, times(2)).save(any());
    }
}
