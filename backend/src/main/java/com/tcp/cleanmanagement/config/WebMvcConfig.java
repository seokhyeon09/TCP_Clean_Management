package com.tcp.cleanmanagement.config;

import com.tcp.cleanmanagement.interceptor.JwtAuthInterceptor;
import com.tcp.cleanmanagement.interceptor.RateLimitInterceptor;
import com.tcp.cleanmanagement.security.AuthUserArgumentResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;

@Configuration
@RequiredArgsConstructor
public class WebMvcConfig implements WebMvcConfigurer {
    private final RateLimitInterceptor rateLimitInterceptor;
    private final JwtAuthInterceptor jwtAuthInterceptor;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // Apply Rate Limiting to Public APIs
        registry.addInterceptor(rateLimitInterceptor)
                .addPathPatterns("/api/public/**");
                
        // Apply JWT Auth to dashboard APIs. /api/auth/login and device APIs (/api/iot/**) stay open.
        registry.addInterceptor(jwtAuthInterceptor)
                .addPathPatterns("/api/admin/**", "/api/me", "/api/me/**", "/api/zones/**", "/api/alerts/**");
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(new AuthUserArgumentResolver());
    }

    @Override
    public void addCorsMappings(org.springframework.web.servlet.config.annotation.CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOriginPatterns("*") // 배포 시 프론트엔드 도메인으로 제한하는 것이 좋습니다 (예: "http://localhost:5173")
                // PATCH is required by PATCH /api/admin/device-sets/{id}.
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }
}
