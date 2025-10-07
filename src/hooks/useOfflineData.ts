import { useState, useEffect, useCallback } from 'react';
import { databaseService, Material, Transacao, Vale, Despesa, Pendencia, Comanda } from '@/services/database';
import { supabaseService } from '@/services/supabase';
import { networkService } from '@/services/networkService';
import { useToast } from '@/hooks/use-toast';

export interface UseOfflineDataReturn<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  isOnline: boolean;
  pendingSyncCount: number;
  refreshData: () => Promise<void>;
  createItem: (item: Omit<T, 'id'>) => Promise<boolean>;
  updateItem: (id: number, item: Partial<T>) => Promise<boolean>;
  deleteItem?: (id: number) => Promise<boolean>;
}

type DataType = 'materiais' | 'transacoes' | 'vales' | 'despesas' | 'pendencias' | 'comandas';

const actionMap = {
  materiais: {
    create: 'criar_material',
    update: 'atualizar_material',
    delete: 'deletar_material'
  },
  transacoes: {
    create: 'criar_transacao',
    update: 'atualizar_transacao',
    delete: 'deletar_transacao'
  },
  vales: {
    create: 'criar_vale',
    update: 'atualizar_vale',
    delete: 'deletar_vale'
  },
  despesas: {
    create: 'criar_despesa',
    update: 'atualizar_despesa',
    delete: 'deletar_despesa'
  },
  pendencias: {
    create: 'criar_pendencia',
    update: 'atualizar_pendencia',
    delete: 'deletar_pendencia'
  },
  comandas: {
    create: 'criar_comanda',
    update: 'atualizar_comanda',
    delete: 'deletar_comanda'
  }
};

