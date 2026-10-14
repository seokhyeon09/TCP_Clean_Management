package com.tcp.cleanmanagement.controller;

import com.tcp.cleanmanagement.dto.ZonePermissionRequest;
import com.tcp.cleanmanagement.dto.ZonePermissionResponse;
import com.tcp.cleanmanagement.service.ZonePermissionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/permissions")
@RequiredArgsConstructor
public class ZonePermissionController {
    private final ZonePermissionService permissionService;

    @GetMapping
    public List<ZonePermissionResponse> list() {
        return permissionService.list();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ZonePermissionResponse grant(@Valid @RequestBody ZonePermissionRequest request) {
        return permissionService.grant(request);
    }

    @DeleteMapping("/{permissionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revoke(@PathVariable Long permissionId) {
        permissionService.revoke(permissionId);
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revokeByUserAndZone(@RequestParam Long userId, @RequestParam Long zoneId) {
        permissionService.revokeByUserAndZone(userId, zoneId);
    }
}
