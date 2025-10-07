import { useMemo } from 'react';
import { useRelatorios } from '@/hooks/useRelatorios';

export const useFechamento = () => {
  const { relatorioDiario, refreshData } = useRelatorios();

  const dadosAtual = useMemo(() => {
    const hoje = new Date();
    const ultimoFechamento = hoje.toLocaleDateString('pt-BR');
    
    return {
      ultimoFechamento,
      receitas: relatorioDiario.totalVendas,
      compras: relatorioDiario.totalCompras,
      despesas: relatorioDiario.totalDespesas,
      lucroAtual: relatorioDiario.lucro
    };
  }, [relatorioDiario]);

  return {
    dadosAtual,
    refreshData,
    hasData: relatorioDiario.totalCompras > 0 || relatorioDiario.totalVendas > 0
  };
};