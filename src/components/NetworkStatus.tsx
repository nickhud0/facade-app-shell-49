import { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { appService } from '@/services/appService';

interface NetworkStatusProps {
  className?: string;
  showDetails?: boolean;
}

export const NetworkStatus = ({ className = "", showDetails = false }: NetworkStatusProps) => {
  const [supabaseConnected, setSupabaseConnected] = useState(false);

  useEffect(() => {
    const update = () => {
      try {
        const status = appService.getConnectionStatus();
        setSupabaseConnected(status.supabaseConnected);
      } catch {
        // ignore
      }
    };

    update();
    const interval = setInterval(update, 2000);
    return () => clearInterval(interval);
  }, []);

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