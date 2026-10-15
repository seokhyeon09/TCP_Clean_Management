package com.tcp.cleanmanagement.repository;

import com.tcp.cleanmanagement.enums.MetricCode;
import com.tcp.cleanmanagement.enums.SensorModel;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record AiRawPoint(SensorModel sensorModel, MetricCode metricCode, LocalDateTime measuredAt,
                         BigDecimal value, Boolean heaterPhaseValid) {}
