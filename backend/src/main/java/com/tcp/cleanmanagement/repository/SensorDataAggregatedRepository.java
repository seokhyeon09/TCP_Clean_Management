package com.tcp.cleanmanagement.repository;

import com.tcp.cleanmanagement.entity.SensorDataAggregated;
import com.tcp.cleanmanagement.enums.AggregationGranularity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface SensorDataAggregatedRepository extends JpaRepository<SensorDataAggregated, Long> {
    Optional<SensorDataAggregated> findByMetricIdAndGranularityAndBucketStart(
            Long metricId, AggregationGranularity granularity, LocalDateTime bucketStart);

    @Query("SELECT a FROM SensorDataAggregated a WHERE a.metric.id IN :metricIds AND a.granularity = :granularity " +
           "AND a.bucketStart >= :from AND a.bucketStart < :to ORDER BY a.bucketStart")
    List<SensorDataAggregated> findBuckets(@Param("metricIds") List<Long> metricIds,
                                           @Param("granularity") AggregationGranularity granularity,
                                           @Param("from") LocalDateTime from,
                                           @Param("to") LocalDateTime to);
}
