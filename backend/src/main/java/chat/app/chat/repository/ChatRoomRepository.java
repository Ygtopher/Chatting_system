package chat.app.chat.repository;

import chat.app.chat.model.ChatRoom;
import chat.app.chat.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {
    Optional<ChatRoom> findByUser1AndUser2(User user1, User user2);
    Optional<ChatRoom> findByUser2AndUser1(User user1, User user2);
    boolean existsByUser1AndUser2(User user1, User user2);
    boolean existsByUser2AndUser1(User user1, User user2);
    List<ChatRoom> findByUser1OrUser2(User user1, User user2);
}