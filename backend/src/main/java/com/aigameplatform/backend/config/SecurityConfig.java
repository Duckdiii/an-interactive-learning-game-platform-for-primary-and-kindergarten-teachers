package com.aigameplatform.backend.config;

import com.aigameplatform.backend.security.JwtAuthenticationFilter;
import com.aigameplatform.backend.security.RestSecurityErrorHandler;
import com.aigameplatform.backend.security.TeacherAccessAuthenticator;
import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class SecurityConfig {

    @Value("${app.cors.allowed-origins}")
    private String[] allowedOrigins;

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http, TeacherAccessAuthenticator authenticator, RestSecurityErrorHandler errorHandler) throws Exception {
        http
            // API xác thực bằng header Authorization (không dựa vào cookie), nên bỏ kiểm tra CSRF cho đường dẫn API/WebSocket.
            // Cookie refresh token chỉ gửi tới /api/auth, kèm SameSite=Strict.
            .csrf(csrf -> csrf.ignoringRequestMatchers("/api/**", "/ws/**"))
            .cors(Customizer.withDefaults())
            // Không lưu session phía server, mỗi request tự mang token.
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                // Swagger UI và spec sinh từ code; tắt hẳn bằng SWAGGER_ENABLED=false khi triển khai.
                .requestMatchers(HttpMethod.GET,
                        "/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**").permitAll()
                // Logout không nằm trong danh sách này: phải có access token hợp lệ.
                .requestMatchers(HttpMethod.POST,
                        "/api/auth/register", "/api/auth/login", "/api/auth/refresh",
                        "/api/auth/forgot-password", "/api/auth/reset-password").permitAll()
                .requestMatchers("/ws/live-arena/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/games/shared/*", "/api/sessions/*/questions",
                        "/api/sessions/by-code/*", "/api/sessions/*/leaderboard", "/api/sessions/*/my-result").permitAll()
                .requestMatchers(HttpMethod.GET, "/media/uploads/*", "/media/tts/*").permitAll()
                .requestMatchers(HttpMethod.HEAD, "/media/uploads/*", "/media/tts/*").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/media/upload", "/api/games/validate-text").hasAuthority("ROLE_TEACHER")
                .requestMatchers(HttpMethod.POST, "/api/games/shared/*/play", "/api/sessions/*/join",
                        "/api/sessions/*/interactions").permitAll()
                .requestMatchers(HttpMethod.PUT, "/api/sessions/*/my-team").permitAll()
                .requestMatchers("/api/admin/**").hasAuthority("ROLE_ADMIN")
                .anyRequest().authenticated())
            .exceptionHandling(handling -> handling
                .authenticationEntryPoint(errorHandler)
                .accessDeniedHandler(errorHandler))
            .addFilterBefore(new JwtAuthenticationFilter(authenticator), UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.asList(allowedOrigins));
        config.setAllowedMethods(List.of("GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Participant-Id"));
        config.setAllowCredentials(true);

        CorsConfiguration publicMedia = new CorsConfiguration();
        publicMedia.setAllowedOrigins(List.of("*"));
        publicMedia.setAllowedMethods(List.of("GET", "HEAD", "OPTIONS"));
        publicMedia.setAllowedHeaders(List.of("Range"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/media/**", publicMedia);
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
