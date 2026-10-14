package com.tcp.cleanmanagement.repository;

import com.tcp.cleanmanagement.entity.SensorDataRaw;
import com.tcp.cleanmanagement.entity.DeviceSetHistory;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface SensorDataRawRepository extends JpaRepository<SensorDataRaw, Long> {
    Optional<SensorDataRaw> findByMetricIdAndSampleKey(Long metricId, String sampleKey);

    /**
     * Raw readings for the given metrics in [from, to). Readings captured while the set was installed
     * in another zone are excluded; legacy readings without a history row are kept.
     */
    @Query("SELECT new com.tcp.cleanmanagement.repository.RawPoint(d.metric.id, d.measuredAt, d.measuredValue) " +
           "FROM SensorDataRaw d LEFT JOIN d.deviceSetHistory h " +
           "WHERE d.metric.id IN :metricIds AND d.measuredAt >= :from AND d.measuredAt < :to " +
           "AND (h IS NULL OR h.zone.id = :zoneId) " +
           "ORDER BY d.measuredAt, d.id")
    List<RawPoint> findSeries(@Param("metricIds") List<Long> metricIds,
                              @Param("zoneId") Long zoneId,
                              @Param("from") LocalDateTime from,
                              @Param("to") LocalDateTime to);

    @Query("SELECT new com.tcp.cleanmanagement.repository.RawPoint(d.metric.id, d.measuredAt, d.measuredValue) " +
           "FROM SensorDataRaw d LEFT JOIN d.deviceSetHistory h " +
           "WHERE d.metric.id = :metricId AND (h IS NULL OR h.zone.id = :zoneId) " +
           "ORDER BY d.measuredAt DESC, d.id DESC")
    List<RawPoint> findLatest(@Param("metricId") Long metricId,
                              @Param("zoneId") Long zoneId,
                              Pageable pageable);

    @Modifying
    @Query("UPDATE SensorDataRaw d SET d.deviceSetHistory = :history " +
           "WHERE d.deviceSetHistory IS NULL AND d.metric.id IN " +
           "(SELECT m.id FROM SensorMetric m WHERE m.sensor.deviceSet.id = :setId)")
    int linkUnassignedHistory(@Param("setId") Long deviceSetId,
                              @Param("history") DeviceSetHistory history);

    @Query("SELECT d.metric.id as metricId, COUNT(d) as sampleCount, " +
           "SUM(d.measuredValue) as sumValue, MIN(d.measuredValue) as minValue, MAX(d.measuredValue) as maxValue " +
           "FROM SensorDataRaw d " +
           "WHERE d.measuredAt >= :startTime AND d.measuredAt < :endTime " +
           "GROUP BY d.metric.id")
    List<AggregationResult> aggregateDataByTimeRange(@Param("startTime") LocalDateTime startTime,
                                                      @Param("endTime") LocalDateTime endTime);

    @Modifying
    @Query("DELETE FROM SensorDataRaw d WHERE d.measuredAt < :cutoffTime")
    int deleteOlderThan(@Param("cutoffTime") LocalDateTime cutoffTime);
}