export function useOfflineData<T>(dataType: DataType): UseOfflineDataReturn<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const { toast } = useToast();

  // Buscar dados do cache local
  const loadCachedData = useCallback(async () => {
    try {
      let cachedData: any[] = [];
      
      switch (dataType) {
        case 'materiais':
          cachedData = await databaseService.getCachedMateriais();
          break;
        case 'transacoes':
          cachedData = await databaseService.getCachedTransacoes();
          break;
        case 'vales':
          cachedData = await databaseService.getCachedVales();
          break;
        case 'despesas':
          cachedData = await databaseService.getCachedDespesas();
          break;
        case 'pendencias':
          cachedData = await databaseService.getCachedPendencias();
          break;
        case 'comandas':
          cachedData = await databaseService.getCachedComandas();
          break;
      }
      
      setData(cachedData as T[]);
    } catch (err) {
      console.error(`Error loading cached ${dataType}:`, err);
      setError(`Erro ao carregar ${dataType} do cache local`);
    }
  }, [dataType]);

  // Sincronizar dados do servidor
  const syncFromServer = useCallback(async () => {
    if (!supabaseService.getConnectionStatus()) return;

    try {
      await supabaseService.syncAllData();
      await loadCachedData();
      toast({
        title: "Dados sincronizados",
        description: "Dados atualizados com sucesso do servidor",
      });
    } catch (err) {
      console.error('Error syncing from server:', err);
      // Não mostrar erro se temos dados em cache
      if (data.length === 0) {
        setError('Erro ao sincronizar dados do servidor');
      }
    }
  }, [loadCachedData, data.length, toast]);

  // Refresh dos dados
  const refreshData = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (isOnline && supabaseService.getConnectionStatus()) {
      await syncFromServer();
    } else {
      await loadCachedData();
    }

    setLoading(false);
  }, [isOnline, syncFromServer, loadCachedData]);

  // Criar item (offline-first)
  const createItem = useCallback(async (item: Omit<T, 'id'>): Promise<boolean> => {
    try {
      // Adicionar diretamente ao cache local primeiro
      if (dataType === 'materiais') {
        await databaseService.addMaterialToCache(item as any);
      }
      
      const actionType = actionMap[dataType].create;
      
      // Adicionar à fila de sincronização
      await databaseService.addToSyncQueue(actionType, item);
      
      // Se online, tentar sincronizar imediatamente
      if (isOnline && supabaseService.getConnectionStatus()) {
        const syncResult = await supabaseService.processSyncQueue();
        if (syncResult.success > 0) {
          await syncFromServer(); // Atualizar cache com dados do servidor
        }
      }
      
      // Recarregar dados do cache
      await loadCachedData();
      
      toast({
        title: "Item criado",
        description: isOnline ? "Item salvo no servidor" : "Item será sincronizado quando conectar",
      });
      
      return true;
    } catch (err) {
      console.error('Error creating item:', err);
      toast({
        title: "Erro",
        description: "Erro ao criar item",
        variant: "destructive"
      });
      return false;
    }
  }, [dataType, isOnline, syncFromServer, toast]);

  // Atualizar item (offline-first)
  const updateItem = useCallback(async (id: number, item: Partial<T>): Promise<boolean> => {
    try {
      // Primeiro, atualizar diretamente no cache local para feedback imediato
      if (dataType === 'materiais') {
        // Atualizar material específico no cache local usando método otimizado
        await databaseService.updateMaterialInCache(id, item as Partial<Material>);
        
        // Recarregar dados atualizados para o estado local
        const updatedData = await databaseService.getCachedMateriais();
        setData(updatedData as T[]);
      }
      
      const actionType = actionMap[dataType].update;
      
      // Adicionar à fila de sincronização
      await databaseService.addToSyncQueue(actionType, { id, ...item });
      
      // Se online, tentar sincronizar imediatamente
      if (isOnline && supabaseService.getConnectionStatus()) {
        const syncResult = await supabaseService.processSyncQueue();
        if (syncResult.success > 0) {
          await syncFromServer(); // Isso irá atualizar com os dados mais recentes do servidor
        }
      }
      
      toast({
        title: "Item atualizado",
        description: isOnline ? "Item atualizado no servidor" : "Será sincronizado quando conectar",
      });
      
      return true;
    } catch (err) {
      console.error('Error updating item:', err);
      toast({
        title: "Erro",
        description: "Erro ao atualizar item",
        variant: "destructive"
      });
      return false;
    }
  }, [dataType, isOnline, syncFromServer, loadCachedData, toast]);

  // Deletar item (offline-first) - se aplicável
  const deleteItem = useCallback(async (id: number): Promise<boolean> => {
    if (!actionMap[dataType].delete) return false;
    
    try {
      const actionType = actionMap[dataType].delete;
      
      // Adicionar à fila de sincronização
      await databaseService.addToSyncQueue(actionType, { id });
      
      // Se online, tentar sincronizar imediatamente
      if (isOnline && supabaseService.getConnectionStatus()) {
        const syncResult = await supabaseService.processSyncQueue();
        if (syncResult.success > 0) {
          await syncFromServer();
        }
      }
      
      // Recarregar dados do cache após remover
      await loadCachedData();
      
      toast({
        title: "Item removido",
        description: isOnline ? "Item removido do servidor" : "Será sincronizado quando conectar",
      });
      
      return true;
    } catch (err) {
      console.error('Error deleting item:', err);
      toast({
        title: "Erro",
        description: "Erro ao remover item",
        variant: "destructive"
      });
      return false;
    }
  }, [dataType, isOnline, syncFromServer, toast]);

  // Monitor de status da rede
  useEffect(() => {
    const handleNetworkChange = (status: { connected: boolean }) => {
      const wasOffline = !isOnline;
      setIsOnline(status.connected);
      
      // Se voltou online e era offline antes, sincronizar automaticamente
      if (status.connected && wasOffline && supabaseService.getConnectionStatus()) {
        console.log(`Auto-syncing ${dataType} after coming back online...`);
        syncFromServer().catch(err => 
          console.error(`Error auto-syncing ${dataType}:`, err)
        );
      }
    };

    networkService.addStatusListener(handleNetworkChange);
    setIsOnline(networkService.getConnectionStatus());

    return () => {
      networkService.removeStatusListener(handleNetworkChange);
    };
  }, [isOnline, dataType, syncFromServer]);

  // Atualizar contador de itens pendentes
  useEffect(() => {
    const updatePendingCount = async () => {
      const count = await networkService.getPendingSyncCount();
      setPendingSyncCount(count);
    };

    updatePendingCount();
    const interval = setInterval(updatePendingCount, 5000); // Atualizar a cada 5 segundos

    return () => clearInterval(interval);
  }, []);

  // Carregar dados iniciais
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return {
    data,
    loading,
    error,
    isOnline,
    pendingSyncCount,
    refreshData,
    createItem,
    updateItem,
    ...(actionMap[dataType].delete && { deleteItem })
  } as UseOfflineDataReturn<T>;
}