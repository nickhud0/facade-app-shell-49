import { useState, useEffect, useCallback } from 'react';
import { supabaseService } from '@/services/supabase';
import { networkService } from '@/services/networkService';
import { useToast } from '@/hooks/use-toast';

export interface PeriodoRelatorio {
  dataInicio: string;
  dataFim: string;
}

export interface ResumoRelatorio {
  totalCompras: number;
  totalVendas: number;
  totalDespesas: number;
  lucro: number;
}

export interface ItemRelatorio {
  nome_material: string;
  total_kg: number;
  total_reais: number;
}

export interface RelatorioCompleto {
  resumo: ResumoRelatorio;
  comprasPorMaterial: ItemRelatorio[];
  vendasPorMaterial: ItemRelatorio[];
}

export interface UseRelatoriosDataReturn {
  relatorio: RelatorioCompleto | null;
  loading: boolean;
  isOnline: boolean;
  gerarRelatorio: (periodo: PeriodoRelatorio) => Promise<void>;
  getRelatorioPersonalizado: (dataInicio: string, dataFim: string) => Promise<void>;
}

export function useRelatoriosData(): UseRelatoriosDataReturn {
  const [relatorio, setRelatorio] = useState<RelatorioCompleto | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const { toast } = useToast();

  // Gerar relatório para período específico
  const gerarRelatorio = useCallback(async (periodo: PeriodoRelatorio) => {
    if (!supabaseService.getConnectionStatus() || !isOnline) {
      toast({
        title: "Offline",
        description: "É necessário estar online para gerar relatórios",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const client = supabaseService.client;
      if (!client) throw new Error('Supabase client not available');

      // Query Compras conforme especificado:
      // SELECT m.nome_material, 
      //        SUM(i.total_kg) AS total_kg, 
      //        SUM(i.total_item) AS total_reais
      // FROM item i
      // JOIN comanda c ON i.comanda_fk = c.id
      // JOIN material m ON i.material_fk = m.id
      // WHERE c.tipo = 'compra' AND c.data BETWEEN $1 AND $2
      // GROUP BY m.nome_material;

      const { data: comprasData, error: comprasError } = await client
        .from('item')
        .select(`
          total_kg,
          total_item,
          comanda!inner(tipo, data),
          material!inner(nome_material)
        `)
        .eq('comanda.tipo', 'compra')
        .gte('comanda.data', periodo.dataInicio)
        .lte('comanda.data', periodo.dataFim);

      if (comprasError) throw comprasError;

      // Query Vendas conforme especificado:
      // SELECT m.nome_material, 
      //        SUM(i.total_kg) AS total_kg, 
      //        SUM(i.total_item) AS total_reais
      // FROM item i
      // JOIN comanda c ON i.comanda_fk = c.id
      // JOIN material m ON i.material_fk = m.id
      // WHERE c.tipo = 'venda' AND c.data BETWEEN $1 AND $2
      // GROUP BY m.nome_material;

      const { data: vendasData, error: vendasError } = await client
        .from('item')
        .select(`
          total_kg,
          total_item,
          comanda!inner(tipo, data),
          material!inner(nome_material)
        `)
        .eq('comanda.tipo', 'venda')
        .gte('comanda.data', periodo.dataInicio)
        .lte('comanda.data', periodo.dataFim);

      if (vendasError) throw vendasError;

      // Buscar despesas do período
      const { data: despesasData, error: despesasError } = await client
        .from('pendencia')
        .select('valor')
        .eq('tipo', 'eu devo')
        .gte('data', periodo.dataInicio)
        .lte('data', periodo.dataFim);

      if (despesasError) throw despesasError;

      // Processar dados de compras
      const comprasAgrupadas = new Map<string, { total_kg: number; total_reais: number }>();
      let totalCompras = 0;

      (comprasData || []).forEach(item => {
        const nome = (item.material as any).nome_material;
        const kg = item.total_kg || 0;
        const valor = item.total_item || 0;

        if (comprasAgrupadas.has(nome)) {
          const existing = comprasAgrupadas.get(nome)!;
          existing.total_kg += kg;
          existing.total_reais += valor;
        } else {
          comprasAgrupadas.set(nome, { total_kg: kg, total_reais: valor });
        }

        totalCompras += valor;
      });

      // Processar dados de vendas
      const vendasAgrupadas = new Map<string, { total_kg: number; total_reais: number }>();
      let totalVendas = 0;

      (vendasData || []).forEach(item => {
        const nome = (item.material as any).nome_material;
        const kg = item.total_kg || 0;
        const valor = item.total_item || 0;

        if (vendasAgrupadas.has(nome)) {
          const existing = vendasAgrupadas.get(nome)!;
          existing.total_kg += kg;
          existing.total_reais += valor;
        } else {
          vendasAgrupadas.set(nome, { total_kg: kg, total_reais: valor });
        }

        totalVendas += valor;
      });

      // Calcular total de despesas
      const totalDespesas = (despesasData || []).reduce((sum, d) => sum + (d.valor || 0), 0);

      // Converter para arrays
      const comprasPorMaterial: ItemRelatorio[] = Array.from(comprasAgrupadas.entries()).map(([nome, dados]) => ({
        nome_material: nome,
        total_kg: dados.total_kg,
        total_reais: dados.total_reais
      }));

      const vendasPorMaterial: ItemRelatorio[] = Array.from(vendasAgrupadas.entries()).map(([nome, dados]) => ({
        nome_material: nome,
        total_kg: dados.total_kg,
        total_reais: dados.total_reais
      }));

      // Montar relatório completo
      const relatorioCompleto: RelatorioCompleto = {
        resumo: {
          totalCompras,
          totalVendas,
          totalDespesas,
          lucro: totalVendas - totalCompras - totalDespesas
        },
        comprasPorMaterial: comprasPorMaterial.sort((a, b) => b.total_reais - a.total_reais),
        vendasPorMaterial: vendasPorMaterial.sort((a, b) => b.total_reais - a.total_reais)
      };

      setRelatorio(relatorioCompleto);

      toast({
        title: "Relatório gerado",
        description: `Período: ${new Date(periodo.dataInicio).toLocaleDateString()} - ${new Date(periodo.dataFim).toLocaleDateString()}`,
      });

    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Erro",
        description: "Erro ao gerar relatório",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [isOnline, toast]);

  // Gerar relatório personalizado
  const getRelatorioPersonalizado = useCallback(async (dataInicio: string, dataFim: string) => {
    await gerarRelatorio({ dataInicio, dataFim });
  }, [gerarRelatorio]);

  // Gerar relatórios pré-definidos
  const gerarRelatorioDiario = useCallback(async () => {
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString();
    const fim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1).toISOString();
    
    await gerarRelatorio({ dataInicio: inicio, dataFim: fim });
  }, [gerarRelatorio]);

  const gerarRelatorioMensal = useCallback(async () => {
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString();
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1).toISOString();
    
    await gerarRelatorio({ dataInicio: inicio, dataFim: fim });
  }, [gerarRelatorio]);

  const gerarRelatorioAnual = useCallback(async () => {
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear(), 0, 1).toISOString();
    const fim = new Date(hoje.getFullYear() + 1, 0, 1).toISOString();
    
    await gerarRelatorio({ dataInicio: inicio, dataFim: fim });
  }, [gerarRelatorio]);

  // Monitor de status da rede
  useEffect(() => {
    const handleNetworkChange = (status: { connected: boolean }) => {
      setIsOnline(status.connected);
    };

    networkService.addStatusListener(handleNetworkChange);
    setIsOnline(networkService.getConnectionStatus());

    return () => {
      networkService.removeStatusListener(handleNetworkChange);
    };
  }, []);

  return {
    relatorio,
    loading,
    isOnline,
    gerarRelatorio,
    getRelatorioPersonalizado
  };
}