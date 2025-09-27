import React from 'react';
import { Loader2, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface PageWrapperProps {
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  children: React.ReactNode;
  isOnline?: boolean;
}

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-8">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const ErrorState = ({ error, onRetry }: { error: string; onRetry?: () => void }) => (
  <div className="flex flex-col items-center justify-center py-8 px-4">
    <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
    <p className="text-center text-muted-foreground mb-4">{error}</p>
    {onRetry && (
      <Button onClick={onRetry} variant="outline">
        Tentar Novamente
      </Button>
    )}
  </div>
);

const OfflineBanner = () => (
  <Card className="mb-4 p-3 bg-orange-50 border-orange-200">
    <div className="flex items-center gap-2 text-orange-700">
      <WifiOff className="h-4 w-4" />
      <span className="text-sm font-medium">Modo Offline</span>
    </div>
    <p className="text-xs text-orange-600 mt-1">
      Dados salvos localmente. Sincronizará quando conectar.
    </p>
  </Card>
);

export const PageWrapper: React.FC<PageWrapperProps> = ({
  loading,
  error,
  onRetry,
  children,
  isOnline = true,
}) => {
  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {!isOnline && <OfflineBanner />}
      {children}
    </div>
  );
};