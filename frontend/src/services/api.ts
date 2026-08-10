/**
 * Centralised Axios instance for the ChatApp API.
 * All HTTP calls should be made through this module instead of inline axios calls.
 */
import axios from 'axios';

const api = axios.create({
  // Vite dev proxy forwards /api → http://localhost:9090
  // In production set VITE_API_BASE_URL env variable.
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// ── Request interceptor: attach JWT from localStorage ────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: redirect to /login on 401 so user receives fresh 24h token ──
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginOrRegister = error.config?.url?.includes('/api/auth/login') || error.config?.url?.includes('/api/auth/register');
    if (error.response?.status === 401 && !isLoginOrRegister) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (username: string, email: string, password: string) =>
    api.post('/api/auth/register', { username, email, password }),

  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),

  verifyLogin: (email: string, token: string) =>
    api.post('/api/auth/verify-login', { email, token }),

  logout: () => api.post('/api/auth/logout'),

  me: () => api.get('/api/auth/me'),

  forgotPassword: (email: string) =>
    api.post('/api/auth/forgot-password', { email }),

  resetPassword: (token: string, newPassword: string) =>
    api.post('/api/auth/reset-password', { token, newPassword }),
};

// ─── Chat rooms ───────────────────────────────────────────────────────────────
export const chatApi = {
  getChatRooms: () => api.get('/api/chatrooms'),

  getMessages: (chatRoomId: number, page = 0, size = 20) =>
    api.get(`/api/chatrooms/${chatRoomId}/messages`, { params: { page, size } }),

  sendMessage: (chatRoomId: number, content: string) =>
    api.post(`/api/chatrooms/${chatRoomId}/messages`, { content }),

  startDirectChat: (userId: number) =>
    api.post(`/api/chat/direct/${userId}`),

  deleteMessage: (messageId: number) =>
    api.delete(`/api/chat/messages/${messageId}`),

  updateMessage: (messageId: number, content: string) =>
    api.put(`/api/chat/messages/${messageId}`, { content }),

  uploadChatFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/chat/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ─── Group chats ──────────────────────────────────────────────────────────────
export const groupApi = {
  getGroupChats: () => api.get('/api/groupchats'),

  getMessages: (groupId: number, page = 0, size = 20) =>
    api.get(`/api/groupchats/${groupId}/messages`, { params: { page, size } }),

  sendMessage: (groupId: number, content: string) =>
    api.post(`/api/groupchats/${groupId}/messages`, { content }),

  createGroup: (name: string) =>
    api.post('/api/chat/group', { name }),

  addMember: (groupId: number, userId: number) =>
    api.post(`/api/chat/group/${groupId}/members`, { userId: String(userId) }),

  getMembers: (groupId: number) =>
    api.get(`/api/chat/group/${groupId}/members`),

  removeMember: (groupId: number, userId: number) =>
    api.delete(`/api/chat/group/${groupId}/members/${userId}`),

  sendInvite: (groupId: number, userId: number) =>
    api.post(`/api/chat/group/${groupId}/invite`, { userId: String(userId) }),

  getPendingInvites: () =>
    api.get('/api/chat/group/invites/pending'),

  acceptInvite: (inviteId: number) =>
    api.post(`/api/chat/group/invites/${inviteId}/accept`),

  declineInvite: (inviteId: number) =>
    api.post(`/api/chat/group/invites/${inviteId}/decline`),

  deleteGroup: (groupId: number) =>
    api.delete(`/api/chat/group/${groupId}`),
};

// ─── Friends ──────────────────────────────────────────────────────────────────
export const friendsApi = {
  search: (query: string) =>
    api.get('/api/friends/search', { params: { query } }),

  sendRequest: (userId: number) =>
    api.post(`/api/friends/request/${userId}`),

  acceptRequest: (requestId: number) =>
    api.post(`/api/friends/request/${requestId}/accept`),

  declineRequest: (requestId: number) =>
    api.post(`/api/friends/request/${requestId}/decline`),

  cancelRequest: (requestId: number) =>
    api.delete(`/api/friends/request/${requestId}`),

  getPending: () => api.get('/api/friends/requests/pending'),

  getSent: () => api.get('/api/friends/requests/sent'),

  getList: () => api.get('/api/friends/list'),
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const usersApi = {
  getProfile: () => api.get('/api/users/profile'),

  updateProfile: (username: string, profilePictureUrl?: string) =>
    api.put('/api/users/profile', { username, profilePictureUrl }),

  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/users/profile/picture', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  updatePassword: (newPassword: string) =>
    api.put('/api/users/password', { newPassword }),

  enable2FA: (secret?: string) =>
    api.post('/api/users/2fa/enable', { secret: secret ?? 'default_secret' }),

  disable2FA: () =>
    api.post('/api/users/2fa/disable', {}),
};