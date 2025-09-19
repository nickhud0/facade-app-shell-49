/**
 * HOOK UNIVERSAL PARA DADOS OFFLINE
 * Funciona 100% offline com sincronização automática
 */

import { useState, useEffect, useCallback } from 'react';
import { offlineStorage } from '@/services/offlineStorage';
import { supabaseService } from '@/services/supabaseService';
import { networkService } from '@/services/networkService';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export interface UseOfflineStorageOptions {
  autoSync?: boolean;
  refreshInterval?: number;
}

export interface OfflineDataState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  isOnline: boolean;
  hasData: boolean;
  lastUpdate: string | null;
  pendingSync: number;
}

export function useOfflineStorage<T>(
  dataType: 'materiais' | 'transacoes' | 'vales' | 'despesas' | 'pendencias' | 'comandas',
  options: UseOfflineStorageOptions = {}
) {
  const { autoSync = true, refreshInterval } = options;
  const { toast } = useToast();
  
  const [state, setState] = useState<OfflineDataState<T>>({
    data: [],
    loading: true,
    error: null,
    isOnline: false,
    hasData: false,
    lastUpdate: null,
    pendingSync: 0
  });

  // Carregar dados offline
  const loadOfflineData = useCallback(async () => {
    try {
      let data: T[] = [];
      
      switch (dataType) {
        case 'materiais':
          data = await offlineStorage.getMateriais() as T[];
          break;
        case 'transacoes':
          data = await offlineStorage.getTransacoes() as T[];
          break;
        case 'vales':
          data = await offlineStorage.getVales() as T[];
          break;
        case 'despesas':
          data = await offlineStorage.getDespesas() as T[];
          break;
        case 'pendencias':
          data = await offlineStorage.getPendencias() as T[];
          break;
        case 'comandas':
          data = await offlineStorage.getComandas() as T[];
          break;
      }

      const pendingSync = await offlineStorage.getPendingCount();
      
      setState(prev => ({
        ...prev,
        data,
        hasData: data.length > 0,
        lastUpdate: offlineStorage.getLastUpdate(dataType),
        pendingSync,
        error: null
      }));

      return data;
    } catch (error) {
      logger.error(`Error loading offline ${dataType}:`, error);
      setState(prev => ({
        ...prev,
        error: `Erro ao carregar ${dataType}`
      }));
      return [];
    }
  }, [dataType]);

  // Sincronizar com servidor
  const syncWithServer = useCallback(async () => {
    if (!networkService.getConnectionStatus() || !supabaseService.getConnectionStatus()) {
      return;
    }

    try {
      let serverData: T[] = [];
      
      switch (dataType) {
        case 'materiais':
          serverData = await supabaseService.getMateriais() as T[];
          await offlineStorage.saveMateriais(serverData as any);
          break;
        case 'transacoes':
          serverData = await supabaseService.getTransacoes() as T[];
          await offlineStorage.saveTransacoes(serverData as any);
          break;
        case 'vales':
          serverData = await supabaseService.getVales() as T[];
          await offlineStorage.saveVales(serverData as any);
          break;
        case 'despesas':
          serverData = await supabaseService.getDespesas() as T[];
          await offlineStorage.saveDespesas(serverData as any);
          break;
        case 'pendencias':
          // Pendências vêm como despesas no Supabase
          serverData = await supabaseService.getDespesas() as T[];
          await offlineStorage.savePendencias(serverData as any);
          break;
        case 'comandas':
          // Comandas não têm método específico, usar cache offline apenas
          return;
          break;
      }

      await loadOfflineData();
      logger.debug(`✅ ${dataType} synced from server`);
    } catch (error) {
      logger.debug(`Server sync failed for ${dataType}, using cached data:`, error);
    }
  }, [dataType, loadOfflineData]);

  // Refresh completo
  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    // Sempre carregar dados offline primeiro
    await loadOfflineData();

    // Se online, sincronizar com servidor
    if (autoSync && networkService.getConnectionStatus()) {
      await syncWithServer();
    }

    setState(prev => ({ ...prev, loading: false }));
  }, [loadOfflineData, syncWithServer, autoSync]);

  // Criar item
  const createItem = useCallback(async (item: Omit<T, 'id'>): Promise<boolean> => {
    try {
      switch (dataType) {
        case 'materiais':
          await offlineStorage.addMaterial(item as any);
          break;
        case 'transacoes':
          await offlineStorage.addTransacao(item as any);
          break;
        case 'vales':
          await offlineStorage.addVale(item as any);
          break;
        case 'despesas':
          await offlineStorage.addDespesa(item as any);
          break;
        case 'pendencias':
          await offlineStorage.addPendencia(item as any);
          break;
        case 'comandas':
          await offlineStorage.addComanda(item as any);
          break;
        default:
          return false;
      }

      await loadOfflineData();
      
      toast({
        title: "Sucesso",
        description: `${dataType.slice(0, -1)} criado(a) com sucesso`,
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
  }, [dataType, loadOfflineData, toast]);

  // Atualizar item
  const updateItem = useCallback(async (id: number, updates: Partial<T>): Promise<boolean> => {
    try {
      switch (dataType) {
        case 'materiais':
          await offlineStorage.updateMaterial(id, updates as any);
          break;
        case 'vales':
          await offlineStorage.updateVale(id, updates as any);
          break;
        case 'pendencias':
          await offlineStorage.updatePendencia(id, updates as any);
          break;
        case 'comandas':
          await offlineStorage.updateComanda(id, updates as any);
          break;
        default:
          return false;
      }

      await loadOfflineData();
      
      toast({
        title: "Sucesso",
        description: `${dataType.slice(0, -1)} atualizado(a) com sucesso`,
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
  }, [dataType, loadOfflineData, toast]);

  // Monitor de rede
  useEffect(() => {
    const unsubscribe = networkService.addStatusListener((status) => {
      setState(prev => ({ ...prev, isOnline: status.connected }));
      
      // Auto-sync quando voltar online
      if (autoSync && status.connected && !state.loading) {
        logger.debug(`🌐 Reconectado - sincronizando ${dataType}`);
        syncWithServer();
      }
    });

    setState(prev => ({ ...prev, isOnline: networkService.getConnectionStatus() }));
    return unsubscribe;
  }, [dataType, autoSync, syncWithServer, state.loading]);

  // Carregar dados na inicialização
  useEffect(() => {
    refresh();
  }, [dataType]);

  // Refresh periódico
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(() => {
        if (networkService.getConnectionStatus()) {
          syncWithServer();
        } else {
          loadOfflineData();
        }
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [refreshInterval, syncWithServer, loadOfflineData]);

  return {
    ...state,
    refresh,
    createItem,
    updateItem,
    syncWithServer
  };
}