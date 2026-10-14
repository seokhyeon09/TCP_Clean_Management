package com.tcp.cleanmanagement.entity;

import com.tcp.cleanmanagement.enums.Role;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    /** BCrypt hash. Never returned by the API. */
    @Column(nullable = false)
    private String password;

    /** Label shown in the dashboard, e.g. "화장실 1 관리자". */
    @Column(length = 100)
    private String displayName;

    // Stored as VARCHAR so new roles do not require altering a MySQL ENUM column.
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32, columnDefinition = "VARCHAR(32)")
    private Role role;

    private String fcmToken;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
