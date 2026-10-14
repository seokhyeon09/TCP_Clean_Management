package com.tcp.cleanmanagement.dto;

import com.tcp.cleanmanagement.enums.MetricCode;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class SensorReadingResponse {
    private Long metricId;
    private MetricCode metricCode;
    private String unitCode;
    private BigDecimal measuredValue;
    private LocalDateTime measuredAt;
}
