package com.tcp.cleanmanagement.interceptor;

import com.tcp.cleanmanagement.security.AuthUser;
import com.tcp.cleanmanagement.security.JwtTokenProvider;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.cors.CorsUtils;
import org.springframework.web.servlet.HandlerInterceptor;

import java.nio.charset.StandardCharsets;
import java.util.Optional;

/**
 * Verifies the Bearer token on dashboard APIs and stores the caller as a request attribute.
 * Paths under /api/admin/** additionally require the ADMIN role.
 */
@Component
@RequiredArgsConstructor
public class JwtAuthInterceptor implements HandlerInterceptor {
    private static final String BEARER = "Bearer ";

    private final JwtTokenProvider tokenProvider;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // Browsers send CORS preflight requests without the Authorization header.
        if (CorsUtils.isPreFlightRequest(request)) {
            return true;
        }
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith(BEARER)) {
            return reject(response, HttpStatus.UNAUTHORIZED, "Missing or invalid token");
        }
        Optional<AuthUser> user = tokenProvider.verify(authHeader.substring(BEARER.length()).trim());
        if (user.isEmpty()) {
            return reject(response, HttpStatus.UNAUTHORIZED, "Invalid or expired token");
        }
        String path = request.getRequestURI().substring(request.getContextPath().length());
        if (path.startsWith("/api/admin/") && !user.get().isAdmin()) {
            return reject(response, HttpStatus.FORBIDDEN, "Administrator role required");
        }
        request.setAttribute(AuthUser.REQUEST_ATTRIBUTE, user.get());
        return true;
    }

    private boolean reject(HttpServletResponse response, HttpStatus status, String message) throws Exception {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.getWriter().write("{\"status\":" + status.value() + ",\"error\":\"" + status.getReasonPhrase()
                + "\",\"message\":\"" + message + "\"}");
        return false;
    }
}
