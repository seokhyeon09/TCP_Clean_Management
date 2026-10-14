package com.tcp.cleanmanagement.repository;
import com.tcp.cleanmanagement.entity.ActionLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ActionLogRepository extends JpaRepository<ActionLog, Long> {
    @Query("SELECT l FROM ActionLog l LEFT JOIN FETCH l.admin WHERE l.alert.id IN :alertIds ORDER BY l.createdAt, l.id")
    List<ActionLog> findByAlertIdsWithAdmin(@Param("alertIds") List<Long> alertIds);
}
