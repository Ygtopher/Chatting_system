import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { chatApi, groupApi, friendsApi } from '../services/api';
import { useAuth } from './AuthContext';
import type { ChatRoom, GroupChat, Message } from '../types';

export interface ToastNotification {
  id: number;
  senderName: string;
  content: string;
  chatRoomId?: number;
  type?: 'MESSAGE' | 'FRIEND_REQUEST';
}

interface ChatContextType {
  selectedChat: ChatRoom | GroupChat | null;
  chatRooms: ChatRoom[];
  groupChats: GroupChat[];
  messages: Message[];
  loadingMessages: boolean;
  totalUnread: number;
  pendingRequestsCount: number;
  fetchPendingRequestsCount: () => Promise<void>;
  toast: ToastNotification | null;
  clearToast: () => void;
  selectChat: (chat: ChatRoom | GroupChat | null) => void;
  sendMessage: (content: string) => Promise<void>;
  deleteMessage: (messageId: number) => Promise<void>;
  updateMessage: (messageId: number, content: string) => Promise<void>;
  createGroup: (name: string) => Promise<GroupChat>;
  deleteGroup: (groupId: number) => Promise<void>;
  addGroupMember: (groupId: number, userId: number) => Promise<void>;
  removeGroupMember: (groupId: number, userId: number) => Promise<void>;
  getGroupMembers: (groupId: number) => Promise<any[]>;
  fetchMoreMessages: () => Promise<void>;
  fetchChatRooms: () => Promise<void>;
  fetchGroupChats: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, user } = useAuth();
  const [selectedChat, setSelectedChat] = useState<ChatRoom | GroupChat | null>(null);
  const [chatRooms, setChatRooms]   = useState<ChatRoom[]>([]);
  const [groupChats, setGroupChats] = useState<GroupChat[]>([]);
  const [messages, setMessages]     = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [toast, setToast]           = useState<ToastNotification | null>(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [page, setPage]     = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Request browser notification permission
  useEffect(() => {
    if (isAuthenticated && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [isAuthenticated]);

  // Keep a ref so WebSocket callbacks always see the current selectedChat
  const selectedChatRef = useRef<ChatRoom | GroupChat | null>(null);
  selectedChatRef.current = selectedChat;

  const stompClientRef = useRef<Client | null>(null);

  // ─── Load initial data & WebSocket ─────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;

    fetchChatRooms();
    fetchGroupChats();
    fetchPendingRequestsCount();
    connectWebSocket();

    return () => {
      try {
        stompClientRef.current?.deactivate();
      } catch {
        // ignore cleanup errors
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChat]);

  // ─── REST helpers ───────────────────────────────────────────────────────────

  const fetchPendingRequestsCount = useCallback(async () => {
    try {
      const res = await friendsApi.getPending();
      const requests = res.data.requests || [];
      setPendingRequestsCount(requests.length);
    } catch {
      // ignore
    }
  }, []);

  const fetchChatRooms = useCallback(async () => {
    try {
      const res = await chatApi.getChatRooms();
      setChatRooms(res.data);
    } catch (err) {
      console.error('Error fetching chat rooms:', err);
    }
  }, []);

  const fetchGroupChats = useCallback(async () => {
    try {
      const res = await groupApi.getGroupChats();
      setGroupChats(res.data);
    } catch (err) {
      console.error('Error fetching group chats:', err);
    }
  }, []);

  const deduplicateMessages = (msgs: Message[]): Message[] => {
    const seen = new Set<number>();
    return msgs.filter(m => {
      if (!m) return false;
      if (m.id && seen.has(m.id)) return false;
      if (m.id) seen.add(m.id);
      return true;
    });
  };

  const fetchMessages = async (targetChat?: ChatRoom | GroupChat | null) => {
    const chat = targetChat || selectedChatRef.current;
    if (!chat) return;

    setLoadingMessages(true);
    setPage(0);
    setHasMore(true);

    try {
      const isGroup = 'name' in chat;
      const res = isGroup
        ? await groupApi.getMessages(chat.id, 0, 20)
        : await chatApi.getMessages(chat.id, 0, 20);

      const rawContent = res.data?.content !== undefined 
        ? res.data.content 
        : (Array.isArray(res.data) ? res.data : []);
      const loadedMsgs = Array.isArray(rawContent) ? rawContent : [];
      setMessages(deduplicateMessages([...loadedMsgs].reverse()));
      setHasMore(res.data?.last !== undefined ? !res.data.last : false);

      if (loadedMsgs.length > 0) {
        const latestMsg = loadedMsgs[0];
        if (!isGroup) {
          setChatRooms(prev => prev.map(r => r.id === chat.id ? { ...r, lastMessage: latestMsg } : r));
        } else {
          setGroupChats(prev => prev.map(g => g.id === chat.id ? { ...g, lastMessage: latestMsg } : g));
        }
      }
    } catch (err: any) {
      console.error('Error fetching messages:', err);
      if (err?.response?.data) {
        console.error('Server error details:', err.response.data);
      }
    } finally {
      setLoadingMessages(false);
    }
  };

  const fetchMoreMessages = useCallback(async () => {
    const chat = selectedChatRef.current;
    if (!chat || !hasMore || loadingMessages) return;

    setLoadingMessages(true);
    const nextPage = page + 1;

    try {
      const isGroup = 'name' in chat;
      const res = isGroup
        ? await groupApi.getMessages(chat.id, nextPage, 20)
        : await chatApi.getMessages(chat.id, nextPage, 20);

      const rawContent = res.data?.content !== undefined 
        ? res.data.content 
        : (Array.isArray(res.data) ? res.data : []);
      const loadedMsgs = Array.isArray(rawContent) ? rawContent : [];
      setMessages(prev => deduplicateMessages([...[...loadedMsgs].reverse(), ...prev]));
      setPage(nextPage);
      setHasMore(res.data?.last !== undefined ? !res.data.last : false);
    } catch (err) {
      console.error('Error fetching more messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, [hasMore, loadingMessages, page]);

  // ─── WebSocket / STOMP Real-Time Connection ─────────────────────────────────

  const connectWebSocket = () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const client = new Client({
        webSocketFactory: () => new SockJS((import.meta.env.VITE_API_BASE_URL || 'https://chatting-backend-de61.onrender.com') + '/ws'),
        connectHeaders: { Authorization: `Bearer ${token}` },
        reconnectDelay: 5000,

        onConnect: () => {
          console.log('[WS] STOMP connected to /ws');

          // Direct-message queue for the current user
          client.subscribe('/user/queue/messages', (frame) => {
            const data = JSON.parse(frame.body);

            if (data.type === 'FRIEND_REQUEST') {
              setPendingRequestsCount(prev => prev + 1);
              setToast({
                id: Date.now(),
                senderName: data.senderName || 'A user',
                content: data.content || 'sent you a friend request!',
                type: 'FRIEND_REQUEST',
              });

              try {
                const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                if (AudioContext) {
                  const ctx = new AudioContext();
                  const osc = ctx.createOscillator();
                  const gain = ctx.createGain();
                  osc.type = 'sine';
                  osc.frequency.setValueAtTime(587.33, ctx.currentTime);
                  osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
                  gain.gain.setValueAtTime(0.3, ctx.currentTime);
                  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
                  osc.connect(gain);
                  gain.connect(ctx.destination);
                  osc.start();
                  osc.stop(ctx.currentTime + 0.35);
                }
              } catch {
                // Ignore audio policy restrictions
              }
              return;
            }

            if (data.type === 'FRIEND_REQUEST_ACCEPTED') {
              fetchChatRooms();
              setToast({
                id: Date.now(),
                senderName: data.senderName || 'A user',
                content: data.content || 'accepted your friend request!',
                type: 'FRIEND_REQUEST',
              });
              return;
            }


            const msg: Message = data;
            const activeChat = selectedChatRef.current;
            const isCurrentChatOpen = activeChat && 'otherUser' in activeChat && msg.chatRoomId === activeChat.id;

            if (msg.deleted) {
              setMessages(prev => prev.filter(m => m.id !== msg.id));
              return;
            }

            if (isCurrentChatOpen) {
              setMessages(prev => {
                const exists = prev.some(m => m.id === msg.id);
                if (exists) {
                  return prev.map(m => m.id === msg.id ? { ...m, content: msg.content, edited: msg.edited } : m);
                }
                return deduplicateMessages([...prev, msg]);
              });
            }

            setChatRooms(prev => {
              const exists = prev.some(r => r.id === msg.chatRoomId);
              if (!exists) {
                fetchChatRooms();
                return prev;
              }
              return prev.map(r => {
                if (r.id === msg.chatRoomId) {
                  return {
                    ...r,
                    lastMessage: msg,
                    unreadCount: isCurrentChatOpen ? 0 : (r.unreadCount || 0) + 1,
                  };
                }
                return r;
              });
            });

            if (!isCurrentChatOpen && msg.sender?.username && !msg.edited) {
              const senderName = msg.sender.username;
              
              // Play notification chime sound
              try {
                const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                if (AudioContext) {
                  const ctx = new AudioContext();
                  const osc = ctx.createOscillator();
                  const gain = ctx.createGain();
                  osc.type = 'sine';
                  osc.frequency.setValueAtTime(587.33, ctx.currentTime);
                  osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
                  gain.gain.setValueAtTime(0.3, ctx.currentTime);
                  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
                  osc.connect(gain);
                  gain.connect(ctx.destination);
                  osc.start();
                  osc.stop(ctx.currentTime + 0.35);
                }
              } catch {
                // Ignore audio policy restrictions
              }

              const isGroupInvite = msg.content?.startsWith('GROUP_INVITE|');
              const isSystemLeave = msg.content?.startsWith('SYSTEM_LEAVE|');
              const isSystemRemove = msg.content?.startsWith('SYSTEM_REMOVE|');
              const isSystemJoin = msg.content?.startsWith('SYSTEM_JOIN|');

              if (isSystemLeave || isSystemRemove || isSystemJoin) return; // Do not toast system messages

              const displayContent = isGroupInvite ? `Invited you to join ${msg.content.split('|')[3] || 'a group'}!` : msg.content;

              if ('Notification' in window && Notification.permission === 'granted') {
                try {
                  new Notification(`New message from ${senderName}`, {
                    body: displayContent,
                  });
                } catch {
                  // ignore Notification constructor errors
                }
              }

              setToast({
                id: Date.now(),
                senderName,
                content: displayContent,
                chatRoomId: msg.chatRoomId,
              });
            }
          });
        },

        onStompError: (frame) => {
          console.error('[WS] STOMP error', frame.headers?.message);
        },

        onDisconnect: () => {
          console.log('[WS] STOMP disconnected');
        },
      });

      client.activate();
      stompClientRef.current = client;
    } catch (err) {
      console.error('[WS] Connection failed:', err);
    }
  };

  // Subscribe to each group chat topic once client is connected and groupChats are loaded
  useEffect(() => {
    const client = stompClientRef.current;
    if (!client?.connected || groupChats.length === 0) return;

    groupChats.forEach(group => {
      try {
        client.subscribe(`/topic/group/${group.id}`, (frame) => {
          const msg: Message = JSON.parse(frame.body);
          const chat = selectedChatRef.current;

          if (msg.deleted) {
            setMessages(prev => prev.filter(m => m.id !== msg.id));
            return;
          }

          if (chat && !('otherUser' in chat) && msg.groupChatId === chat.id) {
            setMessages(prev => {
              const exists = prev.some(m => m.id === msg.id);
              if (exists) {
                return prev.map(m => m.id === msg.id ? { ...m, content: msg.content, edited: msg.edited } : m);
              }
              return deduplicateMessages([...prev, msg]);
            });
          }
          setGroupChats(prev =>
            prev.map(g => g.id === msg.groupChatId ? { ...g, lastMessage: msg } : g)
          );
        });
      } catch {
        // Client might not be ready yet
      }
    });
  }, [groupChats]);

  // ─── Actions ────────────────────────────────────────────────────────────────

  const selectChat = useCallback((chat: ChatRoom | GroupChat | null) => {
    setSelectedChat(chat);
    selectedChatRef.current = chat;
    setMessages([]);
    if (chat) {
      fetchMessages(chat);
      if ('otherUser' in chat) {
        setChatRooms(prev =>
          prev.map(r => r.id === chat.id ? { ...r, unreadCount: 0 } : r)
        );
      }
    }
  }, []);

  const sendMessage = async (content: string): Promise<void> => {
    const chat = selectedChatRef.current;
    if (!chat) throw new Error('No chat selected');

    try {
      const isGroup = 'name' in chat;
      const res = isGroup
        ? await groupApi.sendMessage(chat.id, content)
        : await chatApi.sendMessage(chat.id, content);

      const newMsg: Message = res.data;
      setMessages(prev => deduplicateMessages([...prev, newMsg]));

      if (!isGroup) {
        setChatRooms(prev =>
          prev.map(r => r.id === chat.id ? { ...r, lastMessage: newMsg, unreadCount: 0 } : r)
        );
      } else {
        setGroupChats(prev =>
          prev.map(g => g.id === chat.id ? { ...g, lastMessage: newMsg } : g)
        );
      }
    } catch (err) {
      console.error('Error sending message:', err);
      throw err;
    }
  };

  const deleteMessage = async (messageId: number): Promise<void> => {
    try {
      await chatApi.deleteMessage(messageId);
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (err) {
      console.error('Error deleting message:', err);
      throw err;
    }
  };

  const updateMessage = async (messageId: number, content: string): Promise<void> => {
    try {
      const res = await chatApi.updateMessage(messageId, content);
      const updatedMsg: Message = res.data;
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: updatedMsg.content, edited: true } : m));
    } catch (err) {
      console.error('Error updating message:', err);
      throw err;
    }
  };

  const createGroup = async (name: string): Promise<GroupChat> => {
    try {
      const res = await groupApi.createGroup(name);
      const newGroup: GroupChat = res.data;
      setGroupChats(prev => [newGroup, ...prev]);
      selectChat(newGroup);
      return newGroup;
    } catch (err) {
      console.error('Error creating group chat:', err);
      throw err;
    }
  };

  const addGroupMember = async (groupId: number, userId: number): Promise<void> => {
    try {
      await groupApi.sendInvite(groupId, userId);
    } catch (err) {
      console.error('Error sending group invite:', err);
      throw err;
    }
  };

  const removeGroupMember = async (groupId: number, userId: number): Promise<void> => {
    try {
      await groupApi.removeMember(groupId, userId);
      if (user && Number(user.id) === Number(userId)) {
        setGroupChats(prev => prev.filter(g => g.id !== groupId));
        if (selectedChat?.id === groupId && 'name' in selectedChat) {
          setSelectedChat(null);
        }
      }
    } catch (err) {
      console.error('Error removing member from group:', err);
      throw err;
    }
  };

  const deleteGroup = async (groupId: number): Promise<void> => {
    try {
      await groupApi.deleteGroup(groupId);
      setGroupChats(prev => prev.filter(g => g.id !== groupId));
      if (selectedChat?.id === groupId && 'name' in selectedChat) {
        setSelectedChat(null);
      }
    } catch (err) {
      console.error('Error deleting group:', err);
      throw err;
    }
  };

  const getGroupMembers = async (groupId: number): Promise<any[]> => {
    try {
      const res = await groupApi.getMembers(groupId);
      return res.data.members || [];
    } catch (err) {
      console.error('Error fetching group members:', err);
      throw err;
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  const totalUnread = chatRooms.reduce((acc, r) => acc + (r.unreadCount || 0), 0);

  return (
    <ChatContext.Provider value={{
      selectedChat,
      chatRooms,
      groupChats,
      messages,
      loadingMessages,
      totalUnread,
      pendingRequestsCount,
      fetchPendingRequestsCount,
      toast,
      clearToast: () => setToast(null),
      selectChat,
      sendMessage,
      deleteMessage,
      updateMessage,
      createGroup,
      deleteGroup,
      addGroupMember,
      removeGroupMember,
      getGroupMembers,
      fetchMoreMessages,
      fetchChatRooms,
      fetchGroupChats,
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};