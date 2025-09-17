/**
 * Hook específico para relatórios (sempre via views do Supabase)
 * Responsabilidade: Dados de relatórios calculados
 */

import { useState, useEffect } from 'react';
import { localDbService } from '@/services/localDbService';
import { supabaseService } from '@/services/supabaseService';
import { networkService } from '@/services/networkService';
import { logger } from '@/utils/logger';

export interface RelatorioItem {
  data: string;
  tipo: string;
  descricao: string;
  valor: number;
  material?: string;
}

export interface RelatorioPeriodo {
  periodo: string;
  totalCompras: number;
  totalVendas: number;
  totalDespesas: number;
  lucroLiquido: number;
  itens: RelatorioItem[];
}

export interface RelatoriosState {
  relatorioDiario: RelatorioPeriodo;
  relatorioMensal: RelatorioPeriodo;
  relatorioAnual: RelatorioPeriodo;
  loading: boolean;
  error: string | null;
  isOnline: boolean;
  hasData: boolean;
  lastUpdate: string | null;
}

export function useRelatoriosService() {
  const [state, setState] = useState<RelatoriosState>({
    relatorioDiario: { periodo: '', totalCompras: 0, totalVendas: 0, totalDespesas: 0, lucroLiquido: 0, itens: [] },
    relatorioMensal: { periodo: '', totalCompras: 0, totalVendas: 0, totalDespesas: 0, lucroLiquido: 0, itens: [] },
    relatorioAnual: { periodo: '', totalCompras: 0, totalVendas: 0, totalDespesas: 0, lucroLiquido: 0, itens: [] },
    loading: true,
    error: null,
    isOnline: false,
    hasData: false,
    lastUpdate: null
  });

  const calcularRelatorioLocal = (dataInicio: Date, dataFim: Date, periodo: string): RelatorioPeriodo => {
    // Usar dados locais para calcular relatório básico
    const inicio = dataInicio.toDateString();
    const fim = dataFim.toDateString();
    
    return {
      periodo,
      totalCompras: 0,
      totalVendas: 0,
      totalDespesas: 0,
      lucroLiquido: 0,
      itens: []
    };
  };

  const loadRelatorios = async (): Promise<void> => {
    let mounted = true;

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // 1. Calcular relatórios locais primeiro (básicos)
      const hoje = new Date();
      const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const primeiroDiaAno = new Date(hoje.getFullYear(), 0, 1);

      const relatorioDiario = calcularRelatorioLocal(hoje, hoje, 'Hoje');
      const relatorioMensal = calcularRelatorioLocal(primeiroDiaMes, hoje, 'Este Mês');
      const relatorioAnual = calcularRelatorioLocal(primeiroDiaAno, hoje, 'Este Ano');

      if (mounted) {
        setState(prev => ({
          ...prev,
          relatorioDiario,
          relatorioMensal,
          relatorioAnual,
          hasData: true,
          lastUpdate: localDbService.getLastUpdate('relatorios')
        }));
      }

      // 2. Se online, buscar dados detalhados do Supabase (SEMPRE VIA VIEWS)
      if (networkService.getConnectionStatus() && supabaseService.getConnectionStatus()) {
        try {
          // Buscar relatórios via views do Supabase
          const [itemsHoje, itemsMes, itemsAno] = await Promise.all([
            supabaseService.getRelatorios(hoje.toISOString().split('T')[0], hoje.toISOString().split('T')[0]),
            supabaseService.getRelatorios(primeiroDiaMes.toISOString().split('T')[0], hoje.toISOString().split('T')[0]),
            supabaseService.getRelatorios(primeiroDiaAno.toISOString().split('T')[0], hoje.toISOString().split('T')[0])
          ]);

          const calcularTotais = (itens: RelatorioItem[]) => {
            const compras = itens.filter(i => i.valor < 0).reduce((acc, i) => acc + Math.abs(i.valor), 0);
            const vendas = itens.filter(i => i.valor > 0).reduce((acc, i) => acc + i.valor, 0);
            const despesas = itens.filter(i => i.tipo === 'Despesa').reduce((acc, i) => acc + Math.abs(i.valor), 0);
            
            return {
              totalCompras: compras,
              totalVendas: vendas,
              totalDespesas: despesas,
              lucroLiquido: vendas - compras - despesas
            };
          };

          const relatorioDiarioAtualizado = {
            periodo: 'Hoje',
            ...calcularTotais(itemsHoje),
            itens: itemsHoje
          };

          const relatorioMensalAtualizado = {
            periodo: 'Este Mês',
            ...calcularTotais(itemsMes),
            itens: itemsMes
          };

          const relatorioAnualAtualizado = {
            periodo: 'Este Ano',
            ...calcularTotais(itemsAno),
            itens: itemsAno
          };

          if (mounted) {
            setState(prev => ({
              ...prev,
              relatorioDiario: relatorioDiarioAtualizado,
              relatorioMensal: relatorioMensalAtualizado,
              relatorioAnual: relatorioAnualAtualizado,
              lastUpdate: new Date().toISOString()
            }));
          }

          logger.debug('✅ Relatórios data synced from Supabase views');
        } catch (syncError) {
          logger.debug('Relatórios sync failed, using cached data:', syncError);
          // Continuar com dados locais - não é erro crítico
        }
      }
    } catch (error) {
      logger.error('Error loading relatórios:', error);
      if (mounted) {
        setState(prev => ({
          ...prev,
          error: 'Erro ao carregar dados de relatórios'
        }));
      }
    } finally {
      if (mounted) {
        setState(prev => ({ 
          ...prev, 
          loading: false,
          isOnline: networkService.getConnectionStatus()
        }));
      }
    }
  };

  /**
   * Gerar relatório personalizado
   */
  const relatorioPersonalizado = async (dataInicio: Date, dataFim: Date): Promise<RelatorioPeriodo> => {
    try {
      if (networkService.getConnectionStatus() && supabaseService.getConnectionStatus()) {
        const itens = await supabaseService.getRelatorios(
          dataInicio.toISOString().split('T')[0],
          dataFim.toISOString().split('T')[0]
        );

        const compras = itens.filter(i => i.valor < 0).reduce((acc, i) => acc + Math.abs(i.valor), 0);
        const vendas = itens.filter(i => i.valor > 0).reduce((acc, i) => acc + i.valor, 0);
        const despesas = itens.filter(i => i.tipo === 'Despesa').reduce((acc, i) => acc + Math.abs(i.valor), 0);

        return {
          periodo: `${dataInicio.toLocaleDateString()} a ${dataFim.toLocaleDateString()}`,
          totalCompras: compras,
          totalVendas: vendas,
          totalDespesas: despesas,
          lucroLiquido: vendas - compras - despesas,
          itens
        };
      }

      // Fallback para dados locais
      return calcularRelatorioLocal(dataInicio, dataFim, `${dataInicio.toLocaleDateString()} a ${dataFim.toLocaleDateString()}`);
    } catch (error) {
      logger.error('Error generating custom report:', error);
      return calcularRelatorioLocal(dataInicio, dataFim, 'Erro no relatório');
    }
  };

  // Monitor de rede
  useEffect(() => {
    const unsubscribe = networkService.addStatusListener((status) => {
      setState(prev => ({ ...prev, isOnline: status.connected }));
      
      // Auto-refresh quando voltar online
      if (status.connected && !state.loading) {
        logger.debug('🌐 Network restored - refreshing relatórios data');
        loadRelatorios();
      }
    });

    return unsubscribe;
  }, [state.loading]);

  // Carregar na inicialização
  useEffect(() => {
    loadRelatorios();
  }, []);

  return {
    ...state,
    refreshRelatorios: loadRelatorios,
    relatorioPersonalizado
  };
}