import React, { useState, useEffect } from 'react';
import { friendsApi, chatApi, groupApi } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../context/ChatContext';
import { MagnifyingGlassIcon, UserPlusIcon, CheckIcon, XMarkIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import type { UserSearchResult, FriendRequest, GroupInvite } from '../types';

export const FriendsPage: React.FC = () => {
  const navigate = useNavigate();
  const { fetchPendingRequestsCount, fetchGroupChats } = useChat();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFriends();
    loadPendingRequests();
  }, []);

  const loadFriends = async () => {
    try {
      const res = await friendsApi.getList();
      setFriends(res.data.friends ?? []);
    } catch {
      console.error('Failed to load friends');
    }
  };

  const loadPendingRequests = async () => {
    try {
      const res = await friendsApi.getPending();
      setPendingRequests(res.data.requests ?? []);
    } catch {
      console.error('Failed to load pending requests');
    }
  };

  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setHasSearched(true);
    setError(null);
    try {
      const res = await friendsApi.search(searchQuery);
      setSearchResults(res.data.users ?? []);
    } catch {
      setError('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async (userId: number) => {
    try {
      await friendsApi.sendRequest(userId);
      setSearchResults(prev =>
        prev.map(u => u.id === userId ? { ...u, status: 'request_sent' as const } : u)
      );
    } catch {
      setError('Failed to send friend request.');
    }
  };

  const handleAccept = async (requestId: number) => {
    try {
      await friendsApi.acceptRequest(requestId);
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
      loadFriends();
      fetchPendingRequestsCount();
    } catch {
      setError('Failed to accept request.');
    }
  };

  const handleDecline = async (requestId: number) => {
    try {
      await friendsApi.declineRequest(requestId);
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
      fetchPendingRequestsCount();
    } catch {
      setError('Failed to decline request.');
    }
  };

  const handleStartChat = async (userId: number) => {
    try {
      const res = await chatApi.startDirectChat(userId);
      navigate('/chat', { state: { chatRoomId: res.data.chatRoomId } });
    } catch {
      setError('Failed to open chat.');
    }
  };

  const statusBadge = (status: UserSearchResult['status']) => {
    switch (status) {
      case 'friends': return <span className="text-green-600 text-sm font-medium">Friends</span>;
      case 'request_sent': return <span className="text-yellow-600 text-sm font-medium">Request sent</span>;
      case 'request_received': return <span className="text-blue-600 text-sm font-medium">Wants to connect</span>;
      default: return null;
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Friends</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-xl font-semibold mb-3">Find People</h2>
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by username or email..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {hasSearched && searchResults.length === 0 && !isSearching && (
          <p className="mt-4 text-sm text-gray-500 text-center py-2">
            No users found matching "{searchQuery}".
          </p>
        )}

        {searchResults.length > 0 && (
          <ul className="mt-4 divide-y divide-gray-100">
            {searchResults.map(u => (
              <li key={u.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                    {u.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">{u.username}</p>
                    <p className="text-sm text-gray-500">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {statusBadge(u.status)}
                  {u.status === 'none' && (
                    <button
                      onClick={() => handleSendRequest(u.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                    >
                      <UserPlusIcon className="w-4 h-4" />
                      Add
                    </button>
                  )}
                  {u.status === 'friends' && (
                    <button
                      onClick={() => handleStartChat(u.id)}
                      className="px-3 py-1.5 border border-blue-600 text-blue-600 text-sm rounded-md hover:bg-blue-50"
                    >
                      Message
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pending requests */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-xl font-semibold mb-3">
          Friend Requests
          {pendingRequests.length > 0 && (
            <span className="ml-2 bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
              {pendingRequests.length}
            </span>
          )}
        </h2>
        {pendingRequests.length === 0 ? (
          <p className="text-gray-500">No pending friend requests</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {pendingRequests.map(req => (
              <li key={req.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold">
                    {req.sender.username.charAt(0).toUpperCase()}
                  </div>
                  <p className="font-medium">{req.sender.username}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(req.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                  >
                    <CheckIcon className="w-4 h-4" />
                    Accept
                  </button>
                  <button
                    onClick={() => handleDecline(req.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                  >
                    <XMarkIcon className="w-4 h-4" />
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>


      {/* Friends list */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-xl font-semibold mb-3">My Friends ({friends.length})</h2>
        {friends.length === 0 ? (
          <p className="text-gray-500">No friends added yet. Search for people above!</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {friends.map((f: any) => (
              <li key={f.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold">
                    {f.username.charAt(0).toUpperCase()}
                  </div>
                  <p className="font-medium">{f.username}</p>
                </div>
                <button
                  onClick={() => handleStartChat(f.id)}
                  className="px-3 py-1.5 border border-blue-600 text-blue-600 text-sm rounded-md hover:bg-blue-50"
                >
                  Message
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default FriendsPage;