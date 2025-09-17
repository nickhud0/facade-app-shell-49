/**
 * Hook para gerenciar sincronização offline → online
 * Mostra status da fila e permite forçar sync manual
 */

import { useState, useEffect } from 'react';
import { syncService } from '@/services/syncService';
import { networkService } from '@/services/networkService';
import { logger } from '@/utils/logger';
import { useToast } from '@/hooks/use-toast';

export interface SyncStats {
  pending: number;
  failed: number;
  total: number;
}

export interface SyncState {
  stats: SyncStats;
  syncing: boolean;
  isOnline: boolean;
}

export function useSyncService() {
  const { toast } = useToast();
  const [state, setState] = useState<SyncState>({
    stats: { pending: 0, failed: 0, total: 0 },
    syncing: false,
    isOnline: false
  });

  const refreshStats = async (): Promise<void> => {
    try {
      const stats = await syncService.getQueueStats();
      setState(prev => ({
        ...prev,
        stats,
        isOnline: networkService.getConnectionStatus()
      }));
    } catch (error) {
      logger.error('Error refreshing sync stats:', error);
    }
  };

  const forceSync = async (): Promise<void> => {
    if (state.syncing) return;

    setState(prev => ({ ...prev, syncing: true }));

    try {
      const result = await syncService.forceSync();
      
      if (result.success > 0) {
        toast({
          title: "Sincronização concluída",
          description: `${result.success} item(s) sincronizado(s) com sucesso`,
        });
      }

      if (result.failed > 0) {
        toast({
          title: "Sincronização parcial",
          description: `${result.failed} item(s) falharam na sincronização`,
          variant: "destructive"
        });
      }

      // Atualizar estatísticas
      await refreshStats();
      
    } catch (error) {
      logger.error('Error in force sync:', error);
      toast({
        title: "Erro na sincronização",
        description: "Não foi possível sincronizar os dados",
        variant: "destructive"
      });
    } finally {
      setState(prev => ({ ...prev, syncing: false }));
    }
  };

  // Monitor de mudanças na rede
  useEffect(() => {
    const unsubscribe = networkService.addStatusListener((status) => {
      setState(prev => ({ ...prev, isOnline: status.connected }));
      
      // Auto-sync quando voltar online
      if (status.connected && !state.syncing && state.stats.pending > 0) {
        logger.debug('🌐 Reconectado - iniciando sincronização automática');
        forceSync();
      }
    });

    return unsubscribe;
  }, [state.syncing, state.stats.pending]);

  // Atualizar estatísticas periodicamente
  useEffect(() => {
    refreshStats();
    
    const interval = setInterval(refreshStats, 5000); // A cada 5 segundos
    return () => clearInterval(interval);
  }, []);

  return {
    ...state,
    refreshStats,
    forceSync
  };
}