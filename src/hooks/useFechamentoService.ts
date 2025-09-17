/**
 * Hook específico para dados de fechamento
 * Calcula automaticamente com base nas transações e despesas do dia
 */

import { useState, useEffect } from 'react';
import { localDbService } from '@/services/localDbService';
import { logger } from '@/utils/logger';

export interface FechamentoData {
  ultimoFechamento: string;
  receitas: number;
  compras: number;
  despesas: number;
  lucroAtual: number;
}

export interface FechamentoState {
  dados: FechamentoData;
  loading: boolean;
  error: string | null;
  hasData: boolean;
}

export function useFechamentoService() {
  const [state, setState] = useState<FechamentoState>({
    dados: {
      ultimoFechamento: new Date().toLocaleDateString('pt-BR'),
      receitas: 0,
      compras: 0,
      despesas: 0,
      lucroAtual: 0
    },
    loading: true,
    error: null,
    hasData: false
  });

  const loadFechamento = async (): Promise<void> => {
    let mounted = true;

    try {
      setState(prev => ({ 
        ...prev, 
        loading: true, 
        error: null
      }));

      const dados = await localDbService.getFechamentoData();
      
      if (mounted) {
        setState(prev => ({
          ...prev,
          dados,
          hasData: true
        }));
      }

      logger.debug('✅ Fechamento data loaded');
    } catch (e) {
      logger.error('Error loading fechamento:', e);
      if (mounted) {
        setState(prev => ({
          ...prev,
          error: 'Erro ao carregar dados de fechamento'
        }));
      }
    } finally {
      if (mounted) {
        setState(prev => ({ ...prev, loading: false }));
      }
    }
  };

  // Carregar na inicialização
  useEffect(() => {
    loadFechamento();
  }, []);

  return {
    ...state,
    refresh: loadFechamento
  };
}