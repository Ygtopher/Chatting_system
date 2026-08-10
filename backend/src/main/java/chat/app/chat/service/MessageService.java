package chat.app.chat.service;

import chat.app.chat.model.Message;
import chat.app.chat.model.ChatRoom;
import chat.app.chat.model.GroupChat;
import chat.app.chat.model.User;
import chat.app.chat.repository.MessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@Transactional
public class MessageService {
    private final MessageRepository messageRepository;

    @Autowired
    public MessageService(MessageRepository messageRepository) {
        this.messageRepository = messageRepository;
    }

    public Message sendDirectMessage(User sender, ChatRoom chatRoom, String content) {
        Message message = new Message();
        message.setSender(sender);
        message.setChatRoom(chatRoom);
        message.setContent(content);
        return messageRepository.save(message);
    }

    public Message sendGroupMessage(User sender, GroupChat groupChat, String content) {
        Message message = new Message();
        message.setSender(sender);
        message.setGroupChat(groupChat);
        message.setContent(content);
        return messageRepository.save(message);
    }

    public Page<Message> getChatRoomMessages(ChatRoom chatRoom, Pageable pageable) {
        return messageRepository.findByChatRoomOrderByCreatedAtDesc(chatRoom, pageable);
    }

    public Page<Message> getGroupChatMessages(GroupChat groupChat, Pageable pageable) {
        return messageRepository.findByGroupChatOrderByCreatedAtDesc(groupChat, pageable);
    }

    public Message deleteMessage(Long messageId, User user) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));

        if (!message.getSender().getId().equals(user.getId())) {
            throw new RuntimeException("Not authorized to delete this message");
        }

        messageRepository.delete(message);
        return message;
    }

    public Message updateMessage(Long messageId, User user, String newContent) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));

        if (!message.getSender().getId().equals(user.getId())) {
            throw new RuntimeException("Not authorized to edit this message");
        }

        if (message.getCreatedAt() != null &&
                java.time.Duration.between(message.getCreatedAt(), LocalDateTime.now()).getSeconds() > 60) {
            throw new RuntimeException("Message can only be edited within 1 minute of sending");
        }

        message.setContent(newContent);
        message.setEdited(true);
        return messageRepository.save(message);
    }

    public void deleteChatRoomMessages(ChatRoom chatRoom) {
        messageRepository.deleteByChatRoom(chatRoom);
    }

    public void deleteGroupChatMessages(GroupChat groupChat) {
        messageRepository.deleteByGroupChat(groupChat);
    }
} 