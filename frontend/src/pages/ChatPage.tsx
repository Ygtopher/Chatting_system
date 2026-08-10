import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { friendsApi, groupApi, chatApi } from '../services/api';
import { 
  PaperAirplaneIcon, 
  PaperClipIcon,
  EllipsisVerticalIcon, 
  TrashIcon, 
  ArrowLeftIcon,
  PencilIcon,
  PlusIcon,
  UserGroupIcon,
  UserIcon,
  UserPlusIcon,
  CheckIcon,
  UsersIcon,
  UserMinusIcon,
  ArrowLeftOnRectangleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import type { Message, User } from '../types';

interface GroupMemberDto {
  id: number;
  username: string;
  email: string;
  profilePicture: string | null;
  role: 'ADMIN' | 'MEMBER';
}

export const ChatPage = () => {
  const { 
    chatRooms, 
    groupChats,
    selectedChat, 
    selectChat, 
    messages, 
    sendMessage, 
    deleteMessage,
    updateMessage,
    createGroup,
    deleteGroup,
    addGroupMember,
    removeGroupMember,
    getGroupMembers,
    fetchMoreMessages, 
    loadingMessages, 
    fetchChatRooms,
    fetchGroupChats
  } = useChat();
  const { user } = useAuth();
  const location = useLocation();
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChat) return;

    setIsUploadingAttachment(true);
    try {
      const response = await chatApi.uploadChatFile(file);
      const { url, type, originalName } = response.data;
      
      const content = `FILE_ATTACHMENT|${type}|${url}|${originalName}`;
      
      await sendMessage(content);
    } catch (error) {
      alert('Failed to upload file. Make sure it is under 150MB.');
    } finally {
      setIsUploadingAttachment(false);
      if (attachmentInputRef.current) attachmentInputRef.current.value = '';
    }
  };

  const [showDropdown, setShowDropdown] = useState<number | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [processedInvites, setProcessedInvites] = useState<Record<number, 'ACCEPTED' | 'DECLINED' | 'INVALID'>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Group creation state
  const [activeTab, setActiveTab] = useState<'direct' | 'groups'>('direct');
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  // Add Friends to Group state
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [friendsList, setFriendsList] = useState<User[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [addedMemberIds, setAddedMemberIds] = useState<number[]>([]);
  const [addingMemberId, setAddingMemberId] = useState<number | null>(null);

  // Manage Group Members state
  const [isManageMembersOpen, setIsManageMembersOpen] = useState(false);
  const [groupMembers, setGroupMembers] = useState<GroupMemberDto[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Confirmation Popout Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText: string;
    icon: 'danger' | 'warning';
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    confirmText: '',
    icon: 'danger',
    action: async () => {},
  });
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);

  // Auto-select chat room if navigated from Friends page with chatRoomId
  useEffect(() => {
    const targetId = location.state?.chatRoomId;
    if (!targetId) return;

    let isMounted = true;
    const findAndSelect = async () => {
      let rooms = chatRooms;
      if (rooms.length === 0) {
        try {
          await fetchChatRooms();
          return;
        } catch (err) {
          console.error('Error fetching chat rooms:', err);
        }
      }
      if (!isMounted) return;
      const room = rooms.find(r => r.id === targetId);
      if (room && selectedChat?.id !== room.id) {
        selectChat(room);
        setActiveTab('direct');
      }
    };

    findAndSelect();

    return () => {
      isMounted = false;
    };
  }, [location.state?.chatRoomId, chatRooms, fetchChatRooms, selectChat, selectedChat?.id]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (container && container.scrollTop === 0 && !loadingMessages) {
      fetchMoreMessages();
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedChat) return;

    setIsSending(true);
    try {
      await sendMessage(messageInput);
      setMessageInput('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleCreateGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    setIsCreatingGroup(true);
    try {
      await createGroup(newGroupName.trim());
      setNewGroupName('');
      setIsCreateGroupOpen(false);
      setActiveTab('groups');
    } catch (error) {
      console.error('Failed to create group:', error);
      alert('Failed to create group. Please try again.');
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const handleOpenAddMembersModal = async () => {
    if (!selectedChat || !('name' in selectedChat)) return;
    setIsAddMemberOpen(true);
    setLoadingFriends(true);
    try {
      const [friendsRes, membersRes] = await Promise.all([
        friendsApi.getList(),
        getGroupMembers(selectedChat.id),
      ]);
      setFriendsList(friendsRes.data.friends || []);
      setGroupMembers(membersRes || []);
    } catch (err) {
      console.error('Failed to load friends or group members:', err);
    } finally {
      setLoadingFriends(false);
    }
  };

  const handleOpenManageMembersModal = async () => {
    if (!selectedChat || !('name' in selectedChat)) return;
    setIsManageMembersOpen(true);
    setLoadingMembers(true);
    try {
      const members = await getGroupMembers(selectedChat.id);
      setGroupMembers(members);
    } catch (err) {
      console.error('Failed to load group members:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleAddFriendToGroup = async (friendId: number) => {
    if (!selectedChat || !('name' in selectedChat)) return;
    setAddingMemberId(friendId);
    try {
      await addGroupMember(selectedChat.id, friendId);
      setAddedMemberIds(prev => [...prev, friendId]);
    } catch (error: any) {
      const errMsg = error?.response?.data?.error || error?.response?.data || 'Failed to add member.';
      alert(errMsg);
    } finally {
      setAddingMemberId(null);
    }
  };

  const promptRemoveMember = (memberId: number, memberUsername: string, role: string) => {
    if (!selectedChat || !('name' in selectedChat)) return;
    if (role === 'ADMIN') {
      alert('Group admins cannot be removed from the group.');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Remove Group Member',
      description: `Are you sure you want to remove "${memberUsername}" from "${selectedChat.name}"?`,
      confirmText: 'Remove Member',
      icon: 'warning',
      action: async () => {
        await removeGroupMember(selectedChat.id, memberId);
        setGroupMembers(prev => prev.filter(m => m.id !== memberId));
      },
    });
  };

  const promptLeaveGroup = () => {
    if (!selectedChat || !('name' in selectedChat) || !user) return;
    setConfirmModal({
      isOpen: true,
      title: 'Leave Group',
      description: `Are you sure you want to leave "${selectedChat.name}"? You will no longer receive or view messages in this group.`,
      confirmText: 'Leave Group',
      icon: 'danger',
      action: async () => {
        await removeGroupMember(selectedChat.id, user.id);
        setIsManageMembersOpen(false);
      },
    });
  };

  const promptDeleteGroup = () => {
    if (!selectedChat || !('name' in selectedChat)) return;
    setConfirmModal({
      isOpen: true,
      title: 'Delete Group Chat',
      description: `Are you sure you want to permanently delete "${selectedChat.name}"? All chat history, messages, and members will be deleted for everyone. This action cannot be undone.`,
      confirmText: 'Delete Group',
      icon: 'danger',
      action: async () => {
        await deleteGroup(selectedChat.id);
        setIsManageMembersOpen(false);
      },
    });
  };

  const toggleDropdown = (messageId: number) => {
    setShowDropdown(prev => (prev === messageId ? null : messageId));
  };

  const handleDeleteMessage = async (messageId: number) => {
    try {
      await deleteMessage(messageId);
    } catch (error) {
      console.error('Failed to delete message:', error);
    } finally {
      setShowDropdown(null);
    }
  };

  const canEditMessage = (timestamp: string) => {
    if (!timestamp) return false;
    const sentTime = new Date(timestamp).getTime();
    if (isNaN(sentTime)) return false;
    const now = Date.now();
    return (now - sentTime) <= 60000; // 1 minute limit (60,000 ms)
  };

  const handleStartEdit = (msg: Message) => {
    setEditingMessageId(msg.id);
    setEditContent(msg.content);
    setShowDropdown(null);
  };

  const handleSaveEdit = async (messageId: number) => {
    if (!editContent.trim()) return;
    try {
      await updateMessage(messageId, editContent.trim());
      setEditingMessageId(null);
      setEditContent('');
    } catch (error: any) {
      alert(error?.response?.data?.error || 'Message can only be edited within 1 minute of sending.');
    }
  };

  const formatTime = (timestamp: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col relative">
      <div className="flex h-full">
        {/* Chat list sidebar */}
        <div className={`w-full md:w-1/4 bg-white border-r border-gray-200 flex flex-col ${selectedChat ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800">Conversations</h2>
            <button
              type="button"
              onClick={() => setIsCreateGroupOpen(true)}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition"
              title="Create a new group"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              New Group
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-gray-200 bg-gray-50">
            <button
              onClick={() => setActiveTab('direct')}
              className={`flex-1 py-2 text-xs font-semibold text-center border-b-2 flex items-center justify-center gap-1.5 transition ${
                activeTab === 'direct'
                  ? 'border-blue-600 text-blue-600 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              Direct ({chatRooms.length})
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`flex-1 py-2 text-xs font-semibold text-center border-b-2 flex items-center justify-center gap-1.5 transition ${
                activeTab === 'groups'
                  ? 'border-blue-600 text-blue-600 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <UserGroupIcon className="w-3.5 h-3.5" />
              Groups ({groupChats.length})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {activeTab === 'direct' ? (
              chatRooms.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No active direct chats. Start a chat from Friends page!
                </div>
              ) : (
                chatRooms.map((room) => (
                  <div
                    key={`room-${room.id}`}
                    className={`p-4 cursor-pointer hover:bg-gray-50 ${selectedChat?.id === room.id && 'otherUser' in selectedChat ? 'bg-blue-50' : ''}`}
                    onClick={() => selectChat(room)}
                  >
                    <div className="flex items-center">
                      <img
                        src={room.otherUser.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(room.otherUser.username)}`}
                        alt={room.otherUser.username}
                        className="w-10 h-10 rounded-full border border-gray-200 object-cover bg-gray-50"
                        onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(room.otherUser.username)}`; }}
                      />
                      <div className="ml-3 flex-1">
                        <div className="flex justify-between">
                          <p className="font-medium text-sm text-gray-900">{room.otherUser.username}</p>
                          {room.lastMessage && (
                            <p className="text-xs text-gray-500">
                              {formatTime(room.lastMessage.timestamp)}
                            </p>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {room.lastMessage ? room.lastMessage.content : 'Start conversation...'}
                        </p>
                      </div>
                      {room.unreadCount > 0 && (
                        <span className="ml-2 bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          {room.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )
            ) : (
              groupChats.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No group chats yet. Click "+ New Group" above to create one!
                </div>
              ) : (
                groupChats.map((group) => (
                  <div
                    key={`group-${group.id}`}
                    className={`p-4 cursor-pointer hover:bg-gray-50 ${selectedChat?.id === group.id && 'name' in selectedChat ? 'bg-blue-50' : ''}`}
                    onClick={() => selectChat(group)}
                  >
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">
                        <UserGroupIcon className="w-5 h-5" />
                      </div>
                      <div className="ml-3 flex-1">
                        <div className="flex justify-between">
                          <p className="font-medium text-sm text-gray-900">{group.name}</p>
                          {group.lastMessage && (
                            <p className="text-xs text-gray-500">
                              {formatTime(group.lastMessage.timestamp)}
                            </p>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {group.lastMessage ? group.lastMessage.content : 'Start conversation...'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        </div>

        {/* Selected chat area */}
        <div className={`w-full md:w-3/4 flex flex-col ${selectedChat ? 'block' : 'hidden md:flex'}`}>
          {selectedChat ? (
            <>
              {/* Chat header */}
              <div className="p-4 bg-white border-b border-gray-200 flex justify-between items-center shadow-sm">
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => selectChat(null)}
                    className="p-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition"
                    title="Back to conversations list"
                  >
                    <ArrowLeftIcon className="w-5 h-5" />
                  </button>
                  {'otherUser' in selectedChat ? (
                    <img
                      src={selectedChat.otherUser.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedChat.otherUser.username)}`}
                      alt={selectedChat.otherUser.username}
                      className="w-10 h-10 rounded-full border border-gray-200 object-cover bg-gray-50"
                      onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedChat.otherUser.username)}`; }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-purple-600 shadow-sm border border-purple-200">
                      {selectedChat.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      {'otherUser' in selectedChat ? selectedChat.otherUser.username : selectedChat.name}
                    </h2>
                    {'name' in selectedChat && (
                      <span className="text-[11px] text-purple-600 font-medium flex items-center gap-1">
                        <UserGroupIcon className="w-3 h-3 inline" /> Group Chat
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {'name' in selectedChat && (
                    <>
                      <button
                        type="button"
                        onClick={handleOpenManageMembersModal}
                        className="text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition font-semibold flex items-center gap-1 border border-gray-200"
                        title="View group members"
                      >
                        <UsersIcon className="w-4 h-4" />
                        Members
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenAddMembersModal}
                        className="text-xs bg-purple-50 text-purple-700 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition font-semibold flex items-center gap-1 border border-purple-200"
                        title="Add friends to this group"
                      >
                        <UserPlusIcon className="w-4 h-4" />
                        Add Friends
                      </button>
                      {selectedChat.isAdmin ? (
                        <button
                          type="button"
                          onClick={promptDeleteGroup}
                          className="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg transition font-semibold flex items-center gap-1 border border-red-200"
                          title="Delete entire group"
                        >
                          <TrashIcon className="w-4 h-4" />
                          Delete Group
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={promptLeaveGroup}
                          className="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg transition font-semibold flex items-center gap-1 border border-red-200"
                          title="Leave this group"
                        >
                          <ArrowLeftOnRectangleIcon className="w-4 h-4" />
                          Leave Group
                        </button>
                      )}
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => selectChat(null)}
                    className="text-xs text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition font-medium"
                  >
                    Close Chat
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div 
                className="flex-1 p-4 overflow-y-auto bg-gray-50"
                ref={messagesContainerRef}
                onScroll={handleScroll}
              >
                {loadingMessages && (
                  <div className="text-center py-4">
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
                    <span className="ml-2 text-sm text-gray-500">Loading messages...</span>
                  </div>
                )}

                {!loadingMessages && messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 mb-3 text-xl">
                      💬
                    </div>
                    <p className="text-sm font-medium text-gray-600">No messages yet</p>
                    <p className="text-xs text-gray-400 mt-1">Type a message below to start the conversation!</p>
                  </div>
                )}
                
                <div className="space-y-4">
                  {messages.map((message, index) => {
                    const isSystemLeave = message.content.startsWith('SYSTEM_LEAVE|');
                    const isSystemRemove = message.content.startsWith('SYSTEM_REMOVE|');
                    const isSystemJoin = message.content.startsWith('SYSTEM_JOIN|');
                    
                    if (isSystemLeave || isSystemRemove || isSystemJoin) {
                      const parts = message.content.split('|');
                      const targetUser = parts[1];
                      let msgText = '';
                      if (isSystemLeave) msgText = `${targetUser} left the group.`;
                      else if (isSystemRemove) msgText = `${targetUser} was removed from the group by ${parts[2] || 'an admin'}.`;
                      else if (isSystemJoin) msgText = `${targetUser} joined the group.`;
                        
                      return (
                        <div key={message.id ? `msg-${message.id}-${index}` : `idx-${index}`} className="flex justify-center my-2 w-full">
                          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full text-center border border-gray-200 shadow-sm">
                            {msgText}
                          </span>
                        </div>
                      );
                    }

                    const isMyMessage = Number(message.sender?.id) === Number(user?.id);
                    return (
                      <div 
                        key={message.id ? `msg-${message.id}-${index}` : `idx-${index}`}
                        className={`flex gap-2 w-full ${isMyMessage ? 'justify-end pl-12' : 'justify-start pr-12'}`}
                      >
                        {!isMyMessage && (
                          <img
                            src={message.sender?.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(message.sender?.username || 'User')}`}
                            alt={message.sender?.username || 'User'}
                            className="w-8 h-8 rounded-full border border-gray-200 object-cover bg-gray-50 self-end mb-1 shrink-0 shadow-sm"
                            onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(message.sender?.username || 'User')}`; }}
                          />
                        )}
                        <div 
                          className={`relative max-w-full sm:max-w-md px-4 py-2.5 shadow-sm rounded-2xl ${
                            isMyMessage 
                              ? 'bg-blue-600 text-white rounded-br-sm' 
                              : 'bg-white text-gray-900 border border-gray-100 rounded-bl-sm'
                          }`}
                        >
                          {!isMyMessage && 'name' in selectedChat && (
                            <p className="text-[11px] font-bold text-purple-600 mb-0.5">
                              {message.sender?.username || 'Member'}
                            </p>
                          )}
                          <div className="flex justify-between items-start">
                            {editingMessageId === message.id ? (
                              <div className="flex flex-col gap-2 w-full min-w-[200px]">
                                <input
                                  type="text"
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  className="px-2 py-1 text-sm text-gray-900 rounded border border-blue-300 focus:outline-none"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveEdit(message.id);
                                    if (e.key === 'Escape') setEditingMessageId(null);
                                  }}
                                />
                                <div className="flex justify-end space-x-2">
                                  <button
                                    type="button"
                                    onClick={() => setEditingMessageId(null)}
                                    className="text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded hover:bg-gray-300"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEdit(message.id)}
                                    className="text-xs bg-blue-800 text-white px-2 py-1 rounded font-bold hover:bg-blue-900"
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            ) : (() => {
                              const isFileAttachment = message.content.startsWith('FILE_ATTACHMENT|');
                              if (isFileAttachment) {
                                const parts = message.content.split('|');
                                const type = parts[1];
                                const url = parts[2];
                                const originalName = parts.slice(3).join('|') || 'Attachment';
                                
                                return (
                                  <div className="flex flex-col gap-1 mt-1 mb-1">
                                    {type === 'IMAGE' && (
                                      <img src={url} alt={originalName} className="max-w-full sm:max-w-[250px] rounded-lg object-contain cursor-pointer hover:opacity-90 transition border border-black/10" onClick={() => window.open(url, '_blank')} />
                                    )}
                                    {type === 'VIDEO' && (
                                      <video src={url} controls className="max-w-full sm:max-w-[250px] rounded-lg border border-black/10" />
                                    )}
                                    {type === 'DOCUMENT' && (
                                      <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-black/10 hover:bg-black/20 p-3 rounded-lg transition no-underline text-inherit shadow-sm min-w-[200px]">
                                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm text-blue-600">
                                          <PaperClipIcon className="w-5 h-5" />
                                        </div>
                                        <div className="flex flex-col overflow-hidden max-w-[150px]">
                                          <span className="font-semibold text-sm truncate">{originalName}</span>
                                          <span className="text-[10px] opacity-70">Click to download</span>
                                        </div>
                                      </a>
                                    )}
                                  </div>
                                );
                              }

                              const isGroupInvite = message.content.startsWith('GROUP_INVITE|');
                              if (isGroupInvite) {
                                const parts = message.content.split('|');
                                const inviteId = parseInt(parts[1]);
                                const inviteGroupId = parseInt(parts[2]);
                                const groupName = parts[3] || 'a group';

                                const isAlreadyMember = groupChats.some(g => g.id === inviteGroupId);
                                const status = processedInvites[inviteId] || (isAlreadyMember ? 'ACCEPTED' : undefined);

                                return (
                                  <div className="flex-1 flex flex-col gap-2 p-1">
                                    <p className="text-sm font-semibold">
                                      {isMyMessage 
                                        ? `You sent an invitation to join ${groupName}.` 
                                        : `Invited you to join ${groupName}!`}
                                    </p>
                                    {!isMyMessage && (
                                      <>
                                        {status === 'ACCEPTED' ? (
                                          <p className="text-xs text-green-600 italic font-semibold mt-1">You joined this group.</p>
                                        ) : status === 'DECLINED' ? (
                                          <p className="text-xs text-gray-500 italic font-semibold mt-1">You declined this invitation.</p>
                                        ) : status === 'INVALID' ? (
                                          <p className="text-xs text-gray-400 italic font-semibold mt-1">This invitation is no longer active.</p>
                                        ) : (
                                          <div className="grid grid-cols-2 gap-2 mt-1">
                                            <button
                                              type="button"
                                              onClick={async () => {
                                                try {
                                                  await groupApi.acceptInvite(inviteId);
                                                  setProcessedInvites(prev => ({ ...prev, [inviteId]: 'ACCEPTED' }));
                                                  setSuccessMessage(`Successfully joined ${groupName}!`);
                                                  setTimeout(() => setSuccessMessage(null), 4000);
                                                  fetchGroupChats();
                                                } catch (error: any) {
                                                  const errMsg = error?.response?.data?.error;
                                                  if (errMsg === 'Invite is no longer pending') {
                                                    setProcessedInvites(prev => ({ ...prev, [inviteId]: 'INVALID' }));
                                                  } else {
                                                    alert(errMsg || 'Failed to accept invite.');
                                                  }
                                                }
                                              }}
                                              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-1.5 px-3 rounded shadow transition-all text-center w-full"
                                            >
                                              Join Group
                                            </button>
                                            <button
                                              type="button"
                                              onClick={async () => {
                                                try {
                                                  await groupApi.declineInvite(inviteId);
                                                  setProcessedInvites(prev => ({ ...prev, [inviteId]: 'DECLINED' }));
                                                } catch (error: any) {
                                                  const errMsg = error?.response?.data?.error;
                                                  if (errMsg === 'Invite is no longer pending') {
                                                    setProcessedInvites(prev => ({ ...prev, [inviteId]: 'INVALID' }));
                                                  } else {
                                                    alert(errMsg || 'Failed to decline invite.');
                                                  }
                                                }
                                              }}
                                              className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-1.5 px-3 rounded shadow transition-all text-center border border-gray-200 w-full"
                                            >
                                              Decline
                                            </button>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                );
                              }
                              return (
                                <div className="flex-1">
                                  <p className="break-words">{message.content}</p>
                                  {message.edited && (
                                    <span className={`text-[10px] italic ml-1 ${isMyMessage ? 'text-blue-200' : 'text-gray-400'}`}>
                                      (edited)
                                    </span>
                                  )}
                                </div>
                              );
                            })()}

                            {isMyMessage && editingMessageId !== message.id && (
                              <div className="relative ml-2">
                                <button 
                                  onClick={() => toggleDropdown(message.id)}
                                  className="text-white p-1 rounded-full hover:bg-blue-600"
                                  title="Options"
                                >
                                  <EllipsisVerticalIcon className="w-4 h-4" />
                                </button>
                                
                                {showDropdown === message.id && (
                                  <div className="absolute right-0 mt-1 w-36 bg-white rounded-md shadow-lg z-10 py-1 border border-gray-200">
                                    {canEditMessage(message.timestamp) && (
                                      <button 
                                        className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 flex items-center font-medium"
                                        onClick={() => handleStartEdit(message)}
                                      >
                                        <PencilIcon className="w-3.5 h-3.5 mr-2 text-blue-600" />
                                        Edit (within 1m)
                                      </button>
                                    )}
                                    <button 
                                      className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-gray-100 flex items-center font-medium"
                                      onClick={() => handleDeleteMessage(message.id)}
                                    >
                                      <TrashIcon className="w-3.5 h-3.5 mr-2" />
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <p className={`text-xs mt-1 ${isMyMessage ? 'text-blue-200' : 'text-gray-500'}`}>
                            {formatTime(message.timestamp)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Message input */}
              <div className="bg-white p-4 border-t border-gray-200">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <input
                    type="file"
                    className="hidden"
                    ref={attachmentInputRef}
                    onChange={handleAttachmentUpload}
                    accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                  />
                  <button
                    type="button"
                    onClick={() => attachmentInputRef.current?.click()}
                    disabled={isUploadingAttachment || isSending}
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-full transition shrink-0"
                    title="Attach file"
                  >
                    <PaperClipIcon className="w-6 h-6" />
                  </button>
                  <input
                    type="text"
                    placeholder={isUploadingAttachment ? "Uploading..." : "Type a message..."}
                    className="input flex-1"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    disabled={isSending || isUploadingAttachment}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary p-2"
                    disabled={isSending || !messageInput.trim()}
                  >
                    <PaperAirplaneIcon className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-600">Select a conversation</h2>
                <p className="text-gray-500 mt-2">Choose a chat from the sidebar to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Group Modal */}
      {isCreateGroupOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <UserGroupIcon className="w-5 h-5 text-blue-600" />
                Create New Group Chat
              </h3>
              <button 
                onClick={() => setIsCreateGroupOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateGroupSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                <input
                  type="text"
                  placeholder="e.g. Study Group, Project Team"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsCreateGroupOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition"
                  disabled={isCreatingGroup}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md font-bold transition disabled:opacity-50"
                  disabled={isCreatingGroup || !newGroupName.trim()}
                >
                  {isCreatingGroup ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Friends to Group Modal */}
      {isAddMemberOpen && selectedChat && 'name' in selectedChat && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <UserPlusIcon className="w-5 h-5 text-purple-600" />
                  Add Friends to Group
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Group: <span className="font-semibold text-gray-800">{selectedChat.name}</span></p>
              </div>
              <button 
                onClick={() => setIsAddMemberOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-100 pr-1">
              {loadingFriends ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-purple-600"></div>
                  <p className="text-xs text-gray-500 mt-2">Loading friends list...</p>
                </div>
              ) : (() => {
                const availableFriends = friendsList.filter(friend => !groupMembers.some(m => Number(m.id) === Number(friend.id)));
                
                if (friendsList.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      You don't have any friends yet. Go to Friends page to send friend requests!
                    </div>
                  );
                }

                if (availableFriends.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      All of your friends are already members of this group!
                    </div>
                  );
                }

                return availableFriends.map((friend) => {
                  const isAdded = addedMemberIds.includes(friend.id);
                  const isAdding = addingMemberId === friend.id;

                  return (
                    <div key={friend.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold text-sm">
                          {friend.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{friend.username}</p>
                          <p className="text-xs text-gray-500">{friend.email}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddFriendToGroup(friend.id)}
                        disabled={isAdded || isAdding}
                        className={`text-xs px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 ${
                          isAdded
                            ? 'bg-purple-100 text-purple-700 border border-purple-200'
                            : 'bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <CheckIcon className="w-3.5 h-3.5" />
                            Invited
                          </>
                        ) : isAdding ? (
                          'Inviting...'
                        ) : (
                          <>
                            <UserPlusIcon className="w-3.5 h-3.5" />
                            Send Invite
                          </>
                        )}
                      </button>
                    </div>
                  );
                });
              })()}
            </div>

            <div className="pt-4 border-t border-gray-100 mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsAddMemberOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Group Members Modal */}
      {isManageMembersOpen && selectedChat && 'name' in selectedChat && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <UsersIcon className="w-5 h-5 text-gray-700" />
                  Group Members ({groupMembers.length})
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Group: <span className="font-semibold text-gray-800">{selectedChat.name}</span></p>
              </div>
              <button 
                onClick={() => setIsManageMembersOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-100 pr-1">
              {loadingMembers ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-gray-600"></div>
                  <p className="text-xs text-gray-500 mt-2">Loading group members...</p>
                </div>
              ) : groupMembers.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No members found in this group.
                </div>
              ) : (
                groupMembers.map((member) => {
                  const isSelf = Number(member.id) === Number(user?.id);
                  const isAdminRole = member.role === 'ADMIN';

                  return (
                    <div key={member.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 bg-gray-100 text-gray-700 rounded-full flex items-center justify-center font-bold text-sm">
                          {member.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900">{member.username}</p>
                            {isAdminRole && (
                              <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.5 rounded">
                                Admin
                              </span>
                            )}
                            {isSelf && (
                              <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">{member.email}</p>
                        </div>
                      </div>

                      {isSelf && !isAdminRole && (
                        <button
                          type="button"
                          onClick={promptLeaveGroup}
                          className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-2.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1 border border-red-200"
                          title="Leave this group"
                        >
                          <ArrowLeftOnRectangleIcon className="w-3.5 h-3.5" />
                          Leave
                        </button>
                      )}

                      {!isSelf && !isAdminRole && selectedChat.isAdmin && (
                        <button
                          type="button"
                          onClick={() => promptRemoveMember(member.id, member.username, member.role)}
                          className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-2.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1 border border-red-200"
                          title="Remove member from group"
                        >
                          <UserMinusIcon className="w-3.5 h-3.5" />
                          Remove
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-4 border-t border-gray-100 mt-2 flex justify-between items-center">
              {selectedChat.isAdmin ? (
                <button
                  type="button"
                  onClick={promptDeleteGroup}
                  className="text-xs text-red-600 hover:text-red-800 font-bold flex items-center gap-1 transition"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                  Delete Group
                </button>
              ) : (
                <button
                  type="button"
                  onClick={promptLeaveGroup}
                  className="text-xs text-red-600 hover:text-red-800 font-bold flex items-center gap-1 transition"
                >
                  <ArrowLeftOnRectangleIcon className="w-3.5 h-3.5" />
                  Leave Group
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsManageMembersOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sleek Action Confirmation Popout Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-100">
            <div className="flex items-start space-x-4">
              <div className={`p-3 rounded-full flex-shrink-0 ${
                confirmModal.icon === 'danger' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
              }`}>
                {confirmModal.icon === 'danger' ? (
                  <ExclamationTriangleIcon className="w-7 h-7" />
                ) : (
                  <UserMinusIcon className="w-7 h-7" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 leading-6">
                  {confirmModal.title}
                </h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                  {confirmModal.description}
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end space-x-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
                disabled={isConfirmLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsConfirmLoading(true);
                  try {
                    await confirmModal.action();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                  } catch (err: any) {
                    const errMsg = err?.response?.data?.error || err?.response?.data || 'Action failed.';
                    alert(errMsg);
                  } finally {
                    setIsConfirmLoading(false);
                  }
                }}
                disabled={isConfirmLoading}
                className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-xl shadow-md hover:shadow-lg transition flex items-center gap-2 disabled:opacity-50"
              >
                {isConfirmLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  confirmModal.confirmText
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Success Toast */}
      {successMessage && (
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-full shadow-2xl font-bold flex items-center gap-2 animate-[bounce_1s_infinite]">
          <CheckIcon className="w-5 h-5 border-2 border-white rounded-full p-0.5" />
          {successMessage}
        </div>
      )}
    </div>
  );
};