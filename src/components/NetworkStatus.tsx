import * as React from 'react';
import { Wifi, WifiOff } from 'lucide-react';

interface NetworkStatusProps {
  className?: string;
  showDetails?: boolean;
}

export const NetworkStatus = ({ className = "", showDetails = false }: NetworkStatusProps) => {
  const [supabaseConnected, setSupabaseConnected] = React.useState(false);
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    let interval: NodeJS.Timeout;

    const initializeNetworkStatus = async () => {
      try {
        // Wait for app to be ready
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (!mounted) return;
        setIsReady(true);
        
        // Simple status check without complex service dependencies
        const checkStatus = () => {
          try {
            // Basic connectivity check
            const online = navigator.onLine;
            setSupabaseConnected(online);
          } catch (error) {
            console.warn('NetworkStatus update failed:', error);
            setSupabaseConnected(false);
          }
        };

        checkStatus();
        interval = setInterval(checkStatus, 3000);
      } catch (error) {
        console.warn('NetworkStatus initialization failed:', error);
        if (mounted) {
          setIsReady(true);
          setSupabaseConnected(false);
        }
      }
    };

    initializeNetworkStatus();

    return () => {
      mounted = false;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  // Don't render anything until we're ready
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
          <span className="text-sm font-medium">Online</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 text-warning" />
          <span className="text-sm font-medium">Offline</span>
        </>
      )}
    </div>
  );
};