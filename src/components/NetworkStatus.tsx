import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

interface NetworkStatusProps {
  className?: string;
  showDetails?: boolean;
}

export const NetworkStatus = ({ className = "", showDetails = false }: NetworkStatusProps) => {
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Defer the service import to avoid initialization issues
    const initializeNetworkStatus = async () => {
      try {
        // Wait for React to fully initialize
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Dynamic import to avoid circular dependencies
        const { appService } = await import('@/services/appService');
        
        const update = () => {
          try {
            const status = appService.getConnectionStatus();
            setSupabaseConnected(status.supabaseConnected);
          } catch (error) {
            console.warn('NetworkStatus update failed:', error);
            setSupabaseConnected(false);
          }
        };

        update();
        setIsReady(true);
        
        const interval = setInterval(update, 2000);
        return () => clearInterval(interval);
      } catch (error) {
        console.warn('NetworkStatus initialization failed:', error);
        setIsReady(true); // Still show component even if initialization fails
      }
    };

    const cleanup = initializeNetworkStatus();
    return () => {
      cleanup.then(cleanupFn => {
        if (typeof cleanupFn === 'function') cleanupFn();
      });
    };
  }, []);

  // Don't render anything until we're ready to avoid errors
  if (!isReady) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <WifiOff className="h-4 w-4 text-muted-foreground animate-pulse" />
      </div>
    );
  }

  if (!showDetails) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {supabaseConnected ? (
          <Wifi className="h-4 w-4 text-success" />
        ) : (
          <WifiOff className="h-4 w-4 text-warning" />
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {supabaseConnected ? (
        <>
          <Wifi className="h-4 w-4 text-success" />
          <span className="text-sm font-medium">Supabase: Conectado</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 text-warning" />
          <span className="text-sm font-medium">Supabase: Não Conectado</span>
        </>
      )}
    </div>
  );
};