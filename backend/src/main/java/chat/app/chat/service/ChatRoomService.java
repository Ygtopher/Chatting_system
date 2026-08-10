package chat.app.chat.service;

import chat.app.chat.model.ChatRoom;
import chat.app.chat.model.User;
import chat.app.chat.repository.ChatRoomRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ChatRoomService {
    private final ChatRoomRepository chatRoomRepository;

    @Autowired
    public ChatRoomService(ChatRoomRepository chatRoomRepository) {
        this.chatRoomRepository = chatRoomRepository;
    }

    public ChatRoom getOrCreateChatRoom(User user1, User user2) {
        // Check if chat room already exists in either direction
        return chatRoomRepository.findByUser1AndUser2(user1, user2)
                .orElseGet(() -> chatRoomRepository.findByUser2AndUser1(user1, user2)
                        .orElseGet(() -> createChatRoom(user1, user2)));
    }

    private ChatRoom createChatRoom(User user1, User user2) {
        ChatRoom chatRoom = new ChatRoom();
        chatRoom.setUser1(user1);
        chatRoom.setUser2(user2);
        return chatRoomRepository.save(chatRoom);
    }

    public boolean existsChatRoom(User user1, User user2) {
        return chatRoomRepository.existsByUser1AndUser2(user1, user2) ||
               chatRoomRepository.existsByUser2AndUser1(user1, user2);
    }

    public ChatRoom getChatRoom(Long chatRoomId) {
        return chatRoomRepository.findById(chatRoomId)
                .orElseThrow(() -> new RuntimeException("Chat room not found"));
    }

    public boolean hasAccess(ChatRoom chatRoom, User user) {
        if (chatRoom == null || user == null) return false;
        return (chatRoom.getUser1() != null && chatRoom.getUser1().getId().equals(user.getId())) ||
               (chatRoom.getUser2() != null && chatRoom.getUser2().getId().equals(user.getId()));
    }
} 