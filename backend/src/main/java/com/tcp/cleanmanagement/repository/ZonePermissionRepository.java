package com.tcp.cleanmanagement.repository;

import com.tcp.cleanmanagement.entity.ZonePermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ZonePermissionRepository extends JpaRepository<ZonePermission, Long> {
    boolean existsByUserIdAndZoneId(Long userId, Long zoneId);

    Optional<ZonePermission> findByUserIdAndZoneId(Long userId, Long zoneId);

    @Query("SELECT p FROM ZonePermission p JOIN FETCH p.zone WHERE p.user.id = :userId ORDER BY p.zone.id")
    List<ZonePermission> findByUserIdWithZone(@Param("userId") Long userId);

    @Query("SELECT p FROM ZonePermission p JOIN FETCH p.user JOIN FETCH p.zone ORDER BY p.user.id, p.zone.id")
    List<ZonePermission> findAllWithUserAndZone();
}
