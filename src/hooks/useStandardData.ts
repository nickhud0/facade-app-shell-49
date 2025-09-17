/**
 * Hooks padronizados para todos os tipos de dados
 * Todos seguem o padrão: offline-first, loading states, error handling
 */

import { useState, useEffect, useCallback } from 'react';
import { dataService, DataLoadResult } from '@/services/dataService';
import { Material, Transacao, Vale, Despesa } from '@/services/database';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

/**
 * Hook padrão para materiais
 */
export function useMateriais() {
  const [result, setResult] = useState<DataLoadResult<Material>>({
    data: [],
    loading: true,
    error: null,
    isOnline: false,
    hasData: false
  });
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    setResult(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const newResult = await dataService.loadMateriais();
      setResult(newResult);
    } catch (error) {
      setResult(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Erro ao carregar materiais' 
      }));
      logger.error('Error loading materiais:', error);
    }
  }, []);

  const createMaterial = useCallback(async (material: Omit<Material, 'id'>) => {
    const success = await dataService.createMaterial(material);
    
    if (success) {
      toast({
        title: "Material cadastrado",
        description: result.isOnline ? "Salvo no servidor" : "Será sincronizado quando conectar"
      });
      await loadData(); // Recarregar lista
    } else {
      toast({
        title: "Erro",
        description: "Erro ao cadastrar material",
        variant: "destructive"
      });
    }
    
    return success;
  }, [result.isOnline, toast, loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    materiais: result.data,
    loading: result.loading,
    error: result.error,
    isOnline: result.isOnline,
    hasData: result.hasData,
    refreshMateriais: loadData,
    createMaterial
  };
}

/**
 * Hook padrão para transações (histórico compra/venda)
 */
export function useTransacoes(limit = 50) {
  const [result, setResult] = useState<DataLoadResult<Transacao>>({
    data: [],
    loading: true,
    error: null,
    isOnline: false,
    hasData: false
  });
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    setResult(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const newResult = await dataService.loadTransacoes(limit);
      setResult(newResult);
    } catch (error) {
      setResult(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Erro ao carregar transações' 
      }));
      logger.error('Error loading transacoes:', error);
    }
  }, [limit]);

  const createTransacao = useCallback(async (transacao: Omit<Transacao, 'id'>) => {
    const success = await dataService.createTransacao(transacao);
    
    if (success) {
      toast({
        title: "Transação registrada",
        description: result.isOnline ? "Salva no servidor" : "Será sincronizada quando conectar"
      });
      await loadData(); // Recarregar lista
    } else {
      toast({
        title: "Erro",
        description: "Erro ao registrar transação",
        variant: "destructive"
      });
    }
    
    return success;
  }, [result.isOnline, toast, loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    transacoes: result.data,
    loading: result.loading,
    error: result.error,
    isOnline: result.isOnline,
    hasData: result.hasData,
    refreshTransacoes: loadData,
    createTransacao
  };
}

/**
 * Hook padrão para vales
 */
