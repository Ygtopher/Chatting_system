import React from 'react';

export const GroupsPage: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Groups</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Group list will be implemented here */}
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-500">No groups available</p>
        </div>
      </div>
    </div>
  );
};

export default GroupsPage; 