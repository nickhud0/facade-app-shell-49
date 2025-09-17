/**
 * Hook específico para dados de estoque
 * Usa view mv_estoque no Supabase quando disponível
 */

import { useState, useEffect } from 'react';
import { localDbService, EstoqueItem } from '@/services/localDbService';
import { supabaseService } from '@/services/supabaseService';
import { networkService } from '@/services/networkService';
import { logger } from '@/utils/logger';

export interface EstoqueResumo {
  totalKg: number;
  totalTipos: number;
  valorTotal: number;
}

export interface EstoqueState {
  itens: EstoqueItem[];
  resumo: EstoqueResumo;
  loading: boolean;
  error: string | null;
  isOnline: boolean;
  hasData: boolean;
  lastUpdate: string | null;
}

export function useEstoqueService() {
  const [state, setState] = useState<EstoqueState>({
    itens: [],
    resumo: { totalKg: 0, totalTipos: 0, valorTotal: 0 },
    loading: true,
    error: null,
    isOnline: false,
    hasData: false,
    lastUpdate: null
  });

  const loadEstoque = async (): Promise<void> => {
    let mounted = true;

    try {
      setState(prev => ({ 
        ...prev, 
        loading: true, 
        error: null,
        isOnline: networkService.getConnectionStatus()
      }));

      // 1. Carregar cache local primeiro
      const localData = await localDbService.getEstoque();
      
      if (mounted) {
        setState(prev => ({
          ...prev,
          itens: localData.itens,
          resumo: localData.resumo,
          hasData: localData.itens.length > 0,
          lastUpdate: localDbService.getLastUpdate('estoque')
        }));
      }

      // 2. Se online, sincronizar com servidor
      if (networkService.getConnectionStatus() && supabaseService.getConnectionStatus()) {
        try {
          const remoteData = await supabaseService.getEstoque();
          await localDbService.saveEstoque(remoteData.itens, remoteData.resumo);

          if (mounted) {
            setState(prev => ({
              ...prev,
              itens: remoteData.itens,
              resumo: remoteData.resumo,
              hasData: remoteData.itens.length > 0,
              lastUpdate: localDbService.getLastUpdate('estoque'),
              isOnline: true
            }));
          }

          logger.debug('✅ Estoque synced successfully');
        } catch (serverError) {
          logger.debug('Server sync failed for estoque, using cached data:', serverError);
        }
      }

    } catch (e) {
      logger.error('Error loading estoque:', e);
      if (mounted) {
        setState(prev => ({
          ...prev,
          error: 'Erro ao carregar estoque'
        }));
      }
    } finally {
      if (mounted) {
        setState(prev => ({ ...prev, loading: false }));
      }
    }
  };

  // Monitor de status da rede
  useEffect(() => {
    const unsubscribe = networkService.addStatusListener((status) => {
      setState(prev => ({ ...prev, isOnline: status.connected }));
      
      if (status.connected && !state.loading) {
        logger.debug('🌐 Reconectado - sincronizando estoque');
        loadEstoque();
      }
    });

    return unsubscribe;
  }, [state.loading]);

  // Carregar na inicialização
  useEffect(() => {
    loadEstoque();
  }, []);

  return {
    ...state,
    refresh: loadEstoque
  };
}