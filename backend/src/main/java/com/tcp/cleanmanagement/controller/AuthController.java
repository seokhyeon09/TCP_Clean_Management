package com.tcp.cleanmanagement.controller;

import com.tcp.cleanmanagement.dto.LoginRequest;
import com.tcp.cleanmanagement.dto.LoginResponse;
import com.tcp.cleanmanagement.dto.UserResponse;
import com.tcp.cleanmanagement.dto.ZoneResponse;
import com.tcp.cleanmanagement.security.AuthUser;
import com.tcp.cleanmanagement.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;

    @PostMapping("/api/auth/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/api/me")
    public UserResponse getMe(AuthUser authUser) {
        return authService.getMe(authUser);
    }

    @GetMapping("/api/me/zones")
    public List<ZoneResponse> getMyZones(AuthUser authUser) {
        return authService.getMyZones(authUser);
    }

    @GetMapping("/api/admin/users")
    public List<UserResponse> getAllUsers() {
        return authService.getAllUsers();
    }
}
