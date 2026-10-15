package com.tcp.cleanmanagement.service;

import com.tcp.cleanmanagement.dto.AiSample;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.http.client.BufferingClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;
import java.util.Set;

@Component
public class SensorAiClient {
    private final RestClient client;

    public SensorAiClient(@Value("${app.sensor-ai.url:http://localhost:8090}") String url,
                          @Value("${app.sensor-ai.timeout-ms:10000}") int timeoutMs) {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Math.min(timeoutMs, 2000));
        factory.setReadTimeout(timeoutMs);
        // Python's bounded internal endpoint requires Content-Length. Buffer the
        // <=2400-row request so Spring does not send HTTP chunked encoding.
        client = RestClient.builder().baseUrl(url)
                .requestFactory(new BufferingClientHttpRequestFactory(factory)).build();
    }

    public Map<String, Object> evaluate(String deviceId, List<AiSample> samples) {
        Map<String, Object> result = client.post().uri("/evaluate")
                .body(Map.of("deviceId", deviceId, "samples", samples))
                .retrieve().body(new ParameterizedTypeReference<>() {});
        if (result == null || !(result.get("ready") instanceof Boolean)
                || !Set.of("준비 중", "평상시", "정보", "주의", "긴급").contains(result.get("level"))
                || !(result.get("items") instanceof List<?>)) {
            throw new IllegalStateException("Invalid sensor AI response");
        }
        return result;
    }
}
