package com.docmind.config;

import com.docmind.entity.Role;
import jakarta.servlet.DispatcherType;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.context.RequestAttributeSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

@Slf4j
@Configuration
@RequiredArgsConstructor
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    private final JwtAuthenticationFilter authenticationFilter;
    private final AppProperties appProperties;

    /**
     * Stateless, per-request storage of the SecurityContext.
     * Nothing is written to an HttpSession, but the context IS stored as a request
     * attribute, so it survives ASYNC and ERROR dispatches of the SAME request.
     */
    @Bean
    public SecurityContextRepository securityContextRepository() {
        return new RequestAttributeSecurityContextRepository();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity httpSecurity) {

        httpSecurity
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // make the repository explicit so ASYNC / ERROR dispatches can restore it
                .securityContext(sc -> sc
                        .securityContextRepository(securityContextRepository()))
                .authorizeHttpRequests(auth -> auth
                        // 1. internal container dispatches must never be re-authorized
                        .dispatcherTypeMatchers(
                                DispatcherType.ERROR,
                                DispatcherType.ASYNC,
                                DispatcherType.FORWARD).permitAll()
                        // 2. belt and braces: the Boot error page itself
                        .requestMatchers("/error").permitAll()
                        // 3. CORS pre-flight carries no Authorization header
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        // 4. public endpoints
                        .requestMatchers(
                                "/api/v1/auth/**",
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html").permitAll()
                        // 5. coarse-grained URL rules
                        .requestMatchers("/api/v1/admin/**").hasRole(Role.ADMIN.name())
                        // IMPORTANT: authenticated(), NOT hasRole(USER).
                        // Fine-grained roles are enforced by @PreAuthorize on the methods.
                        .requestMatchers("/api/v1/**").authenticated()
                        .anyRequest().authenticated())
                .addFilterAfter(authenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint((request, response, authException) -> {
                            log.warn("401 Unauthorized: {} {} -> {}",
                                    request.getMethod(), request.getRequestURI(),
                                    authException.getMessage());
                            writeJson(response, HttpStatus.UNAUTHORIZED,
                                    "Authentication required or token invalid/expired");
                        })
                        .accessDeniedHandler((request, response, deniedException) -> {
                            log.warn("403 Forbidden: {} {} -> {}",
                                    request.getMethod(), request.getRequestURI(),
                                    deniedException.getMessage());
                            writeJson(response, HttpStatus.FORBIDDEN,
                                    "You do not have permission to access this resource");
                        }));

        return httpSecurity.build();
    }

    /**
     * Writes the error body DIRECTLY instead of calling response.sendError().
     * sendError() triggers a container ERROR dispatch to /error, which is what
     * produced the confusing second "response is already committed" stack trace.
     */
    private void writeJson(HttpServletResponse response, HttpStatus status, String message)
            throws IOException {
        if (response.isCommitted()) {
            // streaming response already in flight - nothing useful we can send
            log.warn("Response already committed, cannot write {} body", status.value());
            return;
        }
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        String body = """
                {"success":false,"message":"%s","data":null,"timestamp":"%s"}"""
                .formatted(message, LocalDateTime.now());
        response.getWriter().write(body);
        response.flushBuffer();
    }

    /**
     * Single source of truth for CORS, used by Spring Security's CorsFilter.
     * The old WebMvcConfigurer-based CorsConfig only applied to MVC-mapped paths,
     * which left security-chain rejections (401/403) without CORS headers -
     * the browser then reported an opaque "network error" instead of the status.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration cfg = new CorsConfiguration();
        cfg.setAllowedOriginPatterns(
                Arrays.asList(appProperties.getCors().getAllowedOrigins().split(",")));
        cfg.setAllowedMethods(
                Arrays.asList(appProperties.getCors().getAllowedMethods().split(",")));
        cfg.setAllowedHeaders(
                Arrays.asList(appProperties.getCors().getAllowedHeaders().split(",")));
        cfg.setExposedHeaders(List.of(HttpHeaders.AUTHORIZATION, HttpHeaders.CONTENT_TYPE));
        cfg.setAllowCredentials(true);
        cfg.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cfg);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) {
        return configuration.getAuthenticationManager();
    }
}