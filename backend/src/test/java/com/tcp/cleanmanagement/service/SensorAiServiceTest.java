package com.tcp.cleanmanagement.service;

import com.tcp.cleanmanagement.dto.AiSample;
import com.tcp.cleanmanagement.entity.*;
import com.tcp.cleanmanagement.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SensorAiServiceTest {
    private final DeviceSetHistoryRepository histories = mock(DeviceSetHistoryRepository.class);
    private final SensorDataRawRepository readings = mock(SensorDataRawRepository.class);
    private final AiSampleAssembler assembler = mock(AiSampleAssembler.class);
    private final SensorAiClient client = mock(SensorAiClient.class);
    private final SensorAiAlertService alerts = mock(SensorAiAlertService.class);
    private final SensorAiService service = new SensorAiService(histories, readings, assembler, client, alerts);
    private DeviceSet set;
    private DeviceSetHistory history;

    @BeforeEach
    void setup() {
        set = DeviceSet.builder().id(1L).active(true).setCode("SET-001")
                .lastSeenAt(LocalDateTime.now(ZoneOffset.UTC)).build();
        history = DeviceSetHistory.builder().id(5L).deviceSet(set).setCode("SET-001").build();
        when(histories.findCurrentActiveHistories()).thenReturn(List.of(history));
        when(histories.findFirstByDeviceSetIdOrderByIdDesc(1L)).thenReturn(Optional.of(history));
    }

    @Test
    void readyEvaluationIsScopedToInstallationAndMovingDoesNotExposeOldResult() {
        samples();
        when(client.evaluate(eq("installation-5"), any())).thenReturn(
                Map.of("ready", true, "level", "평상시", "headline", "정상"));
        service.refresh();
        assertEquals("READY", service.getAssessments(List.of(set)).get(0).status());
        verify(readings).findAiHistory(eq(5L), any(), any());
        var moved = DeviceSetHistory.builder().id(6L).deviceSet(set).build();
        when(histories.findFirstByDeviceSetIdOrderByIdDesc(1L)).thenReturn(Optional.of(moved));
        assertEquals("PENDING", service.getAssessments(List.of(set)).get(0).status());
        assertNull(service.getAssessments(List.of(set)).get(0).result());
    }

    @Test
    void failureAndOfflineDeviceNeverShowOldNormalJudgment() {
        samples();
        when(client.evaluate(any(), any())).thenThrow(new IllegalStateException("timeout"));
        assertDoesNotThrow(service::refresh);
        assertEquals("UNAVAILABLE", service.getAssessments(List.of(set)).get(0).status());
        verifyNoInteractions(alerts);
        set.setLastSeenAt(LocalDateTime.now(ZoneOffset.UTC).minusMinutes(1));
        service.refresh();
        assertEquals("OFFLINE", service.getAssessments(List.of(set)).get(0).status());
        verify(client, times(1)).evaluate(any(), any());
    }

    @Test
    void missingRequiredReadingsNeverInvokeModel() {
        when(assembler.assemble(any(), any())).thenReturn(List.of());
        service.refresh();
        assertEquals("NO_DATA", service.getAssessments(List.of(set)).get(0).status());
        verifyNoInteractions(client, alerts);
    }

    @Test
    void alertStorageFailureKeepsSuccessfulPredictionAndReportsStorageError() {
        samples();
        when(client.evaluate(any(), any())).thenReturn(Map.of("ready", true, "level", "긴급", "headline", "동파 위험"));
        doThrow(new IllegalStateException("DB enum needs migration")).when(alerts).record(any(), any());
        service.refresh();
        var assessment = service.getAssessments(List.of(set)).get(0);
        assertEquals("READY", assessment.status());
        assertNotNull(assessment.result());
        assertNotNull(assessment.alertError());
    }

    private void samples() {
        when(assembler.assemble(any(), any())).thenReturn(List.of(new AiSample(
                LocalDateTime.now().atOffset(ZoneOffset.UTC), 22, 48, 1800, null)));
    }
}
