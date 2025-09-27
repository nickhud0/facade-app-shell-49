import React from 'react';

interface NetworkStatusProps {
  className?: string;
  showDetails?: boolean;
}

export const NetworkStatus = ({ className = "", showDetails = false }: NetworkStatusProps) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="h-4 w-4 bg-green-500 rounded-full"></div>
      {showDetails && <span className="text-sm">Online</span>}
    </div>
  );
};