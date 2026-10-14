package com.tcp.cleanmanagement.repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Lightweight projection of one raw reading used for dashboard charts. */
public record RawPoint(Long metricId, LocalDateTime measuredAt, BigDecimal value) {
}
