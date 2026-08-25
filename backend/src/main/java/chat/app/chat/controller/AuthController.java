package chat.app.chat.controller;

import chat.app.chat.model.User;
import chat.app.chat.security.JwtTokenUtil;
import chat.app.chat.service.PasswordResetService;
import chat.app.chat.service.TokenBlocklistService;
import chat.app.chat.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(
    originPatterns = {"http://localhost:3000", "http://localhost:5173", "https://*.vercel.app"},
    allowedHeaders = {"Authorization", "Content-Type", "Accept"},
    methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS},
    allowCredentials = "true",
    maxAge = 3600
)
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtTokenUtil jwtTokenUtil;

    @Autowired
    private UserService userService;

    @Autowired
    private PasswordResetService passwordResetService;

    @Autowired
    private TokenBlocklistService tokenBlocklistService;

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody Map<String, String> request) {
        logger.info("Received registration request");
        
        String email = request.get("email");
        String username = request.get("username");
        String password = request.get("password");
        
        logger.debug("Registration details - Email: {}, Username: {}", email, username);

        try {
            User user = userService.registerUser(email, username, password);
            
            try {
                passwordResetService.sendLoginVerificationEmail(email);
                logger.info("Sent registration verification email to: {}", email);
            } catch (Exception mailEx) {
                logger.error("Failed to send registration email to {}: {}", email, mailEx.getMessage());
                logger.warn("Registration succeeded, but email delivery failed. Check backend logs for the 6-digit code.");
            }

            Map<String, Object> response = new HashMap<>();
            response.put("message", "User registered successfully");
            response.put("userId", user.getId());
            
            logger.info("User registered successfully with ID: {}", user.getId());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Registration failed: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String password = request.get("password");

        // First, verify credentials
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, password)
        );

        User user = userService.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // If 2FA is NOT enabled, log in directly and issue JWT
        if (user.getTwoFactorSecret() == null || user.getTwoFactorSecret().trim().isEmpty()) {
            UserDetails userDetails = userService.loadUserByUsername(email);
            String jwt = jwtTokenUtil.generateToken(userDetails);

            Map<String, Object> response = new HashMap<>();
            response.put("token", jwt);
            response.put("email", email);
            response.put("requires2FA", false);
            return ResponseEntity.ok(response);
        }

        // Send verification email — if email fails, token is still logged for dev
        try {
            passwordResetService.sendLoginVerificationEmail(email);
            logger.info("2FA Login verification email sent to: {}", email);
        } catch (Exception e) {
            logger.error("Failed to send verification email to {}: {}", email, e.getMessage());
            logger.warn("EMAIL DELIVERY FAILED. Check your Gmail App Password in application.properties.");
        }

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Verification email sent. Please check your email for the 2FA token.");
        response.put("email", email);
        response.put("requires2FA", true);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/verify-login")
    public ResponseEntity<?> verifyLogin(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String token = request.get("token");
        
        logger.info("Verifying login for email: {}", email);
        logger.info("Token received: {}", token);
        
        try {
            if (passwordResetService.verifyLoginToken(email, token)) {
                logger.info("Token verification successful for email: {}", email);
                UserDetails userDetails = userService.loadUserByUsername(email);
                String jwt = jwtTokenUtil.generateToken(userDetails);
                
                logger.info("Generated JWT token for user: {}", email);
                
                Map<String, Object> response = new HashMap<>();
                response.put("token", jwt);
                response.put("email", email);
                
                return ResponseEntity.ok(response);
            }
        } catch (Exception e) {
            logger.error("Error verifying login token: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("error", e.getMessage()));
        }
        
        logger.warn("Token verification failed for email: {}", email);
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(Map.of("error", "Invalid token"));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            tokenBlocklistService.block(token);
            logger.info("User logged out, token blocklisted");
        }
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    @PostMapping("/verify-2fa")
    public ResponseEntity<?> verify2FA(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String code = request.get("code");

        // TODO: Implement 2FA verification logic
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "2FA verification successful");
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        
        try {
            passwordResetService.sendPasswordResetEmail(email);
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Password reset email sent");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        String token = request.get("token");
        String newPassword = request.get("newPassword");
        
        try {
            passwordResetService.resetPassword(token, newPassword);
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Password reset successful");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/verify-token")
    public ResponseEntity<?> verifyToken(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String token = request.get("token");

        if (passwordResetService.verifyLoginToken(email, token)) {
            // Generate JWT token
            UserDetails userDetails = userService.loadUserByUsername(email);
            String jwtToken = jwtTokenUtil.generateToken(userDetails);

            Map<String, Object> response = new HashMap<>();
            response.put("token", jwtToken);
            response.put("message", "Login successful");
            
            return ResponseEntity.ok(response);
        }

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("message", "Invalid or expired token"));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        User user = userService.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Map<String, Object> response = new HashMap<>();
        response.put("id", user.getId());
        response.put("email", user.getEmail());
        response.put("username", user.getUsernameField());
        response.put("profilePictureUrl", user.getProfilePictureUrl());
        response.put("isVerified", user.isVerified());
        response.put("roles", user.getAuthorities().stream()
                .map(auth -> auth.getAuthority())
                .toList());

        return ResponseEntity.ok(response);
    }
} 
