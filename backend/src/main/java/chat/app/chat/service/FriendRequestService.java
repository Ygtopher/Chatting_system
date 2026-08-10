package chat.app.chat.service;

import chat.app.chat.model.FriendRequest;
import chat.app.chat.model.User;
import chat.app.chat.repository.FriendRequestRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class FriendRequestService {
    private final FriendRequestRepository friendRequestRepository;
    private static final Logger logger = LoggerFactory.getLogger(FriendRequestService.class);

    @Autowired
    public FriendRequestService(FriendRequestRepository friendRequestRepository) {
        this.friendRequestRepository = friendRequestRepository;
    }

    public FriendRequest sendFriendRequest(User sender, User receiver) {
        if (friendRequestRepository.existsBySenderAndReceiverAndStatus(sender, receiver, FriendRequest.FriendRequestStatus.PENDING)) {
            throw new RuntimeException("Friend request already sent");
        }

        if (friendRequestRepository.existsBySenderAndReceiverAndStatus(receiver, sender, FriendRequest.FriendRequestStatus.PENDING)) {
            throw new RuntimeException("Friend request already received from this user");
        }

        FriendRequest request = new FriendRequest();
        request.setSender(sender);
        request.setReceiver(receiver);
        request.setStatus(FriendRequest.FriendRequestStatus.PENDING);
        return friendRequestRepository.save(request);
    }

    public FriendRequest findById(Long requestId) {
        return friendRequestRepository.findById(requestId).orElse(null);
    }

    public void acceptFriendRequest(Long requestId, User receiver) {
        FriendRequest request = friendRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Friend request not found"));

        if (!request.getReceiver().getId().equals(receiver.getId())) {
            throw new RuntimeException("Not authorized to accept this request");
        }

        if (request.getStatus() != FriendRequest.FriendRequestStatus.PENDING) {
            throw new RuntimeException("Friend request is not pending");
        }

        request.setStatus(FriendRequest.FriendRequestStatus.ACCEPTED);
        friendRequestRepository.save(request);
    }

    public void declineFriendRequest(Long requestId, User receiver) {
        FriendRequest request = friendRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Friend request not found"));

        if (!request.getReceiver().getId().equals(receiver.getId())) {
            throw new RuntimeException("Not authorized to decline this request");
        }

        if (request.getStatus() != FriendRequest.FriendRequestStatus.PENDING) {
            throw new RuntimeException("Friend request is not pending");
        }

        request.setStatus(FriendRequest.FriendRequestStatus.DECLINED);
        friendRequestRepository.save(request);
    }

    public void cancelFriendRequest(Long requestId, User sender) {
        FriendRequest request = friendRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Friend request not found"));

        if (!request.getSender().getId().equals(sender.getId())) {
            throw new RuntimeException("Not authorized to cancel this request");
        }

        if (request.getStatus() != FriendRequest.FriendRequestStatus.PENDING) {
            throw new RuntimeException("Friend request is not pending");
        }

        friendRequestRepository.delete(request);
    }

    public List<FriendRequest> getPendingFriendRequests(User receiver) {
        return friendRequestRepository.findByReceiverAndStatus(receiver, FriendRequest.FriendRequestStatus.PENDING);
    }

    public List<FriendRequest> getSentFriendRequests(User sender) {
        return friendRequestRepository.findBySender(sender);
    }

    public List<FriendRequest> getReceivedFriendRequests(User receiver) {
        return friendRequestRepository.findByReceiver(receiver);
    }

    public boolean hasPendingRequest(User sender, User receiver) {
        return friendRequestRepository.existsBySenderAndReceiverAndStatus(
                sender, receiver, FriendRequest.FriendRequestStatus.PENDING);
    }

    public boolean areFriends(User user1, User user2) {
        return friendRequestRepository.existsBySenderAndReceiverAndStatus(
                user1, user2, FriendRequest.FriendRequestStatus.ACCEPTED) ||
               friendRequestRepository.existsBySenderAndReceiverAndStatus(
                user2, user1, FriendRequest.FriendRequestStatus.ACCEPTED);
    }

    public List<User> getFriends(User user) {
        logger.info("Getting friends list for user: {}", user.getEmail());
        List<FriendRequest> acceptedRequests = friendRequestRepository.findBySenderAndStatusOrReceiverAndStatus(
            user, FriendRequest.FriendRequestStatus.ACCEPTED, user, FriendRequest.FriendRequestStatus.ACCEPTED);
        
        List<User> friends = acceptedRequests.stream()
            .map(request -> {
                if (request.getSender().getId().equals(user.getId())) {
                    return request.getReceiver();
                } else {
                    return request.getSender();
                }
            })
            .collect(Collectors.toList());
        
        logger.info("Found {} friends for user {}", friends.size(), user.getEmail());
        return friends;
    }
} 