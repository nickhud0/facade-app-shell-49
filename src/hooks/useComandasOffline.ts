import { useState, useCallback, useEffect } from 'react';
import { databaseService, Comanda } from '@/services/database';
import { databaseV2Service } from '@/services/databaseV2';
import { supabaseService } from '@/services/supabase';
import { networkService } from '@/services/networkService';
import { useToast } from '@/hooks/use-toast';

export interface UseComandasOfflineReturn {
  // Cache local (últimas 20)
  comandasCache: Comanda[];
  loadingCache: boolean;
  
  // Busca (cache local quando offline, servidor quando online)
  resultadosBusca: Comanda[];
  loadingBusca: boolean;
  
  // Status
  isOnline: boolean;
  pendingSyncCount: number;
  
  // Métodos
  criarComanda: (comanda: Omit<Comanda, 'id'>) => Promise<boolean>;
  buscarComandas: (termo: string) => Promise<void>;
  buscarComandaPorNumero: (numero: string) => Promise<Comanda | null>;
  refreshCache: () => Promise<void>;
  syncPendingComandas: () => Promise<{ success: number; failed: number }>;
}

export function useComandasOffline(): UseComandasOfflineReturn {
  const [comandasCache, setComandasCache] = useState<Comanda[]>([]);
  const [loadingCache, setLoadingCache] = useState(true);
  const [resultadosBusca, setResultadosBusca] = useState<Comanda[]>([]);
  const [loadingBusca, setLoadingBusca] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const { toast } = useToast();

  // Carregar cache local (ordenado por data decrescente)
  const loadCache = useCallback(async () => {
    try {
      const comandas = await databaseService.getCachedComandas(20);
      // Garantir ordenação decrescente por data de criação
      const comandasOrdenadas = comandas.sort((a, b) => 
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
      setComandasCache(comandasOrdenadas);
    } catch (error) {
      console.error('Error loading comandas cache:', error);
    } finally {
      setLoadingCache(false);
    }
  }, []);

  // Sincronizar do servidor e atualizar cache local (últimas 20)
  const syncFromServer = useCallback(async () => {
    if (!supabaseService.getConnectionStatus()) return false;

    try {
      await supabaseService.syncAllData();
      await loadCache();
      return true;
    } catch (error) {
      console.error('Error syncing comandas from server:', error);
      return false;
    }
  }, [loadCache]);

  // Refresh do cache (tenta sincronizar se online, senão carrega cache local)
  const refreshCache = useCallback(async () => {
    setLoadingCache(true);
    
    if (isOnline && supabaseService.getConnectionStatus()) {
      const synced = await syncFromServer();
      if (!synced) {
        await loadCache();
      }
    } else {
      await loadCache();
    }
    
    setLoadingCache(false);
  }, [isOnline, syncFromServer, loadCache]);

  // Criar comanda (offline-first)
  const criarComanda = useCallback(async (comanda: any): Promise<boolean> => {
    try {
      const now = new Date().toISOString();
      
      // Preparar dados da comanda com todos os campos necessários
      const novaComanda = {
        ...comanda,
        id: comanda.id || Date.now(), // Usar ID fornecido ou gerar temporário
        created_at: comanda.created_at || now,
        updated_at: now
      };

      // Se usando databaseV2, salvar com a nova estrutura
      if (databaseV2Service && typeof databaseV2Service.saveComanda === 'function') {
        // Preparar dados da comanda para databaseV2
        const comandaData = {
          id: novaComanda.id,
          numero: novaComanda.numero,
          prefixo_dispositivo: novaComanda.prefixo_dispositivo,
          numero_local: novaComanda.numero_local,
          tipo: novaComanda.tipo,
          total: novaComanda.total,
          status: novaComanda.status || 'aberta',
          cliente: novaComanda.cliente,
          dispositivo: novaComanda.dispositivo,
          observacoes: novaComanda.observacoes,
          created_at: novaComanda.created_at,
          updated_at: novaComanda.updated_at
        };

        // Preparar itens
        const itensData = (novaComanda.itens || []).map((item: any, index: number) => ({
          material_id: item.material_id || index + 1,
          material_nome: item.material || item.material_nome,
          preco: item.preco,
          quantidade: item.quantidade,
          total: item.total
        }));

        // Salvar no databaseV2
        await databaseV2Service.saveComanda(comandaData, itensData);

        // Adicionar à fila de sincronização
        await databaseV2Service.addToSyncQueue('criar_comanda', {
          comanda: comandaData,
          itens: itensData
        });
      } else {
        // Fallback para o sistema antigo
        await databaseService.addComandaToCache(novaComanda);
        await databaseService.addToSyncQueue('criar_comanda', comanda);
      }
      
      // Se online, tentar sincronizar imediatamente
      if (isOnline && supabaseService.getConnectionStatus()) {
        const syncResult = await supabaseService.processSyncQueue();
        if (syncResult.success > 0) {
          await syncFromServer(); // Atualizar com dados do servidor
        }
      }
      
      // Recarregar cache
      await loadCache();
      
      toast({
        title: "Comanda criada",
        description: isOnline ? "Comanda salva no servidor" : "Será sincronizada quando conectar",
      });
      
      return true;
    } catch (error) {
      console.error('Error creating comanda:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar comanda",
        variant: "destructive"
      });
      return false;
    }
  }, [isOnline, syncFromServer, loadCache, toast]);

  // Buscar comandas (cache local quando offline, servidor quando online)
  const buscarComandas = useCallback(async (termo: string) => {
    setLoadingBusca(true);
    setResultadosBusca([]);

    try {
      if (!termo.trim()) {
        // Se não há termo de busca, mostrar cache local
        setResultadosBusca(comandasCache);
        return;
      }

      if (isOnline && supabaseService.getConnectionStatus()) {
        // Online: buscar no servidor (histórico completo)
        const resultados = await supabaseService.searchComandas(termo, 50);
        setResultadosBusca(resultados);
        
        if (resultados.length === 0) {
          toast({
            title: "Nenhum resultado",
            description: "Nenhuma comanda encontrada com este termo",
          });
        }
      } else {
        // Offline: buscar no cache local (últimas 20)
        const resultados = await databaseService.searchCachedComandas(termo);
        setResultadosBusca(resultados);
        
        if (resultados.length === 0) {
          toast({
            title: "Nenhum resultado no cache",
            description: "Conecte-se à internet para buscar no histórico completo",
          });
        }
      }
    } catch (error) {
      console.error('Error searching comandas:', error);
      toast({
        title: "Erro na busca",
        description: "Erro ao buscar comandas",
        variant: "destructive"
      });
    } finally {
      setLoadingBusca(false);
    }
  }, [isOnline, comandasCache, toast]);

  // Buscar comanda específica por número (otimizado)
  const buscarComandaPorNumero = useCallback(async (numero: string): Promise<Comanda | null> => {
    try {
      // Primeiro tentar no cache local (mais rápido)
      const comandaNoCache = comandasCache.find(c => c.numero === numero);
      if (comandaNoCache) {
        return comandaNoCache;
      }
      
      // Depois tentar no banco local
      let comanda = await databaseService.getComandaByNumero(numero);
      
      if (!comanda && isOnline && supabaseService.getConnectionStatus()) {
        // Se não encontrou e está online, buscar no servidor
        const resultados = await supabaseService.searchComandas(numero, 1);
        comanda = resultados.find(c => c.numero === numero) || null;
      }
      
      return comanda;
    } catch (error) {
      console.error('Error finding comanda by numero:', error);
      return null;
    }
  }, [isOnline, comandasCache]);

  // Sincronizar comandas pendentes
  const syncPendingComandas = useCallback(async (): Promise<{ success: number; failed: number }> => {
    if (!isOnline || !supabaseService.getConnectionStatus()) {
      return { success: 0, failed: 0 };
    }

    try {
      const result = await supabaseService.processSyncQueue();
      
      if (result.success > 0) {
        await refreshCache();
        toast({
          title: "Sincronização completa",
          description: `${result.success} comandas sincronizadas`,
        });
      }
      
      if (result.failed > 0) {
        toast({
          title: "Falha na sincronização",
          description: `${result.failed} comandas falharam`,
          variant: "destructive"
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error syncing pending comandas:', error);
      return { success: 0, failed: 0 };
    }
  }, [isOnline, refreshCache, toast]);

  // Monitor de status da rede
  useEffect(() => {
    const handleNetworkChange = (status: { connected: boolean }) => {
      const wasOffline = !isOnline;
      setIsOnline(status.connected);
      
      // Se voltou online, sincronizar automaticamente
      if (status.connected && wasOffline && supabaseService.getConnectionStatus()) {
        console.log('Auto-syncing comandas after coming back online...');
        syncPendingComandas().catch(err => 
          console.error('Error auto-syncing comandas:', err)
        );
      }
    };

    networkService.addStatusListener(handleNetworkChange);
    setIsOnline(networkService.getConnectionStatus());

    return () => {
      networkService.removeStatusListener(handleNetworkChange);
    };
  }, [isOnline, syncPendingComandas]);

  // Atualizar contador de itens pendentes
  useEffect(() => {
    const updatePendingCount = async () => {
      const count = await networkService.getPendingSyncCount();
      setPendingSyncCount(count);
    };

    updatePendingCount();
    const interval = setInterval(updatePendingCount, 5000);

    return () => clearInterval(interval);
  }, []);

  // Carregar cache inicial
  useEffect(() => {
    refreshCache();
  }, []);

  // Listener para recarregar quando houver mudanças nos dados
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loadingCache && !loadingBusca) {
        loadCache();
      }
    }, 2000); // Recarrega cache a cada 2 segundos

    return () => clearInterval(interval);
  }, [loadingCache, loadingBusca, loadCache]);

  return {
    comandasCache,
    loadingCache,
    resultadosBusca,
    loadingBusca,
    isOnline,
    pendingSyncCount,
    criarComanda,
    buscarComandas,
    buscarComandaPorNumero,
    refreshCache,
    syncPendingComandas
  };
}