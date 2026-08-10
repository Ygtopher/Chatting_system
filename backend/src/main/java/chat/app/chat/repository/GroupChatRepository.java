package chat.app.chat.repository;

import chat.app.chat.model.GroupChat;
import chat.app.chat.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface GroupChatRepository extends JpaRepository<GroupChat, Long> {
    List<GroupChat> findByCreatedBy(User user);
    List<GroupChat> findByNameContainingIgnoreCase(String name);
} 