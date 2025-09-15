import { useState, useEffect, useCallback } from 'react';
import { supabaseService } from '@/services/supabase';
import { networkService } from '@/services/networkService';
import { useToast } from '@/hooks/use-toast';

export interface PeriodoAtual {
  receitas: number;
  compras: number;
  despesas: number;
  lucro_atual: number;
}

export interface Fechamento {
  id: number;
  data_fechamento: string;
  receitas: number;
  compras: number;
  despesas: number;
  lucro: number;
  observacoes?: string;
}

export interface UseFechamentoDataReturn {
  periodoAtual: PeriodoAtual | null;
  historicoFechamentos: Fechamento[];
  loading: boolean;
  isOnline: boolean;
  realizarFechamento: (observacoes?: string) => Promise<boolean>;
  refreshData: () => Promise<void>;
}

export function useFechamentoData(): UseFechamentoDataReturn {
  const [periodoAtual, setPeriodoAtual] = useState<PeriodoAtual | null>(null);
  const [historicoFechamentos, setHistoricoFechamentos] = useState<Fechamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const { toast } = useToast();

  // Query para período atual conforme especificado
  const loadPeriodoAtual = useCallback(async () => {
    if (!supabaseService.getConnectionStatus() || !isOnline) {
      setPeriodoAtual(null);
      return;
    }

    try {
      const client = supabaseService.client;
      if (!client) return;

      // Query Período Atual conforme especificado:
      // SELECT 
      //   COALESCE(SUM(CASE WHEN c.tipo = 'venda' THEN c.total END),0) AS receitas,
      //   COALESCE(SUM(CASE WHEN c.tipo = 'compra' THEN c.total END),0) AS compras,
      //   COALESCE((SELECT SUM(valor) FROM pendencia WHERE tipo = 'eu devo' AND status = 'pendente'),0) AS despesas,
      //   (COALESCE(SUM(CASE WHEN c.tipo = 'venda' THEN c.total END),0)
      //    - COALESCE(SUM(CASE WHEN c.tipo = 'compra' THEN c.total END),0)
      //    - COALESCE((SELECT SUM(valor) FROM pendencia WHERE tipo = 'eu devo' AND status = 'pendente'),0)) AS lucro_atual
      // FROM comanda c
      // WHERE c.data > (SELECT COALESCE(MAX(data_fechamento), '1970-01-01') FROM fechamento);

      // Buscar último fechamento
      const { data: ultimoFechamento } = await client
        .from('fechamento')
        .select('data_fechamento')
        .order('data_fechamento', { ascending: false })
        .limit(1)
        .single();

      const dataUltimoFechamento = ultimoFechamento?.data_fechamento || '1970-01-01';

      // Buscar comandas do período atual
      const { data: comandas, error: comandasError } = await client
        .from('comanda')
        .select('tipo, total')
        .gt('data', dataUltimoFechamento);

      if (comandasError) throw comandasError;

      // Buscar despesas pendentes
      const { data: pendencias, error: pendenciasError } = await client
        .from('pendencia')
        .select('valor')
        .eq('tipo', 'eu devo')
        .eq('status', 'pendente');

      if (pendenciasError) throw pendenciasError;

      // Calcular totais
      const receitas = (comandas || [])
        .filter(c => c.tipo === 'venda')
        .reduce((sum, c) => sum + (c.total || 0), 0);

      const compras = (comandas || [])
        .filter(c => c.tipo === 'compra')
        .reduce((sum, c) => sum + (c.total || 0), 0);

      const despesas = (pendencias || [])
        .reduce((sum, p) => sum + (p.valor || 0), 0);

      const lucro_atual = receitas - compras - despesas;

      setPeriodoAtual({
        receitas,
        compras,
        despesas,
        lucro_atual
      });

    } catch (error) {
      console.error('Error loading periodo atual:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do período atual",
        variant: "destructive"
      });
    }
  }, [isOnline, toast]);

  // Query para histórico de fechamentos conforme especificado
  const loadHistoricoFechamentos = useCallback(async () => {
    if (!supabaseService.getConnectionStatus() || !isOnline) {
      setHistoricoFechamentos([]);
      return;
    }

    try {
      const client = supabaseService.client;
      if (!client) return;

      // Query Histórico conforme especificado:
      // SELECT * FROM fechamento ORDER BY data_fechamento DESC;
      const { data, error } = await client
        .from('fechamento')
        .select('*')
        .order('data_fechamento', { ascending: false });

      if (error) throw error;

      setHistoricoFechamentos(data || []);

    } catch (error) {
      console.error('Error loading historico fechamentos:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar histórico de fechamentos",
        variant: "destructive"
      });
    }
  }, [isOnline, toast]);

  // Realizar fechamento
  const realizarFechamento = useCallback(async (observacoes?: string): Promise<boolean> => {
    if (!supabaseService.getConnectionStatus() || !isOnline || !periodoAtual) {
      toast({
        title: "Erro",
        description: "É necessário estar online para realizar fechamento",
        variant: "destructive"
      });
      return false;
    }

    try {
      const client = supabaseService.client;
      if (!client) return false;

      // Criar registro de fechamento
      const fechamentoData = {
        data_fechamento: new Date().toISOString(),
        receitas: periodoAtual.receitas,
        compras: periodoAtual.compras,
        despesas: periodoAtual.despesas,
        lucro: periodoAtual.lucro_atual,
        observacoes: observacoes || null
      };

      const { error } = await client
        .from('fechamento')
        .insert([fechamentoData]);

      if (error) throw error;

      // Marcar pendências como pagas (zerar despesas)
      await client
        .from('pendencia')
        .update({ status: 'resolvida' })
        .eq('tipo', 'eu devo')
        .eq('status', 'pendente');

      toast({
        title: "Fechamento realizado",
        description: `Lucro do período: R$ ${periodoAtual.lucro_atual.toFixed(2)}`,
      });

      // Atualizar dados
      await refreshData();

      return true;
    } catch (error) {
      console.error('Error realizando fechamento:', error);
      toast({
        title: "Erro",
        description: "Erro ao realizar fechamento",
        variant: "destructive"
      });
      return false;
    }
  }, [isOnline, periodoAtual, toast]);

  // Refresh dos dados
  const refreshData = useCallback(async () => {
    setLoading(true);
    
    await Promise.all([
      loadPeriodoAtual(),
      loadHistoricoFechamentos()
    ]);
    
    setLoading(false);
  }, [loadPeriodoAtual, loadHistoricoFechamentos]);

  // Monitor de status da rede
  useEffect(() => {
    const handleNetworkChange = (status: { connected: boolean }) => {
      const wasOffline = !isOnline;
      setIsOnline(status.connected);
      
      // Se voltou online, atualizar dados automaticamente
      if (status.connected && wasOffline && supabaseService.getConnectionStatus()) {
        console.log('Auto-refreshing fechamento data after coming back online...');
        refreshData().catch(err => 
          console.error('Error auto-refreshing fechamento data:', err)
        );
      }
    };

    networkService.addStatusListener(handleNetworkChange);
    setIsOnline(networkService.getConnectionStatus());

    return () => {
      networkService.removeStatusListener(handleNetworkChange);
    };
  }, [isOnline, refreshData]);

  // Carregar dados iniciais
  useEffect(() => {
    refreshData();
  }, []);

  // Atualizar dados periodicamente quando online
  useEffect(() => {
    if (!isOnline) return;

    const interval = setInterval(() => {
      loadPeriodoAtual().catch(err => 
        console.error('Error refreshing periodo atual:', err)
      );
    }, 30000); // Atualizar a cada 30 segundos

    return () => clearInterval(interval);
  }, [isOnline, loadPeriodoAtual]);

  return {
    periodoAtual,
    historicoFechamentos,
    loading,
    isOnline,
    realizarFechamento,
    refreshData
  };
}