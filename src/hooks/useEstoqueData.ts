import { useState, useEffect, useCallback } from 'react';
import { supabaseService } from '@/services/supabase';
import { networkService } from '@/services/networkService';
import { useToast } from '@/hooks/use-toast';

export interface ItemEstoque {
  material_id: number;
  nome_material: string;
  kg_disponivel: number;
  preco_medio: number;
  valor_total: number;
}

export interface ResumoEstoque {
  kg_total: number;
  quantidade_tipos: number;
  valor_total_estoque: number;
}

export interface UseEstoqueDataReturn {
  itensEstoque: ItemEstoque[];
  resumoEstoque: ResumoEstoque | null;
  loading: boolean;
  isOnline: boolean;
  refreshEstoque: () => Promise<void>;
}

export function useEstoqueData(): UseEstoqueDataReturn {
  const [itensEstoque, setItensEstoque] = useState<ItemEstoque[]>([]);
  const [resumoEstoque, setResumoEstoque] = useState<ResumoEstoque | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const { toast } = useToast();

  // Carregar dados do estoque usando a view criada
  const loadEstoqueData = useCallback(async () => {
    if (!supabaseService.getConnectionStatus() || !isOnline) {
      setItensEstoque([]);
      setResumoEstoque(null);
      return;
    }

    try {
      const client = supabaseService.client;
      if (!client) return;

      // Query usando a view conforme especificado:
      // CREATE OR REPLACE VIEW vw_estoque AS
      // SELECT 
      //     m.id AS material_id,
      //     m.nome_material,
      //     COALESCE(SUM(i.total_kg), 0) AS kg_disponivel,
      //     CASE WHEN SUM(i.total_kg) > 0 
      //          THEN SUM(i.total_item) / SUM(i.total_kg) 
      //          ELSE 0 END AS preco_medio,
      //     COALESCE(SUM(i.total_item), 0) AS valor_total
      // FROM material m
      // LEFT JOIN item i ON i.material_fk = m.id
      // GROUP BY m.id, m.nome_material;

      const { data, error } = await client
        .from('vw_estoque')
        .select('*')
        .order('nome_material');

      if (error) {
        // Se a view não existir, tentar criar dados manualmente
        console.warn('View vw_estoque não encontrada, calculando estoque manualmente...');
        await loadEstoqueManual();
        return;
      }

      const itens: ItemEstoque[] = data || [];
      setItensEstoque(itens);

      // Calcular resumo
      const kg_total = itens.reduce((sum, item) => sum + item.kg_disponivel, 0);
      const quantidade_tipos = itens.filter(item => item.kg_disponivel > 0).length;
      const valor_total_estoque = itens.reduce((sum, item) => sum + item.valor_total, 0);

      setResumoEstoque({
        kg_total,
        quantidade_tipos,
        valor_total_estoque
      });

      toast({
        title: "Estoque atualizado",
        description: `${quantidade_tipos} tipos de materiais no estoque`,
      });

    } catch (error) {
      console.error('Error loading estoque data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do estoque",
        variant: "destructive"
      });
    }
  }, [isOnline, toast]);

  // Fallback: calcular estoque manualmente se a view não existir
  const loadEstoqueManual = useCallback(async () => {
    if (!supabaseService.getConnectionStatus() || !isOnline) return;

    try {
      const client = supabaseService.client;
      if (!client) return;

      // Buscar todos os materiais
      const { data: materiais, error: materiaisError } = await client
        .from('material')
        .select('id, nome_material');

      if (materiaisError) throw materiaisError;

      // Para cada material, calcular estoque baseado nos itens
      const estoque: ItemEstoque[] = [];

      for (const material of materiais || []) {
        // Buscar itens comprados (entrada) vs vendidos (saída)
        const { data: itensCompra, error: compraError } = await client
          .from('item')
          .select('total_kg, total_item, comanda!inner(tipo)')
          .eq('material_fk', material.id)
          .eq('comanda.tipo', 'compra');

        const { data: itensVenda, error: vendaError } = await client
          .from('item')
          .select('total_kg, total_item, comanda!inner(tipo)')
          .eq('material_fk', material.id)
          .eq('comanda.tipo', 'venda');

        if (compraError || vendaError) continue;

        // Calcular entradas (compras)
        const entradaKg = (itensCompra || []).reduce((sum, item) => sum + item.total_kg, 0);
        const entradaValor = (itensCompra || []).reduce((sum, item) => sum + item.total_item, 0);

        // Calcular saídas (vendas)
        const saidaKg = (itensVenda || []).reduce((sum, item) => sum + item.total_kg, 0);

        // Calcular disponível
        const kg_disponivel = entradaKg - saidaKg;
        const preco_medio = entradaKg > 0 ? entradaValor / entradaKg : 0;
        const valor_total = kg_disponivel * preco_medio;

        if (kg_disponivel >= 0) { // Só incluir se tiver estoque positivo ou zero
          estoque.push({
            material_id: material.id,
            nome_material: material.nome_material,
            kg_disponivel,
            preco_medio,
            valor_total
          });
        }
      }

      setItensEstoque(estoque);

      // Calcular resumo
      const kg_total = estoque.reduce((sum, item) => sum + item.kg_disponivel, 0);
      const quantidade_tipos = estoque.filter(item => item.kg_disponivel > 0).length;
      const valor_total_estoque = estoque.reduce((sum, item) => sum + item.valor_total, 0);

      setResumoEstoque({
        kg_total,
        quantidade_tipos,
        valor_total_estoque
      });

    } catch (error) {
      console.error('Error loading estoque manual:', error);
    }
  }, [isOnline]);

  // Refresh dos dados do estoque
  const refreshEstoque = useCallback(async () => {
    setLoading(true);
    await loadEstoqueData();
    setLoading(false);
  }, [loadEstoqueData]);

  // Monitor de status da rede
  useEffect(() => {
    const handleNetworkChange = (status: { connected: boolean }) => {
      const wasOffline = !isOnline;
      setIsOnline(status.connected);
      
      // Se voltou online, atualizar dados automaticamente
      if (status.connected && wasOffline && supabaseService.getConnectionStatus()) {
        console.log('Auto-refreshing estoque data after coming back online...');
        loadEstoqueData().catch(err => 
          console.error('Error auto-refreshing estoque data:', err)
        );
      }
    };

    networkService.addStatusListener(handleNetworkChange);
    setIsOnline(networkService.getConnectionStatus());

    return () => {
      networkService.removeStatusListener(handleNetworkChange);
    };
  }, [isOnline, loadEstoqueData]);

  // Carregar dados iniciais
  useEffect(() => {
    refreshEstoque();
  }, []);

  // Atualizar dados periodicamente quando online
  useEffect(() => {
    if (!isOnline) return;

    const interval = setInterval(() => {
      loadEstoqueData().catch(err => 
        console.error('Error refreshing estoque data:', err)
      );
    }, 300000); // Atualizar a cada 5 minutos

    return () => clearInterval(interval);
  }, [isOnline, loadEstoqueData]);

  return {
    itensEstoque,
    resumoEstoque,
    loading,
    isOnline,
    refreshEstoque
  };
}