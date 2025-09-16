import { useState, useEffect, useCallback } from 'react';
import { databaseService, Comanda } from '@/services/database';
import { supabaseService } from '@/services/supabase';
import { networkService } from '@/services/networkService';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export interface ComandaDetalhada extends Comanda {
  dispositivo_update?: string;
  data: string;
}

export interface UseComandaHistoryReturn {
  comandas: ComandaDetalhada[];
  loading: boolean;
  isOnline: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  getComandaDetalhes: (id: number) => Promise<ComandaDetalhada | null>;
  refreshHistory: () => Promise<void>;
}

export function useComandaHistory(): UseComandaHistoryReturn {
  const [comandas, setComandas] = useState<ComandaDetalhada[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  // Carregar últimas 20 comandas do cache local
  const loadCachedComandas = useCallback(async () => {
    try {
      const cachedComandas = await databaseService.getCachedComandas(20);
      const comandasDetalhadas = cachedComandas.map(comanda => ({
        ...comanda,
        data: comanda.created_at || new Date().toISOString(),
        dispositivo_update: comanda.dispositivo || 'Local'
      }));
      
      setComandas(comandasDetalhadas);
      return comandasDetalhadas;
    } catch (error) {
      console.error('Error loading cached comandas:', error);
      return [];
    }
  }, []);

  // Query específica para Histórico de Comandas do Supabase
  const syncFromServer = useCallback(async () => {
    if (!supabaseService.getConnectionStatus() || !isOnline) return;

    try {
      const client = supabaseService.client;
      if (!client) return;

      // Query Supabase conforme especificado:
      // SELECT c.id, c.data, c.total, c.dispositivo_update,
      //        (SELECT json_agg(i) FROM item i WHERE i.comanda_fk = c.id) AS itens
      // FROM comanda c ORDER BY c.data DESC LIMIT 20;
      
      const { data, error } = await client
        .from('comanda')
        .select(`
          id,
          data,
          total,
          tipo,
          numero,
          status,
          cliente,
          observacoes,
          dispositivo_update,
          item (
            id,
            material_fk,
            total_kg,
            total_item,
            material (nome_material)
          )
        `)
        .order('data', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Transformar para formato local
      const comandasFormatadas: ComandaDetalhada[] = (data || []).map(row => ({
        id: row.id,
        numero: row.numero || `CMD-${row.id}`,
        tipo: row.tipo,
        total: row.total,
        status: row.status,
        cliente: row.cliente,
        dispositivo: row.dispositivo_update,
        dispositivo_update: row.dispositivo_update,
        observacoes: row.observacoes,
        data: row.data,
        created_at: row.data,
        updated_at: row.data,
        itens: (row.item || []).map((item: any) => ({
          id: item.id,
          material: item.material?.nome_material || 'Material',
          preco: item.total_kg > 0 ? item.total_item / item.total_kg : 0,
          quantidade: item.total_kg,
          total: item.total_item
        }))
      }));

      // Atualizar cache local com as 20 mais recentes
      await databaseService.cacheComandas(comandasFormatadas);
      setComandas(comandasFormatadas);

      toast({
        title: "Histórico sincronizado",
        description: `${comandasFormatadas.length} comandas atualizadas`,
      });
    } catch (error) {
      console.error('Error syncing comandas:', error);
      toast({
        title: "Erro na sincronização",
        description: "Falha ao sincronizar histórico do servidor",
        variant: "destructive"
      });
    }
  }, [isOnline, toast]);

  // Buscar comanda específica por ID
  const getComandaDetalhes = useCallback(async (id: number): Promise<ComandaDetalhada | null> => {
    try {
      // Primeiro tentar no cache local
      let comanda = comandas.find(c => c.id === id);
      
      if (!comanda && isOnline && supabaseService.getConnectionStatus()) {
        // Se não encontrou no cache e está online, buscar no servidor
        const client = supabaseService.client;
        if (!client) return null;

        const { data, error } = await client
          .from('comanda')
          .select(`
            id,
            data,
            total,
            tipo,
            numero,
            status,
            cliente,
            observacoes,
            dispositivo_update,
            item (
              id,
              material_fk,
              total_kg,
              total_item,
              material (nome_material)
            )
          `)
          .eq('id', id)
          .single();

        if (error) throw error;

        comanda = {
          id: data.id,
          numero: data.numero || `CMD-${data.id}`,
          tipo: data.tipo,
          total: data.total,
          status: data.status,
          cliente: data.cliente,
          dispositivo: data.dispositivo_update,
          dispositivo_update: data.dispositivo_update,
          observacoes: data.observacoes,
          data: data.data,
          created_at: data.data,
          updated_at: data.data,
          itens: (data.item || []).map((item: any) => ({
            id: item.id,
            material: item.material?.nome_material || 'Material',
            preco: item.total_kg > 0 ? item.total_item / item.total_kg : 0,
            quantidade: item.total_kg,
            total: item.total_item
          }))
        };
      }
      
      return comanda || null;
    } catch (error) {
      console.error('Error getting comanda details:', error);
      return null;
    }
  }, [comandas, isOnline]);

  // Refresh do histórico
  const refreshHistory = useCallback(async () => {
    setLoading(true);
    
    if (isOnline && supabaseService.getConnectionStatus()) {
      await syncFromServer();
    } else {
      await loadCachedComandas();
    }
    
    setLoading(false);
  }, [isOnline, syncFromServer, loadCachedComandas]);

  // Filtrar comandas por termo de busca
  const filteredComandas = useCallback(() => {
    if (!searchTerm.trim()) {
      return comandas;
    }

    const term = searchTerm.toLowerCase();
    return comandas.filter(comanda => 
      comanda.numero.toLowerCase().includes(term) ||
      comanda.cliente?.toLowerCase().includes(term) ||
      comanda.observacoes?.toLowerCase().includes(term) ||
      comanda.dispositivo_update?.toLowerCase().includes(term)
    );
  }, [comandas, searchTerm]);

  // Monitor de status da rede
  useEffect(() => {
    const handleNetworkChange = (status: { connected: boolean }) => {
      const wasOffline = !isOnline;
      setIsOnline(status.connected);
      
      // Se voltou online, sincronizar automaticamente
      if (status.connected && wasOffline && supabaseService.getConnectionStatus()) {
        logger.debug('Auto-syncing comanda history after coming back online...');
        syncFromServer().catch(err => 
          console.error('Error auto-syncing comanda history:', err)
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
    refreshHistory();
  }, []);

  // Atualizar lista filtrada quando mudar o termo de busca
  useEffect(() => {
    setComandas(filteredComandas());
  }, [searchTerm, filteredComandas]);

  return {
    comandas: filteredComandas(),
    loading,
    isOnline,
    searchTerm,
    setSearchTerm,
    getComandaDetalhes,
    refreshHistory
  };
}