export function useVales() {
  const [result, setResult] = useState<DataLoadResult<Vale>>({
    data: [],
    loading: true,
    error: null,
    isOnline: false,
    hasData: false
  });
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    setResult(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const newResult = await dataService.loadVales();
      setResult(newResult);
    } catch (error) {
      setResult(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Erro ao carregar vales' 
      }));
      logger.error('Error loading vales:', error);
    }
  }, []);

  const createVale = useCallback(async (vale: Omit<Vale, 'id'>) => {
    const success = await dataService.createVale(vale);
    
    if (success) {
      toast({
        title: "Vale cadastrado",
        description: result.isOnline ? "Salvo no servidor" : "Será sincronizado quando conectar"
      });
      await loadData(); // Recarregar lista
    } else {
      toast({
        title: "Erro",
        description: "Erro ao cadastrar vale",
        variant: "destructive"
      });
    }
    
    return success;
  }, [result.isOnline, toast, loadData]);

  const updateValeStatus = useCallback(async (id: number, status: Vale['status']) => {
    const success = await dataService.updateValeStatus(id, status);
    
    if (success) {
      toast({
        title: "Vale atualizado",
        description: `Status alterado para: ${status}`
      });
      await loadData(); // Recarregar lista
    } else {
      toast({
        title: "Erro",
        description: "Erro ao atualizar vale",
        variant: "destructive"
      });
    }
    
    return success;
  }, [toast, loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calcular vales pendentes
  const valesPendentes = result.data.filter(vale => vale.status === 'pendente');
  const totalPendente = valesPendentes.reduce((acc, vale) => acc + vale.valor, 0);

  return {
    vales: result.data,
    valesPendentes,
    totalPendente,
    quantidadePendentes: valesPendentes.length,
    loading: result.loading,
    error: result.error,
    isOnline: result.isOnline,
    hasData: result.hasData,
    refreshVales: loadData,
    createVale,
    updateValeStatus
  };
}

/**
 * Hook padrão para despesas
 */
export function useDespesas() {
  const [result, setResult] = useState<DataLoadResult<Despesa>>({
    data: [],
    loading: true,
    error: null,
    isOnline: false,
    hasData: false
  });
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    setResult(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const newResult = await dataService.loadDespesas();
      setResult(newResult);
    } catch (error) {
      setResult(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Erro ao carregar despesas' 
      }));
      logger.error('Error loading despesas:', error);
    }
  }, []);

  const createDespesa = useCallback(async (despesa: Omit<Despesa, 'id'>) => {
    const success = await dataService.createDespesa(despesa);
    
    if (success) {
      toast({
        title: "Despesa cadastrada",
        description: result.isOnline ? "Salva no servidor" : "Será sincronizada quando conectar"
      });
      await loadData(); // Recarregar lista
    } else {
      toast({
        title: "Erro",
        description: "Erro ao cadastrar despesa",
        variant: "destructive"
      });
    }
    
    return success;
  }, [result.isOnline, toast, loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    despesas: result.data,
    loading: result.loading,
    error: result.error,
    isOnline: result.isOnline,
    hasData: result.hasData,
    refreshDespesas: loadData,
    createDespesa
  };
}

/**
 * Hook padrão para estoque
 */
export function useEstoque() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itensEstoque, setItensEstoque] = useState<any[]>([]);
  const [resumoEstoque, setResumoEstoque] = useState<any>({ totalKg: 0, totalTipos: 0, valorTotal: 0 });
  const [isOnline, setIsOnline] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await dataService.loadEstoque();
      setItensEstoque(result.itens);
      setResumoEstoque(result.resumo);
      setIsOnline(result.isOnline);
      setError(result.error);
    } catch (error) {
      setError('Erro ao carregar estoque');
      logger.error('Error loading estoque:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    itensEstoque,
    resumoEstoque,
    loading,
    error,
    isOnline,
    hasData: itensEstoque.length > 0,
    refreshEstoque: loadData
  };
}

/**
 * Hook padrão para fechamento
 */
export function useFechamentoData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dadosAtual, setDadosAtual] = useState({
    ultimoFechamento: new Date().toLocaleDateString('pt-BR'),
    receitas: 0,
    compras: 0,
    despesas: 0,
    lucroAtual: 0
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await dataService.loadFechamento();
      setDadosAtual(result.dados);
      setError(result.error);
    } catch (error) {
      setError('Erro ao carregar dados de fechamento');
      logger.error('Error loading fechamento:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    dadosAtual,
    loading,
    error,
    hasData: dadosAtual.receitas > 0 || dadosAtual.compras > 0,
    refreshFechamento: loadData
  };
}

/**
 * Hook para monitorar fila de sincronização
 */
export function useSyncStatus() {
  const [stats, setStats] = useState({ pending: 0, failed: 0, total: 0 });
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  const refreshStats = useCallback(() => {
    const newStats = dataService.getQueueStats();
    setStats(newStats);
  }, []);

  const forceSync = useCallback(async () => {
    setSyncing(true);
    
    try {
      const result = await dataService.forcSync();
      
      if (result.success > 0) {
        toast({
          title: "Sincronização concluída",
          description: `${result.success} itens sincronizados`
        });
      }
      
      if (result.failed > 0) {
        toast({
          title: "Sincronização parcial",
          description: `${result.failed} itens falharam`,
          variant: "destructive"
        });
      }
      
      refreshStats();
    } catch (error) {
      toast({
        title: "Erro na sincronização",
        description: "Falha ao sincronizar dados",
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
    }
  }, [toast, refreshStats]);

  useEffect(() => {
    refreshStats();
    const interval = setInterval(refreshStats, 5000); // Atualizar a cada 5s
    return () => clearInterval(interval);
  }, [refreshStats]);

  return {
    stats,
    syncing,
    forceSync,
    refreshStats
  };
}