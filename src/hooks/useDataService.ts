/**
 * Hook padronizado para carregamento offline-first
 * Implementa o padrão: cache local → dados remotos → sincronização
 */

import { useState, useEffect } from 'react';
import { localDbService } from '@/services/localDbService';
import { supabaseService } from '@/services/supabaseService';
import { offlineQueueService } from '@/services/offlineQueue';
import { networkService } from '@/services/networkService';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export interface UseDataServiceOptions {
  loadOnMount?: boolean;
  refreshInterval?: number;
}

export interface DataState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  isOnline: boolean;
  hasData: boolean;
  lastUpdate: string | null;
}

export function useDataService<T>(
  dataType: 'materiais' | 'transacoes' | 'vales' | 'despesas',
  options: UseDataServiceOptions = {}
) {
  const { loadOnMount = true, refreshInterval } = options;
  const { toast } = useToast();
  
  const [state, setState] = useState<DataState<T>>({
    data: [],
    loading: true,
    error: null,
    isOnline: false,
    hasData: false,
    lastUpdate: null
  });

  // Função para carregar dados seguindo o padrão offline-first
  const loadData = async (): Promise<void> => {
    let mounted = true;

    try {
      setState(prev => ({ 
        ...prev, 
        loading: true, 
        error: null,
        isOnline: networkService.getConnectionStatus()
      }));

      // 1. Carregar cache local primeiro (sempre rápido)
      let localData: T[] = [];
      switch (dataType) {
        case 'materiais':
          localData = await localDbService.getMateriais() as T[];
          break;
        case 'transacoes':
          localData = await localDbService.getTransacoes() as T[];
          break;
        case 'vales':
          localData = await localDbService.getVales() as T[];
          break;
        case 'despesas':
          localData = await localDbService.getDespesas() as T[];
          break;
      }

      if (mounted) {
        setState(prev => ({
          ...prev,
          data: localData,
          hasData: localData.length > 0,
          lastUpdate: localDbService.getLastUpdate(dataType)
        }));
      }

      // 2. Se online, tentar sincronizar com servidor
      if (networkService.getConnectionStatus() && supabaseService.getConnectionStatus()) {
        try {
          let remoteData: T[] = [];
          switch (dataType) {
            case 'materiais':
              remoteData = await supabaseService.getMateriais() as T[];
              await localDbService.saveMateriais(remoteData as any);
              break;
            case 'transacoes':
              remoteData = await supabaseService.getTransacoes() as T[];
              await localDbService.saveTransacoes(remoteData as any);
              break;
            case 'vales':
              remoteData = await supabaseService.getVales() as T[];
              await localDbService.saveVales(remoteData as any);
              break;
            case 'despesas':
              remoteData = await supabaseService.getDespesas() as T[];
              await localDbService.saveDespesas(remoteData as any);
              break;
          }

          if (mounted) {
            setState(prev => ({
              ...prev,
              data: remoteData,
              hasData: remoteData.length > 0,
              lastUpdate: localDbService.getLastUpdate(dataType),
              isOnline: true
            }));
          }

          logger.debug(`✅ ${dataType} synced successfully`);
        } catch (serverError) {
          logger.debug(`Server sync failed for ${dataType}, using cached data:`, serverError);
          // Não é erro crítico - continua com dados do cache
        }
      }

    } catch (e) {
      logger.error(`Error loading ${dataType}:`, e);
      if (mounted) {
        setState(prev => ({
          ...prev,
          error: `Erro ao carregar ${dataType}`
        }));
      }
    } finally {
      if (mounted) {
        setState(prev => ({ ...prev, loading: false }));
      }
    }
  };

  // Função para criar novo item
  const createItem = async (item: Omit<T, 'id'>): Promise<boolean> => {
    try {
      // 1. Salvar localmente primeiro
      let localId: number;
      switch (dataType) {
        case 'materiais':
          localId = await localDbService.addMaterial(item as any);
          break;
        case 'transacoes':
          localId = await localDbService.addTransacao(item as any);
          break;
        case 'vales':
          localId = await localDbService.addVale(item as any);
          break;
        case 'despesas':
          localId = await localDbService.addDespesa(item as any);
          break;
        default:
          return false;
      }

      // 2. Adicionar à fila de sincronização
      await offlineQueueService.addToQueue(dataType.slice(0, -1), 'create', item);

      // 3. Recarregar dados para mostrar na UI
      await loadData();

      toast({
        title: "Sucesso",
        description: `${dataType.slice(0, -1)} criado com sucesso`,
      });

      return true;
    } catch (error) {
      logger.error(`Error creating ${dataType}:`, error);
      toast({
        title: "Erro",
        description: `Erro ao criar ${dataType.slice(0, -1)}`,
        variant: "destructive"
      });
      return false;
    }
  };

  // Função para atualizar item
  const updateItem = async (id: number, updates: Partial<T>): Promise<boolean> => {
    try {
      // 1. Atualizar localmente primeiro
      switch (dataType) {
        case 'materiais':
          await localDbService.updateMaterial(id, updates as any);
          break;
        case 'vales':
          await localDbService.updateVale(id, updates as any);
          break;
        default:
          return false;
      }

      // 2. Adicionar à fila de sincronização
      await offlineQueueService.addToQueue(dataType.slice(0, -1), 'update', { id, ...updates });

      // 3. Recarregar dados
      await loadData();

      toast({
        title: "Sucesso",
        description: `${dataType.slice(0, -1)} atualizado com sucesso`,
      });

      return true;
    } catch (error) {
      logger.error(`Error updating ${dataType}:`, error);
      toast({
        title: "Erro",
        description: `Erro ao atualizar ${dataType.slice(0, -1)}`,
        variant: "destructive"
      });
      return false;
    }
  };

  // Monitor de status da rede
  useEffect(() => {
    const unsubscribe = networkService.addStatusListener((status) => {
      setState(prev => ({ ...prev, isOnline: status.connected }));
      
      // Auto-sync quando voltar online
      if (status.connected && !state.loading) {
        logger.debug(`🌐 Reconectado - sincronizando ${dataType}`);
        loadData();
      }
    });

    return unsubscribe;
  }, [dataType, state.loading]);

  // Carregar dados na inicialização
  useEffect(() => {
    if (loadOnMount) {
      loadData();
    }
  }, [dataType, loadOnMount]);

  // Refresh periódico
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(() => {
        if (networkService.getConnectionStatus()) {
          loadData();
        }
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  return {
    ...state,
    refresh: loadData,
    createItem,
    updateItem
  };
}