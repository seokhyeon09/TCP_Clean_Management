package com.tcp.cleanmanagement.service;

import com.tcp.cleanmanagement.enums.MetricCode;
import com.tcp.cleanmanagement.enums.SensorModel;
import com.tcp.cleanmanagement.repository.AiRawPoint;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class AiSampleAssemblerTest {
    private final AiSampleAssembler assembler = new AiSampleAssembler();
    private final LocalDateTime start = LocalDateTime.of(2026, 10, 15, 0, 0);

    @Test
    void groupsIndependentFiveSecondChannelsAndOnlyUsesQualifiedMq7() {
        var points = completeBucket(0);
        points.add(point(SensorModel.DHT22, MetricCode.TEMPERATURE, 10, 23, null));
        points.add(point(SensorModel.MQ135, MetricCode.GAS, 5, 3000, null));
        points.add(point(SensorModel.MQ135, MetricCode.GAS, 10, 2000, null));
        points.add(point(SensorModel.MQ7, MetricCode.GAS, 2, 600, true));
        points.add(point(SensorModel.MQ7, MetricCode.GAS, 10, 4000, false));
        points.sort(Comparator.comparing(AiRawPoint::measuredAt));
        var samples = assembler.assemble(points, start.plusSeconds(15));
        assertEquals(1, samples.size());
        assertEquals(23, samples.get(0).temperature());
        assertEquals(2000, samples.get(0).mq135Adc());
        assertEquals(600, samples.get(0).mq7Adc());
        assertEquals(start.atOffset(ZoneOffset.UTC), samples.get(0).at());
    }

    @Test
    void dropsHistoryBeforeMissingOrInvalidRequiredReadings() {
        var points = completeBucket(0);
        points.addAll(completeBucket(30));
        assertEquals(1, assembler.assemble(points, start.plusSeconds(45)).size());
        points.addAll(completeBucket(15));
        points.add(point(SensorModel.MQ135, MetricCode.GAS, 16, 5000, null));
        points.sort(Comparator.comparing(AiRawPoint::measuredAt));
        assertEquals(1, assembler.assemble(points, start.plusSeconds(45)).size());
    }

    @Test
    void neverTreatsStaleOrOpenBucketsAsCurrentAndKeepsMissingMq7Null() {
        var points = completeBucket(0);
        assertTrue(assembler.assemble(points, start.plusSeconds(30)).isEmpty());
        assertTrue(assembler.assemble(points, start).isEmpty());
        points.add(point(SensorModel.MQ7, MetricCode.GAS, 2, 700, null));
        assertNull(assembler.assemble(points, start.plusSeconds(15)).get(0).mq7Adc());
    }

    private List<AiRawPoint> completeBucket(int second) {
        return new ArrayList<>(List.of(point(SensorModel.DHT22, MetricCode.TEMPERATURE, second, 22, null),
                point(SensorModel.DHT22, MetricCode.HUMIDITY, second, 48, null),
                point(SensorModel.MQ135, MetricCode.GAS, second, 1800, null)));
    }

    private AiRawPoint point(SensorModel model, MetricCode code, int second, double value, Boolean heater) {
        return new AiRawPoint(model, code, start.plusSeconds(second), BigDecimal.valueOf(value), heater);
    }
}
