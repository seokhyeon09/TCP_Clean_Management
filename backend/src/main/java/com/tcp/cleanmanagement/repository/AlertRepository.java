package com.tcp.cleanmanagement.repository;
import com.tcp.cleanmanagement.entity.Alert;
import com.tcp.cleanmanagement.entity.DeviceSetHistory;
import com.tcp.cleanmanagement.enums.AlertStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.time.LocalDateTime;
public interface AlertRepository extends JpaRepository<Alert, Long> {
    @Query("SELECT (COUNT(a) > 0) FROM Alert a WHERE a.deviceSetHistory.id = :historyId " +
           "AND a.alertType = com.tcp.cleanmanagement.enums.AlertType.AI_ANOMALY " +
           "AND a.aiCode = :code " +
           "AND (a.status = com.tcp.cleanmanagement.enums.AlertStatus.UNRESOLVED OR a.createdAt >= :since)")
    boolean hasActiveOrRecentAiAlert(@Param("historyId") Long historyId, @Param("code") String code,
                                    @Param("since") LocalDateTime since);
    List<Alert> findByStatus(AlertStatus status);

    List<Alert> findAllByOrderByCreatedAtDescIdDesc();
    List<Alert> findByStatusOrderByCreatedAtDescIdDesc(AlertStatus status);
    List<Alert> findByZoneIdInOrderByCreatedAtDescIdDesc(List<Long> zoneIds);
    List<Alert> findByZoneIdInAndStatusOrderByCreatedAtDescIdDesc(List<Long> zoneIds, AlertStatus status);

    @Modifying
    @Query("UPDATE Alert a SET a.deviceSetHistory = :history " +
           "WHERE a.deviceSetHistory IS NULL AND a.zone.id = :zoneId AND a.sensor.id IN " +
           "(SELECT s.id FROM Sensor s WHERE s.deviceSet.id = :setId)")
    int linkUnassignedHistory(@Param("setId") Long deviceSetId,
                              @Param("zoneId") Long zoneId,
                              @Param("history") DeviceSetHistory history);
}
