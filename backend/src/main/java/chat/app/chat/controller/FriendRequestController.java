package chat.app.chat.controller;

import chat.app.chat.model.FriendRequest;
import chat.app.chat.model.User;
import chat.app.chat.service.FriendRequestService;
import chat.app.chat.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/friends")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173"}, allowCredentials = "true")
public class FriendRequestController {

    private static final Logger logger = LoggerFactory.getLogger(FriendRequestController.class);

    @Autowired
    private FriendRequestService friendRequestService;

    @Autowired
    private UserService userService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @GetMapping("/search")
    public ResponseEntity<?> searchUsers(
            Authentication authentication,
            @RequestParam String query) {
        try {
            logger.info("Searching users with query: {}", query);
            User currentUser = userService.findByEmail(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            List<User> users = userService.searchUsers(query);
            
            // Filter out the current user and add friendship status
            List<Map<String, Object>> userResults = users.stream()
                .filter(user -> !user.getId().equals(currentUser.getId()))
                .map(user -> {
                    Map<String, Object> userMap = new HashMap<>();
                    userMap.put("id", user.getId());
                    userMap.put("username", user.getUsernameField());
                    userMap.put("email", user.getEmail());
                    userMap.put("profilePictureUrl", user.getProfilePictureUrl());
                    
                    // Add friendship status
                    if (friendRequestService.areFriends(currentUser, user)) {
                        userMap.put("status", "friends");
                    } else if (friendRequestService.hasPendingRequest(currentUser, user)) {
                        userMap.put("status", "request_sent");
                    } else if (friendRequestService.hasPendingRequest(user, currentUser)) {
                        userMap.put("status", "request_received");
                    } else {
                        userMap.put("status", "none");
                    }
                    
                    return userMap;
                })
                .collect(Collectors.toList());

            Map<String, Object> response = new HashMap<>();
            response.put("users", userResults);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error searching users: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to search users"));
        }
    }

    @PostMapping("/request/{userId}")
    public ResponseEntity<?> sendFriendRequest(
            Authentication authentication,
            @PathVariable Long userId) {
        try {
            logger.info("Sending friend request from user {} to user {}", authentication.getName(), userId);
            User currentUser = userService.findByEmail(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            User receiver = userService.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            if (currentUser.getId().equals(userId)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Cannot send friend request to yourself"));
            }

            if (friendRequestService.hasPendingRequest(currentUser, receiver)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Friend request already pending"));
            }

            if (friendRequestService.areFriends(currentUser, receiver)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Users are already friends"));
            }

            FriendRequest request = friendRequestService.sendFriendRequest(currentUser, receiver);

            // Send real-time notification to receiver
            if (receiver.getEmail() != null) {
                Map<String, Object> notificationDto = new HashMap<>();
                notificationDto.put("type", "FRIEND_REQUEST");
                notificationDto.put("requestId", request.getId());
                notificationDto.put("senderName", currentUser.getUsernameField() != null ? currentUser.getUsernameField() : "A user");
                notificationDto.put("senderId", currentUser.getId());
                notificationDto.put("content", "sent you a friend request!");
                messagingTemplate.convertAndSendToUser(receiver.getEmail(), "/queue/messages", notificationDto);
            }

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Friend request sent successfully");
            response.put("requestId", request.getId());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error sending friend request: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to send friend request"));
        }
    }

    @GetMapping("/list")
    public ResponseEntity<?> getFriendsList(Authentication authentication) {
        try {
            logger.info("Getting friends list for user: {}", authentication.getName());
            User currentUser = userService.findByEmail(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            List<User> friends = friendRequestService.getFriends(currentUser);
            List<Map<String, Object>> friendsList = friends.stream()
                .map(friend -> {
                    Map<String, Object> friendMap = new HashMap<>();
                    friendMap.put("id", friend.getId());
                    friendMap.put("username", friend.getUsernameField());
                    friendMap.put("email", friend.getEmail());
                    friendMap.put("profilePictureUrl", friend.getProfilePictureUrl());
                    return friendMap;
                })
                .collect(Collectors.toList());

            Map<String, Object> response = new HashMap<>();
            response.put("friends", friendsList);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error getting friends list: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to get friends list"));
        }
    }

    @PostMapping("/request/{requestId}/accept")
    public ResponseEntity<?> acceptFriendRequest(
            Authentication authentication,
            @PathVariable Long requestId) {
        User currentUser = userService.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        try {
            FriendRequest req = friendRequestService.findById(requestId);
            friendRequestService.acceptFriendRequest(requestId, currentUser);

            if (req != null && req.getSender() != null && req.getSender().getEmail() != null) {
                Map<String, Object> notificationDto = new HashMap<>();
                notificationDto.put("type", "FRIEND_REQUEST_ACCEPTED");
                notificationDto.put("senderName", currentUser.getUsernameField() != null ? currentUser.getUsernameField() : "A user");
                notificationDto.put("content", "accepted your friend request!");
                messagingTemplate.convertAndSendToUser(req.getSender().getEmail(), "/queue/messages", notificationDto);
            }

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Friend request accepted");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        }
    }

    @PostMapping("/request/{requestId}/decline")
    public ResponseEntity<?> declineFriendRequest(
            Authentication authentication,
            @PathVariable Long requestId) {
        User currentUser = userService.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        try {
            friendRequestService.declineFriendRequest(requestId, currentUser);
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Friend request declined");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        }
    }

    @DeleteMapping("/request/{requestId}")
    public ResponseEntity<?> cancelFriendRequest(
            Authentication authentication,
            @PathVariable Long requestId) {
        User currentUser = userService.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        try {
            friendRequestService.cancelFriendRequest(requestId, currentUser);
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Friend request cancelled");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        }
    }

    @GetMapping("/requests/pending")
    public ResponseEntity<?> getPendingFriendRequests(Authentication authentication) {
        User currentUser = userService.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<FriendRequest> requests = friendRequestService.getPendingFriendRequests(currentUser);

        Map<String, Object> response = new HashMap<>();
        response.put("requests", requests);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/requests/sent")
    public ResponseEntity<?> getSentFriendRequests(Authentication authentication) {
        User currentUser = userService.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<FriendRequest> requests = friendRequestService.getSentFriendRequests(currentUser);

        Map<String, Object> response = new HashMap<>();
        response.put("requests", requests);

        return ResponseEntity.ok(response);
    }
} 