package com.tcp.cleanmanagement.repository;

import com.tcp.cleanmanagement.entity.DeviceSetHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface DeviceSetHistoryRepository extends JpaRepository<DeviceSetHistory, Long> {
    Optional<DeviceSetHistory> findFirstByDeviceSetIdOrderByIdDesc(Long deviceSetId);
    List<DeviceSetHistory> findByDeviceSetIdOrderByIdDesc(Long deviceSetId);

    @Query("SELECT h FROM DeviceSetHistory h JOIN FETCH h.deviceSet ds JOIN FETCH h.zone " +
           "WHERE ds.active = true AND h.id = " +
           "(SELECT MAX(latest.id) FROM DeviceSetHistory latest WHERE latest.deviceSet.id = ds.id)")
    List<DeviceSetHistory> findCurrentActiveHistories();
}
