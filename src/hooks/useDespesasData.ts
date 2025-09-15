import { useState, useEffect, useCallback } from 'react';
import { databaseService, Pendencia } from '@/services/database';
import { supabaseService } from '@/services/supabase';
import { networkService } from '@/services/networkService';
import { useToast } from '@/hooks/use-toast';

// Interface específica para despesas (pendencias do tipo "eu devo")
export interface Despesa {
  id?: number;
  descricao: string;
  valor: number;
  status: 'pendente' | 'resolvida';
  data: string;
  created_at?: string;
}

export interface UseDespesasDataReturn {
  despesas: Despesa[];
  despesasDoMes: Despesa[];
  totalDespesasPendentes: number;
  loading: boolean;
  isOnline: boolean;
  createDespesa: (despesa: Omit<Despesa, 'id' | 'data'>) => Promise<boolean>;
  updateDespesaStatus: (id: number, status: Despesa['status']) => Promise<boolean>;
  refreshDespesas: () => Promise<void>;
}

export function useDespesasData(): UseDespesasDataReturn {
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [despesasDoMes, setDespesasDoMes] = useState<Despesa[]>([]);
  const [totalDespesasPendentes, setTotalDespesasPendentes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const { toast } = useToast();

  // Carregar despesas do cache local
  const loadCachedDespesas = useCallback(async () => {
    try {
      const cachedPendencias = await databaseService.getCachedPendencias();
      
      // Filtrar apenas as do tipo "eu devo" (despesas)
      const despesasFormatadas: Despesa[] = cachedPendencias
        .filter(p => (p as any).tipo === 'eu devo')
        .map(p => ({
          id: p.id,
          descricao: p.descricao,
          valor: p.valor || 0,
          status: p.status === 'resolvida' ? 'resolvida' : 'pendente',
          data: p.created_at || new Date().toISOString(),
          created_at: p.created_at
        }));

      setDespesas(despesasFormatadas);
      
      // Filtrar despesas do mês atual
      const agora = new Date();
      const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
      const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);
      
      const despesasMes = despesasFormatadas.filter(despesa => {
        const dataDespesa = new Date(despesa.data);
        return dataDespesa >= inicioMes && dataDespesa <= fimMes;
      });
      
      setDespesasDoMes(despesasMes);
      
      // Calcular total pendente
      const totalPendente = despesasFormatadas
        .filter(d => d.status === 'pendente')
        .reduce((sum, d) => sum + d.valor, 0);
      
      setTotalDespesasPendentes(totalPendente);
      
      return despesasFormatadas;
    } catch (error) {
      console.error('Error loading cached despesas:', error);
      return [];
    }
  }, []);

  // Sincronizar despesas do servidor
  const syncFromServer = useCallback(async () => {
    if (!supabaseService.getConnectionStatus() || !isOnline) return;

    try {
      const client = supabaseService.client;
      if (!client) return;

      // Query conforme especificado:
      // SELECT * FROM pendencia
      // WHERE tipo = 'eu devo'
      //   AND date_trunc('month', data) = date_trunc('month', CURRENT_DATE);
      // (Vamos buscar todas as despesas primeiro)
      
      const { data, error } = await client
        .from('pendencia')
        .select('*')
        .eq('tipo', 'eu devo')
        .order('data', { ascending: false });

      if (error) throw error;

      // Transformar para formato local
      const despesasFormatadas: Despesa[] = (data || []).map(item => ({
        id: item.id,
        descricao: item.descricao,
        valor: item.valor || 0,
        status: item.status === 'resolvida' ? 'resolvida' : 'pendente',
        data: item.data,
        created_at: item.data
      }));

      setDespesas(despesasFormatadas);

      // Filtrar despesas do mês atual
      const agora = new Date();
      const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
      const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);
      
      const despesasMes = despesasFormatadas.filter(despesa => {
        const dataDespesa = new Date(despesa.data);
        return dataDespesa >= inicioMes && dataDespesa <= fimMes;
      });
      
      setDespesasDoMes(despesasMes);

      // Calcular total pendente
      const totalPendente = despesasFormatadas
        .filter(d => d.status === 'pendente')
        .reduce((sum, d) => sum + d.valor, 0);
      
      setTotalDespesasPendentes(totalPendente);

      // Atualizar cache local (como pendências)
      const pendenciasCache = despesasFormatadas.map(despesa => ({
        id: despesa.id,
        descricao: despesa.descricao,
        valor: despesa.valor,
        status: despesa.status as 'pendente' | 'resolvida',
        prioridade: 'media' as const,
        created_at: despesa.data
      }));

      await databaseService.cachePendencias(pendenciasCache);

      toast({
        title: "Despesas sincronizadas",
        description: `${despesasMes.length} despesas do mês atual`,
      });

    } catch (error) {
      console.error('Error syncing despesas:', error);
      toast({
        title: "Erro na sincronização",
        description: "Falha ao sincronizar despesas do servidor",
        variant: "destructive"
      });
    }
  }, [isOnline, toast]);

  // Criar nova despesa (offline-first)
  const createDespesa = useCallback(async (despesa: Omit<Despesa, 'id' | 'data'>): Promise<boolean> => {
    try {
      const now = new Date().toISOString();
      const novaDespesa: Despesa = {
        ...despesa,
        id: Date.now(), // ID temporário para cache local
        data: now
      };

      // Adicionar ao cache local primeiro (como pendência)
      const pendencia: Pendencia = {
        id: novaDespesa.id,
        descricao: novaDespesa.descricao,
        valor: novaDespesa.valor,
        status: novaDespesa.status === 'resolvida' ? 'resolvida' : 'pendente',
        prioridade: 'media',
        created_at: now
      };

      await databaseService.addPendenciaToCache(pendencia);
      
      // Adicionar à fila de sincronização
      await databaseService.addToSyncQueue('criar_despesa', {
        descricao: despesa.descricao,
        valor: despesa.valor,
        status: despesa.status,
        tipo: 'eu devo',
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
      await loadCachedDespesas();
      
      toast({
        title: "Despesa cadastrada",
        description: isOnline ? "Despesa salva no servidor" : "Será sincronizada quando conectar",
      });
      
      return true;
    } catch (error) {
      console.error('Error creating despesa:', error);
      toast({
        title: "Erro",
        description: "Erro ao cadastrar despesa",
        variant: "destructive"
      });
      return false;
    }
  }, [isOnline, syncFromServer, loadCachedDespesas, toast]);

  // Atualizar status da despesa
  const updateDespesaStatus = useCallback(async (id: number, status: Despesa['status']): Promise<boolean> => {
    try {
      // Atualizar cache local primeiro
      const despesasAtualizadas = despesas.map(despesa => 
        despesa.id === id ? { ...despesa, status } : despesa
      );
      setDespesas(despesasAtualizadas);
      
      // Recalcular total pendente
      const totalPendente = despesasAtualizadas
        .filter(d => d.status === 'pendente')
        .reduce((sum, d) => sum + d.valor, 0);
      setTotalDespesasPendentes(totalPendente);
      
      // Adicionar à fila de sincronização
      await databaseService.addToSyncQueue('atualizar_despesa', { id, status });
      
      // Se online, tentar sincronizar imediatamente
      if (isOnline && supabaseService.getConnectionStatus()) {
        const syncResult = await supabaseService.processSyncQueue();
        if (syncResult.success > 0) {
          await syncFromServer(); // Atualizar com dados do servidor
        }
      }
      
      toast({
        title: "Despesa atualizada",
        description: `Status alterado para: ${status}`,
      });
      
      return true;
    } catch (error) {
      console.error('Error updating despesa status:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar despesa",
        variant: "destructive"
      });
      return false;
    }
  }, [despesas, isOnline, syncFromServer, toast]);

  // Refresh das despesas
  const refreshDespesas = useCallback(async () => {
    setLoading(true);
    
    if (isOnline && supabaseService.getConnectionStatus()) {
      await syncFromServer();
    } else {
      await loadCachedDespesas();
    }
    
    setLoading(false);
  }, [isOnline, syncFromServer, loadCachedDespesas]);

  // Monitor de status da rede
  useEffect(() => {
    const handleNetworkChange = (status: { connected: boolean }) => {
      const wasOffline = !isOnline;
      setIsOnline(status.connected);
      
      // Se voltou online, sincronizar automaticamente
      if (status.connected && wasOffline && supabaseService.getConnectionStatus()) {
        console.log('Auto-syncing despesas after coming back online...');
        syncFromServer().catch(err => 
          console.error('Error auto-syncing despesas:', err)
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
    refreshDespesas();
  }, []);

  return {
    despesas,
    despesasDoMes,
    totalDespesasPendentes,
    loading,
    isOnline,
    createDespesa,
    updateDespesaStatus,
    refreshDespesas
  };
}