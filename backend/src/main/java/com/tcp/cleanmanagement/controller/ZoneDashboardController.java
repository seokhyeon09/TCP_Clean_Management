package com.tcp.cleanmanagement.controller;

import com.tcp.cleanmanagement.dto.SensorReadingResponse;
import com.tcp.cleanmanagement.dto.ZoneDashboardResponse;
import com.tcp.cleanmanagement.enums.MetricCode;
import com.tcp.cleanmanagement.security.AuthUser;
import com.tcp.cleanmanagement.service.ZoneDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/zones")
@RequiredArgsConstructor
public class ZoneDashboardController {
    private final ZoneDashboardService dashboardService;

    @GetMapping("/{zoneId}/dashboard")
    public ZoneDashboardResponse getDashboard(@PathVariable Long zoneId, AuthUser caller) {
        return dashboardService.getDashboard(zoneId, caller);
    }

    @GetMapping("/{zoneId}/series")
    public List<SensorReadingResponse> getSeries(
            @PathVariable Long zoneId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(required = false) MetricCode metricCode,
            AuthUser caller) {
        return dashboardService.getSeries(zoneId, from, to, metricCode, caller);
    }
}
