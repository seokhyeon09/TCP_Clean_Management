package com.tcp.cleanmanagement.service;

import com.tcp.cleanmanagement.dto.LoginRequest;
import com.tcp.cleanmanagement.dto.LoginResponse;
import com.tcp.cleanmanagement.dto.UserResponse;
import com.tcp.cleanmanagement.dto.ZoneResponse;
import com.tcp.cleanmanagement.entity.User;
import com.tcp.cleanmanagement.entity.Zone;
import com.tcp.cleanmanagement.entity.ZonePermission;
import com.tcp.cleanmanagement.enums.Role;
import com.tcp.cleanmanagement.repository.UserRepository;
import com.tcp.cleanmanagement.repository.ZonePermissionRepository;
import com.tcp.cleanmanagement.repository.ZoneRepository;
import com.tcp.cleanmanagement.security.AuthUser;
import com.tcp.cleanmanagement.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository userRepository;
    private final ZonePermissionRepository zonePermissionRepository;
    private final ZoneRepository zoneRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid username or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid username or password");
        }

        JwtTokenProvider.IssuedToken token = tokenProvider.issue(user);

        List<Long> permittedZoneIds;
        if (user.getRole() == Role.ADMIN) {
            permittedZoneIds = zoneRepository.findAll().stream().map(Zone::getId).toList();
        } else {
            permittedZoneIds = zonePermissionRepository.findByUserIdWithZone(user.getId())
                    .stream()
                    .map(p -> p.getZone().getId())
                    .toList();
        }

        return LoginResponse.builder()
                .token(token.token())
                .userId(user.getId())
                .username(user.getUsername())
                .displayName(user.getDisplayName() != null ? user.getDisplayName() : user.getUsername())
                .role(user.getRole())
                .permittedZoneIds(permittedZoneIds)
                .build();
    }

    @Transactional(readOnly = true)
    public UserResponse getMe(AuthUser authUser) {
        User user = userRepository.findById(authUser.id())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        return UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .displayName(user.getDisplayName() != null ? user.getDisplayName() : user.getUsername())
                .role(user.getRole())
                .build();
    }

    @Transactional(readOnly = true)
    public List<ZoneResponse> getMyZones(AuthUser authUser) {
        List<Zone> zones;
        if (authUser.isAdmin()) {
            zones = zoneRepository.findAll();
        } else {
            zones = zonePermissionRepository.findByUserIdWithZone(authUser.id())
                    .stream()
                    .map(ZonePermission::getZone)
                    .toList();
        }

        return zones.stream().map(this::toZoneResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<UserResponse> getAllUsers() {
        return userRepository.findAllByOrderByIdAsc().stream()
                .map(u -> UserResponse.builder()
                        .id(u.getId())
                        .username(u.getUsername())
                        .displayName(u.getDisplayName() != null ? u.getDisplayName() : u.getUsername())
                        .role(u.getRole())
                        .build())
                .toList();
    }

    private ZoneResponse toZoneResponse(Zone zone) {
        return ZoneResponse.builder()
                .id(zone.getId())
                .name(zone.getName())
                .address(zone.getAddress())
                .latitude(zone.getLatitude())
                .longitude(zone.getLongitude())
                .zoneType(zone.getZoneType())
                .isOurSolution(zone.getIsOurSolution())
                .pleasantThreshold(zone.getPleasantThreshold())
                .needsVentilationThreshold(zone.getNeedsVentilationThreshold())
                .build();
    }
}
