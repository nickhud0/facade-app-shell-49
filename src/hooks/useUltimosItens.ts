import { useState, useEffect, useCallback } from 'react';
import { databaseService } from '@/services/database';
import { supabaseService } from '@/services/supabase';
import { networkService } from '@/services/networkService';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export interface UltimoItem {
  id: number;
  data: string;
  nome_material: string;
  total_kg: number;
  total_item: number;
  tipo_transacao?: 'compra' | 'venda';
}

export interface UseUltimosItensReturn {
  ultimosItens: UltimoItem[];
  loading: boolean;
  isOnline: boolean;
  refreshUltimos: () => Promise<void>;
}

export function useUltimosItens(): UseUltimosItensReturn {
  const [ultimosItens, setUltimosItens] = useState<UltimoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const { toast } = useToast();

  // Carregar últimos 20 itens do cache local
  const loadCachedItens = useCallback(async () => {
    try {
      // Para dados offline, usar cache de transações se disponível
      const cachedTransacoes = await databaseService.getCachedTransacoes(20);
      
      const itensFormatados: UltimoItem[] = cachedTransacoes.map(transacao => ({
        id: transacao.id || Date.now(),
        data: transacao.created_at || new Date().toISOString(),
        nome_material: (transacao as any).material_nome || 'Material',
        total_kg: transacao.peso,
        total_item: transacao.valor_total,
        tipo_transacao: transacao.tipo
      }));

      setUltimosItens(itensFormatados);
      return itensFormatados;
    } catch (error) {
      console.error('Error loading cached ultimos itens:', error);
      return [];
    }
  }, []);

  // Query específica para Últimos Itens do Supabase
  const syncFromServer = useCallback(async () => {
    if (!supabaseService.getConnectionStatus() || !isOnline) return;

    try {
      const client = supabaseService.client;
      if (!client) return;

      // Query conforme especificado:
      // SELECT i.id, i.data, m.nome_material, i.total_kg, i.total_item
      // FROM item i
      // JOIN material m ON i.material_fk = m.id
      // ORDER BY i.data DESC
      // LIMIT 20;

      const { data, error } = await client
        .from('item')
        .select(`
          id,
          data,
          total_kg,
          total_item,
          material!inner(nome_material),
          comanda!inner(tipo)
        `)
        .order('data', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Transformar para formato local
      const itensFormatados: UltimoItem[] = (data || []).map(item => ({
        id: item.id,
        data: item.data,
        nome_material: (item.material as any).nome_material,
        total_kg: item.total_kg,
        total_item: item.total_item,
        tipo_transacao: (item.comanda as any).tipo
      }));

      setUltimosItens(itensFormatados);

      // Também atualizar cache local (como transações simplificadas)
      const transacoesCache = itensFormatados.map(item => ({
        id: item.id,
        tipo: item.tipo_transacao || 'venda',
        material_id: 1, // ID genérico já que não temos o ID do material
        peso: item.total_kg,
        valor_total: item.total_item,
        created_at: item.data
      }));

      await databaseService.cacheTransacoes(transacoesCache);

      toast({
        title: "Últimos itens sincronizados",
        description: `${itensFormatados.length} itens atualizados`,
      });

    } catch (error) {
      console.error('Error syncing ultimos itens:', error);
      toast({
        title: "Erro na sincronização",
        description: "Falha ao sincronizar últimos itens do servidor",
        variant: "destructive"
      });
    }
  }, [isOnline, toast]);

  // Refresh dos últimos itens
  const refreshUltimos = useCallback(async () => {
    setLoading(true);
    
    if (isOnline && supabaseService.getConnectionStatus()) {
      await syncFromServer();
    } else {
      await loadCachedItens();
    }
    
    setLoading(false);
  }, [isOnline, syncFromServer, loadCachedItens]);

  // Monitor de status da rede
  useEffect(() => {
    const handleNetworkChange = (status: { connected: boolean }) => {
      const wasOffline = !isOnline;
      setIsOnline(status.connected);
      
      // Se voltou online, sincronizar automaticamente
      if (status.connected && wasOffline && supabaseService.getConnectionStatus()) {
        logger.debug('Auto-syncing ultimos itens after coming back online...');
        syncFromServer().catch(err => 
          console.error('Error auto-syncing ultimos itens:', err)
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
    refreshUltimos();
  }, []);

  // Atualizar dados periodicamente quando online
  useEffect(() => {
    if (!isOnline) return;

    const interval = setInterval(() => {
      syncFromServer().catch(err => 
        console.error('Error periodic sync ultimos itens:', err)
      );
    }, 60000); // Atualizar a cada 1 minuto

    return () => clearInterval(interval);
  }, [isOnline, syncFromServer]);

  return {
    ultimosItens,
    loading,
    isOnline,
    refreshUltimos
  };
}