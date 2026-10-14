package com.tcp.cleanmanagement.controller;

import com.tcp.cleanmanagement.dto.ZoneRequest;
import com.tcp.cleanmanagement.dto.ZoneResponse;
import com.tcp.cleanmanagement.entity.Zone;
import com.tcp.cleanmanagement.enums.ZoneType;
import com.tcp.cleanmanagement.repository.ZoneRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/admin/zones")
@RequiredArgsConstructor
public class ZoneAdminController {
    private final ZoneRepository zoneRepository;

    @GetMapping
    public List<ZoneResponse> list() {
        return zoneRepository.findAll().stream().map(this::toResponse).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ZoneResponse create(@Valid @RequestBody ZoneRequest request) {
        Zone zone = Zone.builder()
                .name(request.getName().trim())
                .address(request.getAddress() != null ? request.getAddress().trim() : "")
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .zoneType(request.getZoneType() != null ? request.getZoneType() : ZoneType.TOILET)
                .isOurSolution(true)
                .pleasantThreshold(300.0f)
                .needsVentilationThreshold(500.0f)
                .build();
        return toResponse(zoneRepository.save(zone));
    }

    @PatchMapping("/{zoneId}")
    public ZoneResponse update(@PathVariable Long zoneId, @RequestBody ZoneRequest request) {
        Zone zone = zoneRepository.findById(zoneId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Zone not found"));
        if (request.getName() != null && !request.getName().isBlank()) {
            zone.setName(request.getName().trim());
        }
        if (request.getAddress() != null) {
            zone.setAddress(request.getAddress().trim());
        }
        if (request.getZoneType() != null) {
            zone.setZoneType(request.getZoneType());
        }
        return toResponse(zoneRepository.save(zone));
    }

    @DeleteMapping("/{zoneId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long zoneId) {
        if (!zoneRepository.existsById(zoneId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Zone not found");
        }
        zoneRepository.deleteById(zoneId);
    }

    private ZoneResponse toResponse(Zone zone) {
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
