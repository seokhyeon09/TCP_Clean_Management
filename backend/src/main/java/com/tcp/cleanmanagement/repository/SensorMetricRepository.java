package com.tcp.cleanmanagement.repository;

import com.tcp.cleanmanagement.entity.SensorMetric;
import com.tcp.cleanmanagement.enums.MetricCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SensorMetricRepository extends JpaRepository<SensorMetric, Long> {
    Optional<SensorMetric> findBySensorIdAndMetricCode(Long sensorId, MetricCode metricCode);

    /**
     * Metrics shown on a zone dashboard: sensors of active sets installed in the zone, plus legacy
     * sensors that are not part of any set but are attached to the zone directly.
     */
    @Query("SELECT m FROM SensorMetric m JOIN FETCH m.sensor s LEFT JOIN FETCH s.deviceSet ds " +
           "WHERE (ds IS NOT NULL AND ds.active = true AND ds.zone.id = :zoneId) " +
           "   OR (ds IS NULL AND s.zone.id = :zoneId) " +
           "ORDER BY s.id, m.metricCode")
    List<SensorMetric> findDashboardMetricsByZoneId(@Param("zoneId") Long zoneId);
}
