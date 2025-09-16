import { useState, useEffect, useMemo } from 'react';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from 'date-fns';
import { useOfflineData } from '@/hooks/useOfflineData';
import { Transacao, Despesa } from '@/services/database';
import { logger } from '@/utils/logger';

export interface TransacaoHistorico {
  id: number;
  numero: string;
  data: string;
  horario: string;
  total: number;
  itens: number;
  status: string;
  tipo: 'compra' | 'venda';
  materiais: Array<{
    nome: string;
    quantidade: number;
    preco: number;
  }>;
}

export interface DespesaItem {
  id: number;
  descricao: string;
  valor: number;
  categoria?: string;
  created_at: string;
}

export interface MaterialReport {
  material: string;
  kg: number;
  valor: number;
}

export interface RelatorioPeriodo {
  totalCompras: number;
  totalVendas: number;
  totalDespesas: number;
  lucro: number;
  comprasPorMaterial: MaterialReport[];
  vendasPorMaterial: MaterialReport[];
}

export const useRelatorios = () => {
  const [loading, setLoading] = useState(false);
  const { data: transacoes, refreshData: refreshTransacoes, loading: loadingTransacoes } = useOfflineData<Transacao>('transacoes');
  const { data: despesas, refreshData: refreshDespesas, loading: loadingDespesas } = useOfflineData<Despesa>('despesas');

  // Usar despesas do sistema offline-first em vez de localStorage direto
  useEffect(() => {
    // Usar dados do sistema offline (despesas já vem do useOfflineData)
    logger.debug('📊 Transações carregadas:', transacoes.length);
    logger.debug('💰 Despesas carregadas (sistema offline):', despesas.length);
    
    // Migrar despesas do localStorage para o sistema offline (apenas uma vez)
    const migrateFromLocalStorage = async () => {
      const despesasStorage = JSON.parse(localStorage.getItem('despesas') || '[]');
      if (despesasStorage.length > 0 && despesas.length === 0) {
        logger.debug('🔄 Migrando despesas do localStorage para sistema offline...');
        // Adicionar despesas ao sistema offline (seria implementado no useOfflineData para despesas)
      }
    };
    
    migrateFromLocalStorage();
  }, [transacoes, despesas]);

  // Função para obter nome do material por ID
  const getMaterialName = (materialId: number): string => {
    // Mapeamento dos IDs para nomes baseado nos materiais disponíveis
    const materialMap: { [key: number]: string } = {
      1: "Alumínio Lata",
      2: "Alumínio Perfil", 
      3: "Cobre",
      4: "Latão",
      5: "Ferro",
      6: "Inox",
      7: "Bronze",
      8: "Chumbo"
    };
    return materialMap[materialId] || `Material ${materialId}`;
  };

  // Função para calcular relatório para um período específico
  const calcularRelatorio = (dataInicio: Date, dataFim: Date): RelatorioPeriodo => {
    logger.debug('📊 Calculando relatório de', dataInicio.toDateString(), 'até', dataFim.toDateString());
    logger.debug('📊 Total de transações disponíveis:', transacoes.length);
    
    // Filtrar transações do período
    const transacoesPeriodo = transacoes.filter(transacao => {
      const dataTransacao = new Date(transacao.created_at || new Date());
      return isWithinInterval(dataTransacao, {
        start: startOfDay(dataInicio),
        end: endOfDay(dataFim)
      });
    });
    
    logger.debug('📊 Transações no período:', transacoesPeriodo.length);

    // Filtrar despesas do período (usar dados do sistema offline)
    const despesasPeriodo = despesas.filter(despesa => {
      const dataDespesa = new Date(despesa.created_at || new Date());
      return isWithinInterval(dataDespesa, {
        start: startOfDay(dataInicio),
        end: endOfDay(dataFim)
      });
    });

    // Calcular totais
    const compras = transacoesPeriodo.filter(t => t.tipo === 'compra');
    const vendas = transacoesPeriodo.filter(t => t.tipo === 'venda');
    
    logger.debug('📊 Compras no período:', compras.length);
    logger.debug('📊 Vendas no período:', vendas.length);

    const totalCompras = compras.reduce((acc, transacao) => acc + transacao.valor_total, 0);
    const totalVendas = vendas.reduce((acc, transacao) => acc + transacao.valor_total, 0);
    const totalDespesas = despesasPeriodo.reduce((acc, despesa) => acc + despesa.valor, 0);
    const lucro = totalVendas - totalCompras - totalDespesas;
    
    logger.debug('💰 Totais calculados:', { totalCompras, totalVendas, totalDespesas, lucro });

    // Agrupar materiais por tipo de transação
    const comprasPorMaterial = new Map<string, { kg: number; valor: number }>();
    const vendasPorMaterial = new Map<string, { kg: number; valor: number }>();

    compras.forEach(transacao => {
      const materialNome = getMaterialName(transacao.material_id);
      const existing = comprasPorMaterial.get(materialNome) || { kg: 0, valor: 0 };
      comprasPorMaterial.set(materialNome, {
        kg: existing.kg + transacao.peso,
        valor: existing.valor + transacao.valor_total
      });
    });

    vendas.forEach(transacao => {
      const materialNome = getMaterialName(transacao.material_id);
      const existing = vendasPorMaterial.get(materialNome) || { kg: 0, valor: 0 };
      vendasPorMaterial.set(materialNome, {
        kg: existing.kg + transacao.peso,
        valor: existing.valor + transacao.valor_total
      });
    });

    return {
      totalCompras,
      totalVendas,
      totalDespesas,
      lucro,
      comprasPorMaterial: Array.from(comprasPorMaterial.entries()).map(([material, dados]) => ({
        material,
        kg: dados.kg,
        valor: dados.valor
      })),
      vendasPorMaterial: Array.from(vendasPorMaterial.entries()).map(([material, dados]) => ({
        material,
        kg: dados.kg,
        valor: dados.valor
      }))
    };
  };

  // Relatórios por período
  const relatorioDiario = useMemo(() => {
    const hoje = new Date();
    return calcularRelatorio(hoje, hoje);
  }, [transacoes, despesas]);

  const relatorioMensal = useMemo(() => {
    const hoje = new Date();
    return calcularRelatorio(startOfMonth(hoje), endOfMonth(hoje));
  }, [transacoes, despesas]);

  const relatorioAnual = useMemo(() => {
    const hoje = new Date();
    return calcularRelatorio(startOfYear(hoje), endOfYear(hoje));
  }, [transacoes, despesas]);

  const relatorioPersonalizado = (dataInicio: Date, dataFim: Date): RelatorioPeriodo => {
    return calcularRelatorio(dataInicio, dataFim);
  };

  const refreshData = () => {
    setLoading(true);
    Promise.all([
      refreshTransacoes(),
      refreshDespesas()
    ]).finally(() => {
      setLoading(false);
    });
  };

  return {
    relatorioDiario,
    relatorioMensal,
    relatorioAnual,
    relatorioPersonalizado,
    refreshData,
    loading: loading || loadingTransacoes || loadingDespesas,
    hasData: transacoes.length > 0
  };
};