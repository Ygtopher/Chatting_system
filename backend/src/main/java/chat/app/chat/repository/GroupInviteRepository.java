package chat.app.chat.repository;

import chat.app.chat.model.GroupChat;
import chat.app.chat.model.GroupInvite;
import chat.app.chat.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GroupInviteRepository extends JpaRepository<GroupInvite, Long> {
    List<GroupInvite> findByInviteeAndStatus(User invitee, GroupInvite.InviteStatus status);
    boolean existsByGroupChatAndInviteeAndStatus(GroupChat groupChat, User invitee, GroupInvite.InviteStatus status);
    Optional<GroupInvite> findByGroupChatAndInviteeAndStatus(GroupChat groupChat, User invitee, GroupInvite.InviteStatus status);
}
