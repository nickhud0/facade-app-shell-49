/**
 * Componente para mostrar status de sincronização global
 * Exibe ícones de status e permite sincronização manual
 */

import React, { useState } from 'react';
import { Wifi, WifiOff, RotateCcw, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useSyncService } from '@/hooks/useSyncService';

export function SyncStatusIndicator() {
  const { stats, syncing, isOnline, forceSync } = useSyncService();
  const [isOpen, setIsOpen] = useState(false);

  const handleSync = async () => {
    if (syncing) return;
    await forceSync();
    setIsOpen(false);
  };

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="h-4 w-4 text-destructive" />;
    if (syncing) return <RotateCcw className="h-4 w-4 text-primary animate-spin" />;
    if (stats.failed > 0) return <AlertCircle className="h-4 w-4 text-destructive" />;
    if (stats.pending > 0) return <Clock className="h-4 w-4 text-warning" />;
    return <CheckCircle className="h-4 w-4 text-success" />;
  };

  const getStatusText = () => {
    if (!isOnline) return "Offline";
    if (syncing) return "Sincronizando...";
    if (stats.failed > 0) return `${stats.failed} falhas`;
    if (stats.pending > 0) return `${stats.pending} pendentes`;
    return "Sincronizado";
  };

  const getStatusColor = () => {
    if (!isOnline) return "destructive";
    if (syncing) return "default";
    if (stats.failed > 0) return "destructive";
    if (stats.pending > 0) return "secondary";
    return "default";
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2">
          {getStatusIcon()}
          <Badge variant={getStatusColor() as any} className="ml-2 h-5 px-1.5 text-xs">
            {getStatusText()}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Status de Sincronização</h4>
            <div className="flex items-center justify-between text-sm">
              <span>Conexão:</span>
              <div className="flex items-center gap-1">
                {isOnline ? <Wifi className="h-3 w-3 text-success" /> : <WifiOff className="h-3 w-3 text-destructive" />}
                <span className={isOnline ? "text-success" : "text-destructive"}>
                  {isOnline ? "Online" : "Offline"}
                </span>
              </div>
            </div>
          </div>

          {stats.total > 0 && (
            <div className="space-y-2">
              <h5 className="font-medium text-xs text-muted-foreground">Fila de Sincronização</h5>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Pendentes:</span>
                  <Badge variant="secondary" className="h-4 px-1.5">
                    {stats.pending}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Falhas:</span>
                  <Badge variant="destructive" className="h-4 px-1.5">
                    {stats.failed}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Total:</span>
                  <Badge variant="secondary" className="h-4 px-1.5">
                    {stats.total}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          <div className="pt-2 border-t">
            <Button 
              onClick={handleSync}
              disabled={!isOnline || syncing}
              size="sm"
              className="w-full"
            >
              {syncing ? (
                <>
                  <RotateCcw className="h-3 w-3 mr-2 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <RotateCcw className="h-3 w-3 mr-2" />
                  Forçar Sincronização
                </>
              )}
            </Button>
          </div>

          {!isOnline && (
            <div className="text-xs text-muted-foreground">
              💡 Os dados são salvos localmente e serão sincronizados quando voltar online.
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}