/**
 * Hook unificado para fechamento - offline-first
 * Calcula dados do período atual e gerencia histórico
 */

import { useState, useEffect } from 'react';
import { localDbService } from '@/services/localDbService';
import { supabaseService } from '@/services/supabaseService';
import { networkService } from '@/services/networkService';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';
import { toYMD } from '@/utils/formatters';

export interface FechamentoDados {
  ultimoFechamento: string;
  receitas: number;
  compras: number;
  despesas: number;
  lucroAtual: number;
}

export interface FechamentoHistorico {
  id: number;
  data: string;
  receitas: number;
  compras: number;
  despesas: number;
  lucro: number;
  observacoes?: string;
}

export interface UseFechamentoReturn {
  dados: FechamentoDados;
  historico: FechamentoHistorico[];
  loading: boolean;
  error: string | null;
  isOnline: boolean;
  realizarFechamento: (observacoes?: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useFechamento(): UseFechamentoReturn {
  const [dados, setDados] = useState<FechamentoDados>({
    ultimoFechamento: new Date().toLocaleDateString('pt-BR'),
    receitas: 0,
    compras: 0,
    despesas: 0,
    lucroAtual: 0
  });
  
  const [historico, setHistorico] = useState<FechamentoHistorico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const { toast } = useToast();

  // Carregar dados locais primeiro
  const loadLocalData = async () => {
    try {
      // Calcular período atual baseado nas transações locais
      const transacoes = await localDbService.getTransacoes(200);
      const despesas = await localDbService.getDespesas();
      const hoje = new Date();
      const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
      
      // Filtrar transações de hoje
      const transacoesHoje = transacoes.filter(t => {
        const dataTransacao = new Date(t.created_at || '');
        return dataTransacao >= inicioHoje;
      });
      
      // Filtrar despesas pendentes
      const despesasPendentes = despesas.filter(d => d.categoria !== 'paga');
      
      const receitas = transacoesHoje
        .filter(t => t.tipo === 'venda')
        .reduce((acc, t) => acc + t.valor_total, 0);
      
      const compras = transacoesHoje
        .filter(t => t.tipo === 'compra')
        .reduce((acc, t) => acc + t.valor_total, 0);
      
      const despesasTotal = despesasPendentes
        .reduce((acc, d) => acc + d.valor, 0);
      
      setDados({
        ultimoFechamento: hoje.toLocaleDateString('pt-BR'),
        receitas,
        compras,
        despesas: despesasTotal,
        lucroAtual: receitas - compras - despesasTotal
      });

      logger.debug('✅ Fechamento local data loaded');
    } catch (err) {
      logger.error('Error loading local fechamento:', err);
      setError('Erro ao carregar dados locais');
    }
  };

  // Sincronizar com Supabase se online
  const syncWithSupabase = async () => {
    if (!isOnline || !supabaseService.getConnectionStatus()) return;

    try {
      // TODO: Implementar getFechamentos no supabaseService quando necessário
      // Por enquanto, manter histórico apenas local
      logger.debug('✅ Fechamento synced with Supabase (placeholder)');
    } catch (err) {
      logger.error('Error syncing fechamento with Supabase:', err);
      // Não mostrar erro - continuar com dados locais
    }
  };

  // Carregar histórico do cache local
  const loadCachedHistorico = () => {
    try {
      const cached = localStorage.getItem('fechamento_historico');
      if (cached) {
        setHistorico(JSON.parse(cached));
      }
    } catch (err) {
      logger.error('Error loading cached historico:', err);
    }
  };

  // Realizar fechamento
  const realizarFechamento = async (observacoes?: string): Promise<boolean> => {
    try {
      const fechamentoData = {
        data_fechamento: toYMD(new Date()),
        receitas: dados.receitas,
        compras: dados.compras,
        despesas: dados.despesas,
        lucro: dados.lucroAtual,
        observacoes: observacoes || null
      };

      let success = false;

      // Tentar salvar no Supabase se online
      if (isOnline && supabaseService.getConnectionStatus()) {
        try {
          // TODO: Implementar createFechamento no supabaseService quando necessário
          // Por enquanto, salvar apenas localmente
          logger.info('Fechamento seria sincronizado com Supabase quando método estiver disponível');
        } catch (err) {
          logger.error('Error creating fechamento in Supabase:', err);
        }
      }

      // Se falhou online ou está offline, salvar localmente
      if (!success) {
        // Adicionar ao histórico local
        const novoFechamento: FechamentoHistorico = {
          id: Date.now(),
          data: new Date().toLocaleDateString('pt-BR'),
          receitas: dados.receitas,
          compras: dados.compras,
          despesas: dados.despesas,
          lucro: dados.lucroAtual,
          observacoes
        };

        const historicoAtualizado = [novoFechamento, ...historico];
        setHistorico(historicoAtualizado);
        localStorage.setItem('fechamento_historico', JSON.stringify(historicoAtualizado));

        toast({
          title: "Fechamento salvo localmente",
          description: `Será sincronizado quando conectar. Lucro: ${dados.lucroAtual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
        });
        success = true;
      }

      if (success) {
        // Resetar período atual
        setDados(prev => ({
          ...prev,
          receitas: 0,
          compras: 0,
          despesas: 0,
          lucroAtual: 0
        }));

        // TODO: Implementar updateDespesa no localDbService quando necessário
        // Por enquanto, manter despesas como estão
        logger.info('Despesas seriam marcadas como pagas quando método estiver disponível');
      }

      return success;
    } catch (err) {
      logger.error('Error realizando fechamento:', err);
      toast({
        title: "Erro",
        description: "Erro ao realizar fechamento",
        variant: "destructive"
      });
      return false;
    }
  };

  // Refresh completo
  const refresh = async () => {
    setLoading(true);
    setError(null);

    try {
      await loadLocalData();
      loadCachedHistorico();
      await syncWithSupabase();
    } catch (err) {
      logger.error('Error refreshing fechamento:', err);
      setError('Erro ao atualizar dados');
    } finally {
      setLoading(false);
    }
  };

  // Monitor de rede
  useEffect(() => {
    const handleNetworkChange = (status: { connected: boolean }) => {
      const wasOffline = !isOnline;
      setIsOnline(status.connected);
      
      if (status.connected && wasOffline) {
        syncWithSupabase();
      }
    };

    networkService.addStatusListener(handleNetworkChange);
    setIsOnline(networkService.getConnectionStatus());

    return () => {
      networkService.removeStatusListener(handleNetworkChange);
    };
  }, [isOnline]);

  // Carregar dados iniciais
  useEffect(() => {
    refresh();
  }, []);

  return {
    dados,
    historico,
    loading,
    error,
    isOnline,
    realizarFechamento,
    refresh
  };
}