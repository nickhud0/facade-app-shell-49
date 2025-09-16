import { useState, useEffect, useCallback } from 'react';
import { databaseService, Vale } from '@/services/database';
import { supabaseService } from '@/services/supabase';
import { networkService } from '@/services/networkService';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export interface UseValesDataReturn {
  vales: Vale[];
  valesPendentes: Vale[];
  loading: boolean;
  isOnline: boolean;
  createVale: (vale: Omit<Vale, 'id'>) => Promise<boolean>;
  updateValeStatus: (id: number, status: Vale['status']) => Promise<boolean>;
  refreshVales: () => Promise<void>;
}

export function useValesData(): UseValesDataReturn {
  const [vales, setVales] = useState<Vale[]>([]);
  const [valesPendentes, setValesPendentes] = useState<Vale[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const { toast } = useToast();

  // Carregar vales do cache local
  const loadCachedVales = useCallback(async () => {
    try {
      const cachedVales = await databaseService.getCachedVales();
      setVales(cachedVales);
      
      // Filtrar vales pendentes
      const pendentes = cachedVales.filter(vale => vale.status === 'pendente');
      setValesPendentes(pendentes);
      
      return cachedVales;
    } catch (error) {
      console.error('Error loading cached vales:', error);
      return [];
    }
  }, []);

  // Sincronizar vales do servidor
  const syncFromServer = useCallback(async () => {
    if (!supabaseService.getConnectionStatus() || !isOnline) return;

    try {
      const client = supabaseService.client;
      if (!client) return;

      // Query conforme especificado:
      // SELECT * FROM vale WHERE status = 'pendente' ORDER BY data DESC;
      // (Vamos buscar todos primeiro, depois filtrar)
      
      const { data, error } = await client
        .from('vale')
        .select('*')
        .order('data', { ascending: false });

      if (error) throw error;

      // Transformar para formato local
      const valesFormatados: Vale[] = (data || []).map(vale => ({
        id: vale.id,
        valor: vale.valor,
        descricao: vale.descricao,
        status: vale.status,
        created_at: vale.data || vale.created_at
      }));

      // Atualizar cache local
      await databaseService.cacheVales(valesFormatados);
      setVales(valesFormatados);

      // Filtrar vales pendentes
      const pendentes = valesFormatados.filter(vale => vale.status === 'pendente');
      setValesPendentes(pendentes);

      toast({
        title: "Vales sincronizados",
        description: `${pendentes.length} vales pendentes`,
      });

    } catch (error) {
      console.error('Error syncing vales:', error);
      toast({
        title: "Erro na sincronização",
        description: "Falha ao sincronizar vales do servidor",
        variant: "destructive"
      });
    }
  }, [isOnline, toast]);

  // Criar novo vale (offline-first)
  const createVale = useCallback(async (vale: Omit<Vale, 'id'>): Promise<boolean> => {
    try {
      const now = new Date().toISOString();
      const novoVale: Vale = {
        ...vale,
        id: Date.now(), // ID temporário para cache local
        created_at: now
      };

      // Adicionar ao cache local primeiro
      await databaseService.addValeToCache(novoVale);
      
      // Adicionar à fila de sincronização
      await databaseService.addToSyncQueue('criar_vale', {
        valor: vale.valor,
        descricao: vale.descricao,
        status: vale.status,
        data: now
      });
      
      // Se online, tentar sincronizar imediatamente
      if (isOnline && supabaseService.getConnectionStatus()) {
        const syncResult = await supabaseService.processSyncQueue();
        if (syncResult.success > 0) {
          await syncFromServer(); // Atualizar com dados do servidor
        }
      }
      
      // Recarregar cache
      await loadCachedVales();
      
      toast({
        title: "Vale criado",
        description: isOnline ? "Vale salvo no servidor" : "Será sincronizado quando conectar",
      });
      
      return true;
    } catch (error) {
      console.error('Error creating vale:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar vale",
        variant: "destructive"
      });
      return false;
    }
  }, [isOnline, syncFromServer, loadCachedVales, toast]);

  // Atualizar status do vale
  const updateValeStatus = useCallback(async (id: number, status: Vale['status']): Promise<boolean> => {
    try {
      // Atualizar cache local primeiro
      const valesAtualizados = vales.map(vale => 
        vale.id === id ? { ...vale, status } : vale
      );
      setVales(valesAtualizados);
      
      // Filtrar pendentes
      const pendentes = valesAtualizados.filter(vale => vale.status === 'pendente');
      setValesPendentes(pendentes);
      
      // Adicionar à fila de sincronização
      await databaseService.addToSyncQueue('atualizar_vale', { id, status });
      
      // Se online, tentar sincronizar imediatamente
      if (isOnline && supabaseService.getConnectionStatus()) {
        const syncResult = await supabaseService.processSyncQueue();
        if (syncResult.success > 0) {
          await syncFromServer(); // Atualizar com dados do servidor
        }
      }
      
      toast({
        title: "Vale atualizado",
        description: `Status alterado para: ${status}`,
      });
      
      return true;
    } catch (error) {
      console.error('Error updating vale status:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar vale",
        variant: "destructive"
      });
      return false;
    }
  }, [vales, isOnline, syncFromServer, toast]);

  // Refresh dos vales
  const refreshVales = useCallback(async () => {
    setLoading(true);
    
    if (isOnline && supabaseService.getConnectionStatus()) {
      await syncFromServer();
    } else {
      await loadCachedVales();
    }
    
    setLoading(false);
  }, [isOnline, syncFromServer, loadCachedVales]);

  // Monitor de status da rede
  useEffect(() => {
    const handleNetworkChange = (status: { connected: boolean }) => {
      const wasOffline = !isOnline;
      setIsOnline(status.connected);
      
      // Se voltou online, sincronizar automaticamente
      if (status.connected && wasOffline && supabaseService.getConnectionStatus()) {
        logger.debug('Auto-syncing vales after coming back online...');
        syncFromServer().catch(err => 
          console.error('Error auto-syncing vales:', err)
        );
      }
    };

    networkService.addStatusListener(handleNetworkChange);
    setIsOnline(networkService.getConnectionStatus());

    return () => {
      networkService.removeStatusListener(handleNetworkChange);
    };
  }, [isOnline, syncFromServer]);

  // Carregar dados iniciais
  useEffect(() => {
    refreshVales();
  }, []);

  return {
    vales,
    valesPendentes,
    loading,
    isOnline,
    createVale,
    updateValeStatus,
    refreshVales
  };
}