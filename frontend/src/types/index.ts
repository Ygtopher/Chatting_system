// ─── Shared TypeScript types for ChatApp ─────────────────────────────────────

export interface User {
  id: number;
  username: string;
  email: string;
  profilePicture: string | null;
  roles: string[];
}

export interface MessageSender {
  id: number;
  username: string;
  profilePicture: string | null;
}

export interface Message {
  id: number;
  content: string;
  sender: MessageSender;
  timestamp: string;
  chatRoomId?: number;
  groupChatId?: number;
  edited?: boolean;
  deleted?: boolean;
}

export interface ChatRoom {
  id: number;
  otherUser: {
    id: number;
    username: string;
    profilePicture: string | null;
  };
  lastMessage: Message | null;
  unreadCount: number;
}

export interface GroupChat {
  id: number;
  name: string;
  description: string;
  lastMessage: Message | null;
  unreadCount: number;
  isAdmin: boolean;
}

export interface FriendRequest {
  id: number;
  sender: {
    id: number;
    username: string;
    email: string;
    profilePictureUrl: string | null;
  };
  receiver: {
    id: number;
    username: string;
    email: string;
    profilePictureUrl: string | null;
  };
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
}

export interface UserSearchResult {
  id: number;
  username: string;
  email: string;
  profilePictureUrl: string | null;
  status: 'friends' | 'request_sent' | 'request_received' | 'none';
}

export interface PaginatedResponse<T> {
  content: T[];
  totalPages: number;
  last: boolean;
  number: number;
}

export interface GroupInvite {
  id: number;
  groupId: number;
  groupName: string;
  inviterName: string;
  createdAt?: string;
}
