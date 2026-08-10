package chat.app.chat.service;

import chat.app.chat.model.User;
import chat.app.chat.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PasswordResetService {

    private static final Logger logger = LoggerFactory.getLogger(PasswordResetService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JavaMailSender mailSender;
    private final Map<String, PasswordResetToken> resetTokens = new ConcurrentHashMap<>();
    private final Map<String, LoginVerificationToken> loginTokens = new ConcurrentHashMap<>();

    @Autowired
    public PasswordResetService(UserRepository userRepository, PasswordEncoder passwordEncoder, JavaMailSender mailSender) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.mailSender = mailSender;
    }

    private static final SecureRandom RANDOM = new SecureRandom();

    public void sendLoginVerificationEmail(String email) {
        String cleanEmail = email != null ? email.trim() : "";
        User user = userRepository.findByEmail(cleanEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Remove any existing tokens for this user
        loginTokens.entrySet().removeIf(entry -> entry.getValue().getUserId().equals(user.getId()));

        // Generate a cryptographically-random 6-digit OTP
        String token = String.format("%06d", RANDOM.nextInt(900000) + 100000);
        loginTokens.put(token, new LoginVerificationToken(user.getId(), LocalDateTime.now().plusMinutes(15)));

        // ── Always log token to console (useful when email delivery fails) ──────
        logger.warn("╔══════════════════════════════════════════════════════════╗");
        logger.warn("║  LOGIN TOKEN for {} ", cleanEmail);
        logger.warn("║  TOKEN: {}", token);
        logger.warn("║  Expires in 15 minutes                                    ");
        logger.warn("╚══════════════════════════════════════════════════════════╝");

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(cleanEmail);
            message.setSubject("Login Verification");
            message.setText("Your 6-digit login code is: " + token + "\n\nThis code will expire in 15 minutes.\nDo not share this code with anyone.");
            mailSender.send(message);
            logger.info("Sent login verification email to: {}", cleanEmail);
        } catch (Exception e) {
            logger.error("Failed to send email to {}: {}", cleanEmail, e.getMessage());
        }
    }


    public boolean verifyLoginToken(String email, String token) {
        if (email == null || token == null) {
            throw new RuntimeException("Email and token must not be null");
        }
        String cleanEmail = email.trim();
        String cleanToken = token.trim();

        logger.info("Attempting to verify login token: {} for email: {}", cleanToken, cleanEmail);
        
        LoginVerificationToken verificationToken = loginTokens.get(cleanToken);
        
        if (verificationToken == null) {
            logger.warn("No token found for provided token string: {}", cleanToken);
            throw new RuntimeException("Invalid or expired verification token. Please log in again to receive a fresh code.");
        }

        if (verificationToken.isExpired()) {
            logger.warn("Token expired for user ID: {}", verificationToken.getUserId());
            loginTokens.remove(cleanToken);
            throw new RuntimeException("Token has expired. Please log in again to receive a fresh code.");
        }

        User user = userRepository.findById(verificationToken.getUserId())
                .orElseThrow(() -> {
                    logger.error("User not found for ID: {}", verificationToken.getUserId());
                    return new RuntimeException("User not found");
                });

        if (!user.getEmail().equalsIgnoreCase(cleanEmail)) {
            logger.warn("Token email mismatch. Expected: {}, Actual: {}", cleanEmail, user.getEmail());
            throw new RuntimeException("Token does not match the provided email");
        }

        logger.info("Token verification successful for user ID: {}", user.getId());
        loginTokens.remove(cleanToken);
        return true;
    }

    public void sendPasswordResetEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String token = String.format("%06d", RANDOM.nextInt(900000) + 100000);
        resetTokens.put(token, new PasswordResetToken(user.getId(), LocalDateTime.now().plusHours(24)));

        logger.warn("╔══════════════════════════════════════════════════════════╗");
        logger.warn("║  PASSWORD RESET CODE for {} ", email);
        logger.warn("║  CODE: {}", token);
        logger.warn("║  Expires in 24 hours                                     ");
        logger.warn("╚══════════════════════════════════════════════════════════╝");

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(email);
        message.setSubject("Password Reset Request");
        message.setText("Your 6-digit password reset code is: " + token + "\n\nThis code will expire in 24 hours.");
        mailSender.send(message);
    }

    public void resetPassword(String token, String newPassword) {
        PasswordResetToken resetToken = resetTokens.get(token);
        if (resetToken == null || resetToken.isExpired()) {
            throw new RuntimeException("Invalid or expired token");
        }

        User user = userRepository.findById(resetToken.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        resetTokens.remove(token);
    }

    private static class PasswordResetToken {
        private final Long userId;
        private final LocalDateTime expiryDate;

        public PasswordResetToken(Long userId, LocalDateTime expiryDate) {
            this.userId = userId;
            this.expiryDate = expiryDate;
        }

        public Long getUserId() {
            return userId;
        }

        public boolean isExpired() {
            return LocalDateTime.now().isAfter(expiryDate);
        }
    }

    private static class LoginVerificationToken {
        private final Long userId;
        private final LocalDateTime expiryDate;

        public LoginVerificationToken(Long userId, LocalDateTime expiryDate) {
            this.userId = userId;
            this.expiryDate = expiryDate;
        }

        public Long getUserId() {
            return userId;
        }

        public boolean isExpired() {
            return LocalDateTime.now().isAfter(expiryDate);
        }
    }
} 