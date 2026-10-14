package com.tcp.cleanmanagement.config;

import com.tcp.cleanmanagement.entity.User;
import com.tcp.cleanmanagement.entity.Zone;
import com.tcp.cleanmanagement.enums.Role;
import com.tcp.cleanmanagement.enums.ZoneType;
import com.tcp.cleanmanagement.repository.UserRepository;
import com.tcp.cleanmanagement.repository.ZoneRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
public class DemoDataInitializer implements CommandLineRunner {
    private final UserRepository userRepository;
    private final ZoneRepository zoneRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.seed.enabled:true}")
    private boolean seedEnabled;

    @Value("${app.seed.admin-password:admin1234}")
    private String adminPassword;

    @Value("${app.seed.manager-password:toilet1234}")
    private String managerPassword;

    @Override
    @Transactional
    public void run(String... args) {
        if (!seedEnabled) {
            return;
        }

        // Seed default demo accounts
        seedUser("admin", adminPassword, "웹 관리자", Role.ADMIN);
        seedUser("toilet1", managerPassword, "화장실 1 관리자", Role.ZONE_MANAGER);
        seedUser("toilet2", managerPassword, "화장실 2 관리자", Role.ZONE_MANAGER);

        // Seed demo zones if empty
        if (zoneRepository.count() == 0) {
            log.info("Seeding initial demo zones (Toilet 1, Toilet 2)...");
            zoneRepository.save(Zone.builder()
                    .name("화장실 1 (공학관 1F)")
                    .address("서울시 테크캠퍼스 1층 남/여 화장실")
                    .latitude(37.5665)
                    .longitude(126.9780)
                    .zoneType(ZoneType.TOILET)
                    .isOurSolution(true)
                    .pleasantThreshold(300.0f)
                    .needsVentilationThreshold(500.0f)
                    .build());

            zoneRepository.save(Zone.builder()
                    .name("화장실 2 (공학관 2F)")
                    .address("서울시 테크캠퍼스 2층 남/여 화장실")
                    .latitude(37.5668)
                    .longitude(126.9785)
                    .zoneType(ZoneType.TOILET)
                    .isOurSolution(true)
                    .pleasantThreshold(300.0f)
                    .needsVentilationThreshold(500.0f)
                    .build());
        }
    }

    private void seedUser(String username, String rawPassword, String displayName, Role role) {
        if (!userRepository.existsByUsername(username)) {
            userRepository.save(User.builder()
                    .username(username)
                    .password(passwordEncoder.encode(rawPassword))
                    .displayName(displayName)
                    .role(role)
                    .build());
            log.info("Created seed user: {} ({})", username, role);
        }
    }
}
