import React from 'react';
import { useParams } from 'react-router-dom';

export const GroupDetailPage: React.FC = () => {
  const { groupId } = useParams();

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white rounded-lg shadow">
        {/* Group Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Group Name</h1>
              <p className="text-gray-600">Created by: Admin</p>
            </div>
            <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition">
              Invite Members
            </button>
          </div>
        </div>

        {/* Group Content */}
        <div className="flex">
          {/* Chat Area */}
          <div className="flex-1 p-6">
            <div className="h-[calc(100vh-300px)] overflow-y-auto mb-4">
              <p className="text-gray-500 text-center">No messages yet</p>
            </div>
            
            {/* Message Input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type a message..."
                className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition">
                Send
              </button>
            </div>
          </div>

          {/* Members Sidebar */}
          <div className="w-64 border-l p-6">
            <h2 className="text-xl font-semibold mb-4">Members</h2>
            <div className="space-y-3">
              <p className="text-gray-500">Loading members...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupDetailPage; 