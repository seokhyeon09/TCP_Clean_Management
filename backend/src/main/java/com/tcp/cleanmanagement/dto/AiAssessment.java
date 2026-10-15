package com.tcp.cleanmanagement.dto;

import java.time.LocalDateTime;
import java.util.Map;

public record AiAssessment(Long deviceSetId, Long historyId, String setCode, String installationLabel,
                           String status, String message, LocalDateTime evaluatedAt,
                           Map<String, Object> result, String alertError) {}
