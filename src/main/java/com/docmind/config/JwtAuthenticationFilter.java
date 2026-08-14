package com.docmind.config;

import com.docmind.service.CustomUserDetailService;
import com.docmind.entity.User;
import com.docmind.repository.UserRepository;
import com.docmind.service.CustomUserDetail;
import com.docmind.service.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.security.web.context.RequestAttributeSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final CustomUserDetailService userDetailService;
    private final UserRepository userRepository;

    /**
     * Must match the repository configured in SecurityConfig so that the context
     * saved here is the one SecurityContextHolderFilter restores on later dispatches.
     */
    private final SecurityContextRepository securityContextRepository =
            new RequestAttributeSecurityContextRepository();

    /**
     * OncePerRequestFilter skips ASYNC dispatches by default.
     * /api/v1/chat/stream returns a Flux, which makes the request asynchronous,
     * so the async dispatch would otherwise arrive with an empty SecurityContext.
     */
    @Override
    protected boolean shouldNotFilterAsyncDispatch() {
        return false;
    }

    /**
     * Same reasoning for the container's ERROR dispatch to /error.
     */
    @Override
    protected boolean shouldNotFilterErrorDispatch() {
        return false;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        // Already authenticated on this request (ASYNC / ERROR re-dispatch) -> do nothing.
        if (SecurityContextHolder.getContext().getAuthentication() != null
                && SecurityContextHolder.getContext().getAuthentication().isAuthenticated()) {
            filterChain.doFilter(request, response);
            return;
        }

        String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.debug("No Bearer token on {} {}", request.getMethod(), request.getRequestURI());
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7).trim();

        try {
            String username = jwtService.extractUsername(token);

            if (username != null) {
                UserDetails userDetails = userDetailService.loadUserByUsername(username);

                if (jwtService.isTokenValid(token, userDetails)) {

                    User user = userRepository.findByUsername(username).orElseThrow();

                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(
                                    user,                                   // principal stays the entity
                                    null,
                                    new CustomUserDetail(user).getAuthorities()); // ROLE_USER / ROLE_ADMIN

                    authentication.setDetails(
                            new WebAuthenticationDetailsSource().buildDetails(request));

                    SecurityContext context = SecurityContextHolder.createEmptyContext();
                    context.setAuthentication(authentication);
                    SecurityContextHolder.setContext(context);

                    // Persist into the request attribute so ASYNC / ERROR dispatches
                    // of this same request still see an authenticated user.
                    securityContextRepository.saveContext(context, request, response);

                    log.debug("Authenticated '{}' with authorities {} for {} {}",
                            username, authentication.getAuthorities(),
                            request.getMethod(), request.getRequestURI());
                }
            }
        } catch (Exception ex) {
            // Invalid/expired token: leave the context empty and let the
            // AuthenticationEntryPoint produce a clean 401. Never swallow silently.
            SecurityContextHolder.clearContext();
            log.warn("JWT rejected for {} {}: {}",
                    request.getMethod(), request.getRequestURI(), ex.getMessage());
        }

        filterChain.doFilter(request, response);
    }
}