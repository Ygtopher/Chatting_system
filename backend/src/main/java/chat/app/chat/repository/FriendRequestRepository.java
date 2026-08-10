package chat.app.chat.repository;

import chat.app.chat.model.FriendRequest;
import chat.app.chat.model.User;
import chat.app.chat.model.FriendRequest.FriendRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface FriendRequestRepository extends JpaRepository<FriendRequest, Long> {
    List<FriendRequest> findBySender(User sender);
    List<FriendRequest> findByReceiver(User receiver);
    List<FriendRequest> findByReceiverAndStatus(User receiver, FriendRequestStatus status);
    List<FriendRequest> findBySenderAndStatus(User sender, FriendRequestStatus status);
    List<FriendRequest> findBySenderAndStatusOrReceiverAndStatus(
        User sender, FriendRequestStatus senderStatus,
        User receiver, FriendRequestStatus receiverStatus);
    Optional<FriendRequest> findBySenderAndReceiver(User sender, User receiver);
    boolean existsBySenderAndReceiverAndStatus(User sender, User receiver, FriendRequestStatus status);
} 