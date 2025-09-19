/**
 * HOOK PARA SINCRONIZAÇÃO UNIFICADA
 * Monitora status e permite sync manual
 */

import { useState, useEffect } from 'react';
import { unifiedSyncService, SyncStats } from '@/services/unifiedSyncService';
import { networkService } from '@/services/networkService';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export interface UnifiedSyncState {
  stats: SyncStats;
  syncing: boolean;
  isOnline: boolean;
  lastSync: string | null;
}

export function useUnifiedSync() {
  const { toast } = useToast();
  const [state, setState] = useState<UnifiedSyncState>({
    stats: { pending: 0, failed: 0, total: 0 },
    syncing: false,
    isOnline: false,
    lastSync: null
  });

  const refreshStats = async (): Promise<void> => {
    try {
      const stats = await unifiedSyncService.getStats();
      setState(prev => ({
        ...prev,
        stats,
        isOnline: networkService.getConnectionStatus(),
        syncing: prev.syncing || unifiedSyncService.isSyncInProgress()
      }));
    } catch (error) {
      logger.error('Error refreshing sync stats:', error);
    }
  };

  const forceSync = async (): Promise<void> => {
    if (state.syncing) return;

    setState(prev => ({ ...prev, syncing: true }));

    try {
      const result = await unifiedSyncService.forceSync();
      
      if (result.success > 0) {
        toast({
          title: "Sincronização concluída",
          description: `${result.success} item(s) sincronizado(s)`,
        });
        
        setState(prev => ({ 
          ...prev, 
          lastSync: new Date().toLocaleTimeString('pt-BR')
        }));
      }

      if (result.failed > 0) {
        toast({
          title: "Sincronização parcial",
          description: `${result.failed} item(s) falharam`,
          variant: "destructive"
        });
      }

      if (result.success === 0 && result.failed === 0) {
        toast({
          title: "Nada para sincronizar",
          description: "Todos os dados estão atualizados",
        });
      }

      await refreshStats();
      
    } catch (error) {
      logger.error('Error in force sync:', error);
      toast({
        title: "Erro na sincronização",
        description: "Falha ao sincronizar dados",
        variant: "destructive"
      });
    } finally {
      setState(prev => ({ ...prev, syncing: false }));
    }
  };

  // Monitor de rede
  useEffect(() => {
    const unsubscribe = networkService.addStatusListener((status) => {
      setState(prev => ({ ...prev, isOnline: status.connected }));
      
      // Auto-sync quando reconectar se há itens pendentes
      if (status.connected && !state.syncing && state.stats.pending > 0) {
        logger.debug('🌐 Reconnected - auto syncing');
        setTimeout(() => forceSync(), 2000);
      }
    });

    return unsubscribe;
  }, [state.syncing, state.stats.pending]);

  // Atualizar stats periodicamente
  useEffect(() => {
    refreshStats();
    
    const interval = setInterval(refreshStats, 3000);
    return () => clearInterval(interval);
  }, []);

  return {
    ...state,
    refreshStats,
    forceSync
  };
}