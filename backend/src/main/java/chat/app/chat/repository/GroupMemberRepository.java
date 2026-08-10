package chat.app.chat.repository;

import chat.app.chat.model.GroupMember;
import chat.app.chat.model.GroupChat;
import chat.app.chat.model.User;
import chat.app.chat.model.GroupMember.GroupRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface GroupMemberRepository extends JpaRepository<GroupMember, Long> {
    List<GroupMember> findByGroupChat(GroupChat groupChat);
    List<GroupMember> findByUser(User user);
    Optional<GroupMember> findByGroupChatAndUser(GroupChat groupChat, User user);
    List<GroupMember> findByGroupChatAndRole(GroupChat groupChat, GroupRole role);
    boolean existsByGroupChatAndUser(GroupChat groupChat, User user);
    void deleteByGroupChat(GroupChat groupChat);
} 