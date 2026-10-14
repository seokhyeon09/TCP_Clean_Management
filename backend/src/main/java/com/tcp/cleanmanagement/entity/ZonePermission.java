package com.tcp.cleanmanagement.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

/** Grants a ZONE_MANAGER read access to every active ESP32 set installed in the zone. */
@Entity
@Table(name = "zone_permissions", uniqueConstraints =
        @UniqueConstraint(name = "uq_zone_permission_user_zone", columnNames = {"user_id", "zone_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ZonePermission {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "zone_id")
    private Zone zone;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
