package com.tcp.cleanmanagement.dto;

import java.time.OffsetDateTime;

public record AiSample(OffsetDateTime at, double temperature, double humidity,
                       double mq135Adc, Double mq7Adc) {}
