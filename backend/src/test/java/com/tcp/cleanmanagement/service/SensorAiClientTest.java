package com.tcp.cleanmanagement.service;

import com.sun.net.httpserver.HttpServer;
import com.tcp.cleanmanagement.dto.AiSample;
import org.junit.jupiter.api.Test;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

class SensorAiClientTest {
    @Test
    void sendsIsoDatesAndNullMq7ToRealHttpEndpointAndRejectsBrokenResults() throws Exception {
        var requestBody = new AtomicReference<String>();
        var responseBody = new AtomicReference<>("{\"ready\":true,\"level\":\"평상시\",\"items\":[]}");
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/evaluate", exchange -> {
            if (exchange.getRequestHeaders().getFirst("Content-Length") == null) {
                exchange.sendResponseHeaders(413, -1);
                exchange.close();
                return;
            }
            requestBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            byte[] body = responseBody.get().getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.start();
        try {
            var client = new SensorAiClient("http://127.0.0.1:" + server.getAddress().getPort(), 1000);
            var samples = List.of(new AiSample(OffsetDateTime.parse("2026-10-15T00:00:00Z"), 22, 48, 1800, null));
            assertEquals(true, client.evaluate("installation-1", samples).get("ready"));
            assertTrue(requestBody.get().contains("2026-10-15T00:00:00Z"));
            assertTrue(requestBody.get().contains("\"mq7Adc\":null"));
            responseBody.set("{}");
            assertThrows(IllegalStateException.class, () -> client.evaluate("installation-1", samples));
        } finally {
            server.stop(0);
        }
    }
}
