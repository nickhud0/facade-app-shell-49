import React from 'react';

interface SimpleStatusProps {
  className?: string;
  showDetails?: boolean;
}

export const SimpleStatus = ({ className = "", showDetails = false }: SimpleStatusProps) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="h-4 w-4 bg-green-500 rounded-full"></div>
      {showDetails && <span className="text-sm">Online</span>}
    </div>
  );
};

// Legacy export for compatibility
export const NetworkStatus = SimpleStatus;