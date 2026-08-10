package chat.app.chat.service;

import chat.app.chat.model.GroupChat;
import chat.app.chat.model.GroupMember;
import chat.app.chat.model.User;
import chat.app.chat.repository.GroupChatRepository;
import chat.app.chat.repository.GroupMemberRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import chat.app.chat.repository.MessageRepository;

@Service
@Transactional
public class GroupChatService {
    private final GroupChatRepository groupChatRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final MessageRepository messageRepository;

    @Autowired
    public GroupChatService(GroupChatRepository groupChatRepository, GroupMemberRepository groupMemberRepository, MessageRepository messageRepository) {
        this.groupChatRepository = groupChatRepository;
        this.groupMemberRepository = groupMemberRepository;
        this.messageRepository = messageRepository;
    }

    public void deleteGroupChat(GroupChat groupChat) {
        messageRepository.deleteByGroupChat(groupChat);
        groupMemberRepository.deleteByGroupChat(groupChat);
        groupChatRepository.delete(groupChat);
    }

    public GroupChat createGroupChat(String name, User creator) {
        GroupChat groupChat = new GroupChat();
        groupChat.setName(name);
        groupChat.setCreatedBy(creator);
        groupChat = groupChatRepository.save(groupChat);

        // Add creator as admin
        GroupMember adminMember = new GroupMember();
        adminMember.setGroupChat(groupChat);
        adminMember.setUser(creator);
        adminMember.setRole(GroupMember.GroupRole.ADMIN);
        groupMemberRepository.save(adminMember);

        return groupChat;
    }

    public void addMember(GroupChat groupChat, User user, GroupMember.GroupRole role) {
        if (groupMemberRepository.existsByGroupChatAndUser(groupChat, user)) {
            throw new RuntimeException("User is already a member of this group");
        }

        GroupMember member = new GroupMember();
        member.setGroupChat(groupChat);
        member.setUser(user);
        member.setRole(role);
        groupMemberRepository.save(member);
    }

    public void removeMember(GroupChat groupChat, User user) {
        GroupMember member = groupMemberRepository.findByGroupChatAndUser(groupChat, user)
                .orElseThrow(() -> new RuntimeException("User is not a member of this group"));

        if (member.getRole() == GroupMember.GroupRole.ADMIN) {
            long adminCount = groupMemberRepository.findByGroupChatAndRole(groupChat, GroupMember.GroupRole.ADMIN).size();
            if (adminCount <= 1) {
                throw new RuntimeException("Cannot remove the last admin of the group");
            }
        }

        groupMemberRepository.delete(member);
    }

    public void updateMemberRole(GroupChat groupChat, User user, GroupMember.GroupRole newRole) {
        GroupMember member = groupMemberRepository.findByGroupChatAndUser(groupChat, user)
                .orElseThrow(() -> new RuntimeException("User is not a member of this group"));

        if (newRole == GroupMember.GroupRole.ADMIN) {
            member.setRole(GroupMember.GroupRole.ADMIN);
        } else {
            long adminCount = groupMemberRepository.findByGroupChatAndRole(groupChat, GroupMember.GroupRole.ADMIN).size();
            if (adminCount <= 1 && member.getRole() == GroupMember.GroupRole.ADMIN) {
                throw new RuntimeException("Cannot demote the last admin of the group");
            }
            member.setRole(GroupMember.GroupRole.MEMBER);
        }

        groupMemberRepository.save(member);
    }

    public List<GroupChat> searchGroups(String name) {
        return groupChatRepository.findByNameContainingIgnoreCase(name);
    }

    public List<GroupChat> getUserGroups(User user) {
        return groupMemberRepository.findByUser(user)
                .stream()
                .map(GroupMember::getGroupChat)
                .collect(java.util.stream.Collectors.toList());
    }

    public List<GroupMember> getGroupMembers(GroupChat groupChat) {
        return groupMemberRepository.findByGroupChat(groupChat);
    }

    public boolean isUserAdmin(GroupChat groupChat, User user) {
        return groupMemberRepository.findByGroupChatAndUser(groupChat, user)
                .map(member -> member.getRole() == GroupMember.GroupRole.ADMIN)
                .orElse(false);
    }

    public GroupChat getGroupChat(Long id) {
        return groupChatRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Group chat not found"));
    }

    public boolean isUserMember(GroupChat groupChat, User user) {
        return groupMemberRepository.existsByGroupChatAndUser(groupChat, user);
    }
} 