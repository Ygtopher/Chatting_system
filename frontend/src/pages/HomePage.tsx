import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { friendsApi } from '../services/api';
import { 
  MagnifyingGlassIcon, 
  UserIcon, 
  UserGroupIcon, 
  ChatBubbleLeftRightIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline';
import type { ChatRoom, GroupChat } from '../types';

export const HomePage = () => {
  const { user } = useAuth();
  const { chatRooms, groupChats, selectChat } = useChat();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await friendsApi.search(searchQuery);
      setSearchResults(response.data.users ?? []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectRecentChat = (chat: ChatRoom | GroupChat) => {
    selectChat(chat);
    navigate('/chat');
  };

  const recentChats = [...chatRooms, ...groupChats]
    .sort((a, b) => {
      const dateA = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp) : new Date(0);
      const dateB = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp) : new Date(0);
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4">
          Welcome, {user?.username}!
        </h1>
        
        {/* Global search */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search for users..."
              className="input w-full pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <button 
              type="submit" 
              className="btn btn-primary absolute right-1 top-1/2 transform -translate-y-1/2 py-1"
              disabled={isSearching}
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {/* Search results */}
        {searchResults.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Search Results</h2>
            <div className="space-y-2">
              {searchResults.map((result) => (
                <div 
                  key={`user-${result.id}`}
                  className="bg-gray-50 p-3 rounded-md hover:bg-gray-100"
                >
                  <Link to="/friends" className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                      {result.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="ml-3">
                      <p className="font-medium">{result.username}</p>
                      <p className="text-sm text-gray-500">{result.email}</p>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent conversations */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Recent Conversations</h2>
            <Link to="/chat" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
              View all &rarr;
            </Link>
          </div>
          
          {recentChats.length > 0 ? (
            <div className="space-y-2">
              {recentChats.map((chat) => {
                const isGroup = 'name' in chat;

                return (
                  <div 
                    key={`${isGroup ? 'group' : 'chat'}-${chat.id}`}
                    className="bg-gray-50 p-3 rounded-xl hover:bg-gray-100 cursor-pointer transition border border-gray-100"
                    onClick={() => handleSelectRecentChat(chat)}
                  >
                    {!isGroup ? (
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                          {chat.otherUser.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-3 flex-1">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900">{chat.otherUser.username}</p>
                              <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                <UserIcon className="w-3 h-3" /> Direct Chat
                              </span>
                            </div>
                            {chat.lastMessage && (
                              <p className="text-xs text-gray-500">
                                {new Date(chat.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 truncate mt-0.5">
                            {chat.lastMessage ? chat.lastMessage.content : 'Start conversation...'}
                          </p>
                        </div>
                        {chat.unreadCount > 0 && (
                          <div className="ml-2 bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            {chat.unreadCount}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">
                          <UserGroupIcon className="w-5 h-5" />
                        </div>
                        <div className="ml-3 flex-1">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900">{chat.name}</p>
                              <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                <UserGroupIcon className="w-3 h-3" /> Group Chat
                              </span>
                            </div>
                            {chat.lastMessage && (
                              <p className="text-xs text-gray-500">
                                {new Date(chat.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 truncate mt-0.5">
                            {chat.lastMessage ? 
                              `${chat.lastMessage.sender?.username || 'Member'}: ${chat.lastMessage.content}` : 
                              'Start conversation...'}
                          </p>
                        </div>
                        {chat.unreadCount > 0 && (
                          <div className="ml-2 bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            {chat.unreadCount}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No recent conversations</p>
          )}
        </div>

        {/* Quick actions */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/chat" className="btn btn-secondary flex items-center justify-center gap-2 py-2.5">
              <ChatBubbleLeftRightIcon className="w-5 h-5 text-blue-600" />
              <span>Go to Messages</span>
            </Link>
            <Link to="/friends" className="btn btn-secondary flex items-center justify-center gap-2 py-2.5">
              <UserPlusIcon className="w-5 h-5 text-purple-600" />
              <span>Find Friends</span>
            </Link>
            <Link to="/profile" className="btn btn-secondary flex items-center justify-center gap-2 py-2.5">
              <UserIcon className="w-5 h-5 text-emerald-600" />
              <span>Update Profile</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};