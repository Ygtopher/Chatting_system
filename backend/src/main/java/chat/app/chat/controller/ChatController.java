package chat.app.chat.controller;

import chat.app.chat.model.ChatRoom;
import chat.app.chat.model.GroupChat;
import chat.app.chat.model.GroupInvite;
import chat.app.chat.model.GroupMember;
import chat.app.chat.model.Message;
import chat.app.chat.model.User;
import chat.app.chat.repository.ChatRoomRepository;
import chat.app.chat.repository.GroupInviteRepository;
import chat.app.chat.repository.MessageRepository;
import chat.app.chat.service.ChatRoomService;
import chat.app.chat.service.GroupChatService;
import chat.app.chat.service.MessageService;
import chat.app.chat.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173"}, allowCredentials = "true")
public class ChatController {

    @Autowired
    private ChatRoomService chatRoomService;

    @Autowired
    private ChatRoomRepository chatRoomRepository;

    @Autowired
    private GroupChatService groupChatService;

    @Autowired
    private GroupInviteRepository groupInviteRepository;

    @Autowired
    private MessageService messageService;

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private UserService userService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // ─── Frontend-facing REST endpoints ─────────────────────────────────────────

    /** GET /api/chatrooms — list all direct chat rooms for the current user */
    @GetMapping("/api/chatrooms")
    public ResponseEntity<?> getChatRooms(Authentication authentication) {
        try {
            User currentUser = userService.findByEmail(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            List<ChatRoom> rooms = chatRoomRepository.findByUser1OrUser2(currentUser, currentUser);

            List<Map<String, Object>> result = rooms.stream()
                .filter(room -> room != null && room.getUser1() != null && room.getUser2() != null)
                .map(room -> {
                    Map<String, Object> roomMap = new HashMap<>();
                    roomMap.put("id", room.getId());

                    User otherUser = room.getUser1().getId().equals(currentUser.getId())
                            ? room.getUser2()
                            : room.getUser1();

                    if (otherUser == null) return null;

                    Map<String, Object> otherUserMap = new HashMap<>();
                    otherUserMap.put("id", otherUser.getId());
                    otherUserMap.put("username", otherUser.getUsernameField() != null ? otherUser.getUsernameField() : "User");
                    otherUserMap.put("profilePicture", otherUser.getProfilePictureUrl());
                    roomMap.put("otherUser", otherUserMap);
                    
                    Message lastMsg = messageRepository.findTopByChatRoomOrderByCreatedAtDesc(room).orElse(null);
                    roomMap.put("lastMessage", lastMsg != null ? buildMessageDto(lastMsg) : null);
                    roomMap.put("unreadCount", 0);
                    return roomMap;
                })
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toList());

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }

    /** GET /api/chatrooms/{id}/messages */
    @GetMapping("/api/chatrooms/{id}/messages")
    public ResponseEntity<?> getChatRoomMessages(
            Authentication authentication,
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        try {
            User currentUser = userService.findByEmail(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            ChatRoom chatRoom = chatRoomService.getChatRoom(id);

            if (!chatRoomService.hasAccess(chatRoom, currentUser)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied"));
            }

            Page<Message> messages = messageService.getChatRoomMessages(chatRoom, PageRequest.of(page, size));
            return ResponseEntity.ok(buildMessagePage(messages));
        } catch (Exception e) {
            e.printStackTrace();
            String errorMsg = e.getClass().getSimpleName() + ": " + (e.getMessage() != null ? e.getMessage() : "Unknown error");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", errorMsg));
        }
    }

    /** POST /api/chatrooms/{id}/messages */
    @PostMapping("/api/chatrooms/{id}/messages")
    public ResponseEntity<?> sendDirectMessage(
            Authentication authentication,
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {

        User currentUser = userService.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        ChatRoom chatRoom = chatRoomService.getChatRoom(id);

        if (!chatRoomService.hasAccess(chatRoom, currentUser)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access denied");
        }

        Message message = messageService.sendDirectMessage(currentUser, chatRoom, body.get("content"));
        Map<String, Object> dto = buildMessageDto(message);

        User otherUser = chatRoom.getUser1().getId().equals(currentUser.getId())
                ? chatRoom.getUser2()
                : chatRoom.getUser1();

        // Broadcast to receiver via STOMP user queue
        if (otherUser != null && otherUser.getEmail() != null) {
            messagingTemplate.convertAndSendToUser(otherUser.getEmail(), "/queue/messages", dto);
        }
        // Broadcast to sender as well for multi-tab / real-time echo
        if (currentUser.getEmail() != null) {
            messagingTemplate.convertAndSendToUser(currentUser.getEmail(), "/queue/messages", dto);
        }

        return ResponseEntity.ok(dto);
    }

    /** GET /api/groupchats — list all group chats for the current user */
    @GetMapping("/api/groupchats")
    public ResponseEntity<?> getGroupChats(Authentication authentication) {
        User currentUser = userService.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<GroupChat> groups = groupChatService.getUserGroups(currentUser);

        List<Map<String, Object>> result = groups.stream().map(group -> {
            Map<String, Object> groupMap = new HashMap<>();
            groupMap.put("id", group.getId());
            groupMap.put("name", group.getName());
            groupMap.put("description", "");
            Message lastMsg = messageRepository.findTopByGroupChatOrderByCreatedAtDesc(group).orElse(null);
            groupMap.put("lastMessage", lastMsg != null ? buildMessageDto(lastMsg) : null);
            groupMap.put("unreadCount", 0);
            groupMap.put("isAdmin", groupChatService.isUserAdmin(group, currentUser));
            return groupMap;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    /** GET /api/groupchats/{id}/messages */
    @GetMapping("/api/groupchats/{id}/messages")
    public ResponseEntity<?> getGroupChatMessages(
            Authentication authentication,
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        User currentUser = userService.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        GroupChat groupChat = groupChatService.getGroupChat(id);

        if (!groupChatService.isUserMember(groupChat, currentUser)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Not a member of this group");
        }

        Page<Message> messages = messageService.getGroupChatMessages(groupChat, PageRequest.of(page, size));
        return ResponseEntity.ok(buildMessagePage(messages));
    }

    /** POST /api/groupchats/{id}/messages */
    @PostMapping("/api/groupchats/{id}/messages")
    public ResponseEntity<?> sendGroupMessage(
            Authentication authentication,
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {

        User currentUser = userService.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        GroupChat groupChat = groupChatService.getGroupChat(id);

        if (!groupChatService.isUserMember(groupChat, currentUser)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Not a member of this group");
        }

        Message message = messageService.sendGroupMessage(currentUser, groupChat, body.get("content"));
        Map<String, Object> dto = buildMessageDto(message);

        // Broadcast to group topic subscribers
        messagingTemplate.convertAndSend("/topic/group/" + groupChat.getId(), dto);

        return ResponseEntity.ok(dto);
    }

    // ─── Legacy /api/chat/... endpoints (kept for backwards compatibility) ─────

    @PostMapping("/api/chat/direct/{userId}")
    public ResponseEntity<?> startDirectChat(Authentication authentication, @PathVariable Long userId) {
        User currentUser = userService.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        User otherUser = userService.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (currentUser.getId().equals(userId)) {
            return ResponseEntity.badRequest().body("Cannot start chat with yourself");
        }

        ChatRoom chatRoom = chatRoomService.getOrCreateChatRoom(currentUser, otherUser);

        Map<String, Object> response = new HashMap<>();
        response.put("chatRoomId", chatRoom.getId());
        response.put("userId", otherUser.getId());
        response.put("username", otherUser.getUsernameField());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/api/chat/group")
    public ResponseEntity<?> createGroupChat(Authentication authentication, @RequestBody Map<String, String> request) {
        User currentUser = userService.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        String name = request.get("name");
        if (name == null || name.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Group name cannot be empty");
        }

        GroupChat groupChat = groupChatService.createGroupChat(name, currentUser);
        Map<String, Object> response = new HashMap<>();
        response.put("id", groupChat.getId());
        response.put("name", groupChat.getName());
        response.put("description", "");
        response.put("lastMessage", null);
        response.put("unreadCount", 0);
        response.put("isAdmin", true);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/api/chat/group/{groupId}/invite")
    public ResponseEntity<?> sendGroupInvite(
            Authentication authentication,
            @PathVariable Long groupId,
            @RequestBody Map<String, String> request) {

        User currentUser = userService.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        User invitee = userService.findById(Long.parseLong(request.get("userId")))
                .orElseThrow(() -> new RuntimeException("User not found"));

        GroupChat groupChat = groupChatService.getGroupChat(groupId);
        if (!groupChatService.isUserAdmin(groupChat, currentUser)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Only group admins can send invites"));
        }
        if (groupChatService.isUserMember(groupChat, invitee)) {
            return ResponseEntity.badRequest().body(Map.of("error", "User is already a member of this group"));
        }
        if (groupInviteRepository.existsByGroupChatAndInviteeAndStatus(groupChat, invitee, GroupInvite.InviteStatus.PENDING)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Group invite already pending for this user"));
        }

        GroupInvite invite = new GroupInvite();
        invite.setGroupChat(groupChat);
        invite.setInviter(currentUser);
        invite.setInvitee(invitee);
        invite.setStatus(GroupInvite.InviteStatus.PENDING);
        invite = groupInviteRepository.save(invite);

        ChatRoom chatRoom = chatRoomService.getOrCreateChatRoom(currentUser, invitee);
        String content = "GROUP_INVITE|" + invite.getId() + "|" + groupChat.getId() + "|" + groupChat.getName();
        Message message = messageService.sendDirectMessage(currentUser, chatRoom, content);

        Map<String, Object> dto = buildMessageDto(message);
        if (invitee.getEmail() != null) {
            messagingTemplate.convertAndSendToUser(invitee.getEmail(), "/queue/messages", dto);
        }
        if (currentUser.getEmail() != null) {
            messagingTemplate.convertAndSendToUser(currentUser.getEmail(), "/queue/messages", dto);
        }

        return ResponseEntity.ok(Map.of("message", "Group invite sent successfully"));
    }

    @PostMapping("/api/chat/group/{groupId}/members")
    public ResponseEntity<?> addGroupMember(
            Authentication authentication,
            @PathVariable Long groupId,
            @RequestBody Map<String, String> request) {
        return sendGroupInvite(authentication, groupId, request);
    }

    @GetMapping("/api/chat/group/invites/pending")
    public ResponseEntity<?> getPendingGroupInvites(Authentication authentication) {
        User currentUser = userService.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<GroupInvite> invites = groupInviteRepository.findByInviteeAndStatus(currentUser, GroupInvite.InviteStatus.PENDING);
        List<Map<String, Object>> result = invites.stream().map(inv -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", inv.getId());
            map.put("groupId", inv.getGroupChat().getId());
            map.put("groupName", inv.getGroupChat().getName());
            map.put("inviterName", inv.getInviter().getUsernameField());
            map.put("createdAt", inv.getCreatedAt());
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(Map.of("invites", result));
    }

    @PostMapping("/api/chat/group/invites/{inviteId}/accept")
    public ResponseEntity<?> acceptGroupInvite(Authentication authentication, @PathVariable Long inviteId) {
        User currentUser = userService.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        GroupInvite invite = groupInviteRepository.findById(inviteId)
                .orElseThrow(() -> new RuntimeException("Group invite not found"));

        if (!invite.getInvitee().getId().equals(currentUser.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Not authorized to accept this invite"));
        }
        if (invite.getStatus() != GroupInvite.InviteStatus.PENDING) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invite is no longer pending"));
        }

        invite.setStatus(GroupInvite.InviteStatus.ACCEPTED);
        groupInviteRepository.save(invite);

        if (!groupChatService.isUserMember(invite.getGroupChat(), currentUser)) {
            groupChatService.addMember(invite.getGroupChat(), currentUser, GroupMember.GroupRole.MEMBER);

            // Broadcast system message
            Message message = messageService.sendGroupMessage(currentUser, invite.getGroupChat(), "SYSTEM_JOIN|" + currentUser.getUsernameField());
            Map<String, Object> dto = buildMessageDto(message);
            messagingTemplate.convertAndSend("/topic/group/" + invite.getGroupChat().getId(), dto);
        }

        return ResponseEntity.ok(Map.of("message", "Group invite accepted"));
    }

    @PostMapping("/api/chat/group/invites/{inviteId}/decline")
    public ResponseEntity<?> declineGroupInvite(Authentication authentication, @PathVariable Long inviteId) {
        User currentUser = userService.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        GroupInvite invite = groupInviteRepository.findById(inviteId)
                .orElseThrow(() -> new RuntimeException("Group invite not found"));

        if (!invite.getInvitee().getId().equals(currentUser.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Not authorized to decline this invite"));
        }

        invite.setStatus(GroupInvite.InviteStatus.DECLINED);
        groupInviteRepository.save(invite);

        return ResponseEntity.ok(Map.of("message", "Group invite declined"));
    }

    @GetMapping("/api/chat/group/{groupId}/members")
    public ResponseEntity<?> getGroupMembers(Authentication authentication, @PathVariable Long groupId) {
        User currentUser = userService.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        GroupChat groupChat = groupChatService.getGroupChat(groupId);

        if (!groupChatService.isUserMember(groupChat, currentUser)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Not a member of this group"));
        }

        List<GroupMember> members = groupChatService.getGroupMembers(groupChat);
        List<Map<String, Object>> result = members.stream().map(m -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", m.getUser().getId());
            map.put("username", m.getUser().getUsernameField());
            map.put("email", m.getUser().getEmail());
            map.put("role", m.getRole().name());
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(Map.of("members", result));
    }

    @DeleteMapping("/api/chat/group/{groupId}/members/{userId}")
    public ResponseEntity<?> removeGroupMember(
            Authentication authentication,
            @PathVariable Long groupId,
            @PathVariable Long userId) {

        User currentUser = userService.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        User memberToRemove = userService.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        GroupChat groupChat = groupChatService.getGroupChat(groupId);
        
        boolean isAdmin = groupChatService.isUserAdmin(groupChat, currentUser);
        boolean isSelf = currentUser.getId().equals(userId);

        if (!isAdmin && !isSelf) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Only group admins can remove members"));
        }

        boolean targetIsAdmin = groupChatService.isUserAdmin(groupChat, memberToRemove);
        if (targetIsAdmin) {
            return ResponseEntity.badRequest().body(Map.of("error", "Group admins cannot be removed from the group"));
        }

        try {
            groupChatService.removeMember(groupChat, memberToRemove);

            // Broadcast system message
            String content = isSelf 
                ? "SYSTEM_LEAVE|" + memberToRemove.getUsernameField() 
                : "SYSTEM_REMOVE|" + memberToRemove.getUsernameField() + "|" + currentUser.getUsernameField();
            Message message = messageService.sendGroupMessage(memberToRemove, groupChat, content);
            Map<String, Object> dto = buildMessageDto(message);
            messagingTemplate.convertAndSend("/topic/group/" + groupChat.getId(), dto);

            return ResponseEntity.ok(Map.of("message", "Member removed successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/api/chat/group/{groupId}")
    public ResponseEntity<?> deleteGroup(
            Authentication authentication,
            @PathVariable Long groupId) {

        User currentUser = userService.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        GroupChat groupChat = groupChatService.getGroupChat(groupId);

        if (!groupChatService.isUserAdmin(groupChat, currentUser)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Only group admins can delete the group"));
        }

        try {
            groupChatService.deleteGroupChat(groupChat);
            return ResponseEntity.ok(Map.of("message", "Group deleted successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/api/chat/upload")
    public ResponseEntity<?> uploadFile(
            Authentication authentication,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "File is empty"));
        }

        try {
            java.nio.file.Path uploadPath = java.nio.file.Paths.get("./uploads");
            if (!java.nio.file.Files.exists(uploadPath)) {
                java.nio.file.Files.createDirectories(uploadPath);
            }

            String originalFilename = file.getOriginalFilename();
            String extension = (originalFilename != null && originalFilename.contains("."))
                    ? originalFilename.substring(originalFilename.lastIndexOf("."))
                    : "";
            String filename = "file_" + System.currentTimeMillis() + extension;
            java.nio.file.Path filePath = uploadPath.resolve(filename);
            java.nio.file.Files.copy(file.getInputStream(), filePath, java.nio.file.StandardCopyOption.REPLACE_EXISTING);

            String fileUrl = "/uploads/" + filename;
            
            String type = "DOCUMENT";
            if (file.getContentType() != null) {
                if (file.getContentType().startsWith("image/")) type = "IMAGE";
                else if (file.getContentType().startsWith("video/")) type = "VIDEO";
            }

            return ResponseEntity.ok(Map.of(
                "url", fileUrl,
                "type", type,
                "originalName", originalFilename != null ? originalFilename : filename
            ));
        } catch (java.io.IOException e) {
            return ResponseEntity.status(500).body(Map.of("error", "Failed to upload file: " + e.getMessage()));
        }
    }

    @DeleteMapping("/api/chat/messages/{messageId}")
    public ResponseEntity<?> deleteMessage(Authentication authentication, @PathVariable Long messageId) {
        User currentUser = userService.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        try {
            Message deletedMsg = messageService.deleteMessage(messageId, currentUser);
            Map<String, Object> dto = buildMessageDto(deletedMsg);
            dto.put("deleted", true);

            if (deletedMsg.getChatRoom() != null) {
                User otherUser = deletedMsg.getChatRoom().getUser1().getId().equals(currentUser.getId())
                        ? deletedMsg.getChatRoom().getUser2()
                        : deletedMsg.getChatRoom().getUser1();
                messagingTemplate.convertAndSendToUser(otherUser.getEmail(), "/queue/messages", dto);
                messagingTemplate.convertAndSendToUser(currentUser.getEmail(), "/queue/messages", dto);
            } else if (deletedMsg.getGroupChat() != null) {
                messagingTemplate.convertAndSend("/topic/group/" + deletedMsg.getGroupChat().getId(), dto);
            }

            return ResponseEntity.ok(Map.of("message", "Message deleted successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        }
    }

    @PutMapping("/api/chat/messages/{messageId}")
    public ResponseEntity<?> updateMessage(
            Authentication authentication,
            @PathVariable Long messageId,
            @RequestBody Map<String, String> request) {
        User currentUser = userService.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        String newContent = request.get("content");
        if (newContent == null || newContent.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Message content cannot be empty"));
        }

        try {
            Message updatedMsg = messageService.updateMessage(messageId, currentUser, newContent);
            Map<String, Object> dto = buildMessageDto(updatedMsg);

            if (updatedMsg.getChatRoom() != null) {
                User otherUser = updatedMsg.getChatRoom().getUser1().getId().equals(currentUser.getId())
                        ? updatedMsg.getChatRoom().getUser2()
                        : updatedMsg.getChatRoom().getUser1();
                messagingTemplate.convertAndSendToUser(otherUser.getEmail(), "/queue/messages", dto);
                messagingTemplate.convertAndSendToUser(currentUser.getEmail(), "/queue/messages", dto);
            } else if (updatedMsg.getGroupChat() != null) {
                messagingTemplate.convertAndSend("/topic/group/" + updatedMsg.getGroupChat().getId(), dto);
            }

            return ResponseEntity.ok(dto);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────────

    private Map<String, Object> buildMessageDto(Message message) {
        Map<String, Object> dto = new HashMap<>();
        if (message == null) return dto;

        dto.put("id", message.getId());
        dto.put("content", message.getContent());
        dto.put("timestamp", message.getCreatedAt());
        dto.put("edited", message.isEdited());

        Map<String, Object> senderDto = new HashMap<>();
        if (message.getSender() != null) {
            senderDto.put("id", message.getSender().getId());
            senderDto.put("username", message.getSender().getUsernameField() != null ? message.getSender().getUsernameField() : "User");
            senderDto.put("profilePicture", message.getSender().getProfilePictureUrl());
        }
        dto.put("sender", senderDto);

        if (message.getChatRoom() != null) dto.put("chatRoomId", message.getChatRoom().getId());
        if (message.getGroupChat() != null) dto.put("groupChatId", message.getGroupChat().getId());

        return dto;
    }

    private Map<String, Object> buildMessagePage(Page<Message> page) {
        Map<String, Object> result = new HashMap<>();
        result.put("content", page.getContent().stream()
                .map(this::buildMessageDto)
                .collect(Collectors.toList()));
        result.put("totalPages", page.getTotalPages());
        result.put("last", page.isLast());
        result.put("number", page.getNumber());
        return result;
    }
}