package com.tcp.cleanmanagement.service;

import com.tcp.cleanmanagement.dto.ZonePermissionRequest;
import com.tcp.cleanmanagement.dto.ZonePermissionResponse;
import com.tcp.cleanmanagement.entity.User;
import com.tcp.cleanmanagement.entity.Zone;
import com.tcp.cleanmanagement.entity.ZonePermission;
import com.tcp.cleanmanagement.repository.UserRepository;
import com.tcp.cleanmanagement.repository.ZonePermissionRepository;
import com.tcp.cleanmanagement.repository.ZoneRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ZonePermissionService {
    private final ZonePermissionRepository permissionRepository;
    private final UserRepository userRepository;
    private final ZoneRepository zoneRepository;

    @Transactional(readOnly = true)
    public List<ZonePermissionResponse> list() {
        return permissionRepository.findAllWithUserAndZone().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ZonePermissionResponse grant(ZonePermissionRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        Zone zone = zoneRepository.findById(request.getZoneId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Zone not found"));

        if (permissionRepository.existsByUserIdAndZoneId(user.getId(), zone.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Permission already granted");
        }

        ZonePermission saved = permissionRepository.save(ZonePermission.builder()
                .user(user)
                .zone(zone)
                .build());

        return toResponse(saved);
    }

    @Transactional
    public void revoke(Long permissionId) {
        if (!permissionRepository.existsById(permissionId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Permission not found");
        }
        permissionRepository.deleteById(permissionId);
    }

    @Transactional
    public void revokeByUserAndZone(Long userId, Long zoneId) {
        ZonePermission permission = permissionRepository.findByUserIdAndZoneId(userId, zoneId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Permission not found"));
        permissionRepository.delete(permission);
    }

    private ZonePermissionResponse toResponse(ZonePermission permission) {
        return ZonePermissionResponse.builder()
                .permissionId(permission.getId())
                .userId(permission.getUser().getId())
                .username(permission.getUser().getUsername())
                .userDisplayName(permission.getUser().getDisplayName() != null
                        ? permission.getUser().getDisplayName() : permission.getUser().getUsername())
                .zoneId(permission.getZone().getId())
                .zoneName(permission.getZone().getName())
                .createdAt(permission.getCreatedAt())
                .build();
    }
}
