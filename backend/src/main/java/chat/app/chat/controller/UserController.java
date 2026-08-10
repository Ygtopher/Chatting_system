package chat.app.chat.controller;

import chat.app.chat.model.User;
import chat.app.chat.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173"}, allowCredentials = "true")
public class UserController {

    @Autowired
    private UserService userService;

    @GetMapping("/search")
    public ResponseEntity<?> searchUsers(@RequestParam String username) {
        List<User> users = userService.findByUsernameContaining(username);
        
        List<Map<String, Object>> userList = users.stream()
            .map(user -> {
                Map<String, Object> userMap = new HashMap<>();
                userMap.put("id", user.getId());
                userMap.put("username", user.getUsernameField());
                userMap.put("profilePictureUrl", user.getProfilePictureUrl());
                return userMap;
            })
            .collect(Collectors.toList());

        return ResponseEntity.ok(userList);
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(Authentication authentication) {
        User user = userService.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Map<String, Object> response = new HashMap<>();
        response.put("id", user.getId());
        response.put("email", user.getEmail());
        response.put("username", user.getUsernameField());
        response.put("profilePictureUrl", user.getProfilePictureUrl());
        response.put("isVerified", user.isVerified());
        response.put("has2FA", user.getTwoFactorSecret() != null);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/profile/picture")
    public ResponseEntity<?> uploadProfilePicture(
            Authentication authentication,
            @RequestParam("file") MultipartFile file) {
        User user = userService.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "File is empty"));
        }

        try {
            Path uploadPath = Paths.get("./uploads");
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            String originalFilename = file.getOriginalFilename();
            String extension = (originalFilename != null && originalFilename.contains("."))
                    ? originalFilename.substring(originalFilename.lastIndexOf("."))
                    : ".jpg";
            String filename = "avatar_" + user.getId() + "_" + System.currentTimeMillis() + extension;
            Path filePath = uploadPath.resolve(filename);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            String fileUrl = "/uploads/" + filename;
            user = userService.updateProfile(user.getId(), null, fileUrl);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Profile picture uploaded successfully");
            response.put("profilePictureUrl", fileUrl);
            return ResponseEntity.ok(response);
        } catch (IOException e) {
            return ResponseEntity.status(500).body(Map.of("error", "Failed to upload file: " + e.getMessage()));
        }
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(
            Authentication authentication,
            @RequestBody Map<String, String> request) {
        User user = userService.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        String username = request.get("username");
        String profilePictureUrl = request.get("profilePictureUrl");

        user = userService.updateProfile(user.getId(), username, profilePictureUrl);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Profile updated successfully");
        response.put("username", user.getUsernameField());
        response.put("profilePictureUrl", user.getProfilePictureUrl());

        return ResponseEntity.ok(response);
    }

    @PutMapping("/password")
    public ResponseEntity<?> updatePassword(
            Authentication authentication,
            @RequestBody Map<String, String> request) {
        User user = userService.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        String newPassword = request.get("newPassword");
        if (newPassword == null || newPassword.trim().length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("error", "Password must be at least 6 characters"));
        }

        userService.updatePassword(user.getId(), newPassword);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Password updated successfully");

        return ResponseEntity.ok(response);
    }

    @PostMapping("/2fa/enable")
    public ResponseEntity<?> enable2FA(
            Authentication authentication,
            @RequestBody(required = false) Map<String, String> request) {
        User user = userService.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        String secret = (request != null && request.get("secret") != null) ? request.get("secret") : "default_secret";
        userService.enable2FA(user.getId(), secret);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "2FA enabled successfully");

        return ResponseEntity.ok(response);
    }

    @PostMapping("/2fa/disable")
    public ResponseEntity<?> disable2FA(
            Authentication authentication,
            @RequestBody(required = false) Map<String, String> request) {
        User user = userService.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        userService.disable2FA(user.getId());

        Map<String, Object> response = new HashMap<>();
        response.put("message", "2FA disabled successfully");

        return ResponseEntity.ok(response);
    }
} 