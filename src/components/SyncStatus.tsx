import React from 'react';

export const SyncStatus: React.FC = () => {
  return (
    <div className="w-full flex justify-center mt-2">
      <div className="px-3 py-1 rounded-full text-white text-xs font-medium shadow-sm bg-green-600">
        online
      </div>
    </div>
  );
};