package chat.app.chat.repository;

import chat.app.chat.model.Message;
import chat.app.chat.model.ChatRoom;
import chat.app.chat.model.GroupChat;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {
    Page<Message> findByChatRoomOrderByCreatedAtDesc(ChatRoom chatRoom, Pageable pageable);
    Page<Message> findByGroupChatOrderByCreatedAtDesc(GroupChat groupChat, Pageable pageable);
    java.util.Optional<Message> findTopByChatRoomOrderByCreatedAtDesc(ChatRoom chatRoom);
    java.util.Optional<Message> findTopByGroupChatOrderByCreatedAtDesc(GroupChat groupChat);
    void deleteByChatRoom(ChatRoom chatRoom);
    void deleteByGroupChat(GroupChat groupChat);
} 