import { useState, useEffect } from 'react';
import { supabaseService } from '@/services/supabase';
import { networkService } from '@/services/networkService';
import { notifyError } from '@/utils/errorHandler';
import { logger } from '@/utils/logger';

export interface ItemEstoque {
  material_id: number;
  material_nome: string;
  categoria: string;
  kg_disponivel: number;
  valor_medio_compra: number;
  valor_total_estoque: number;
}

export interface ResumoEstoque {
  totalKg: number;
  totalTipos: number;
  valorTotal: number;
}

export const useEstoqueSupabase = () => {
  const [itensEstoque, setItensEstoque] = useState<ItemEstoque[]>([]);
  const [resumoEstoque, setResumoEstoque] = useState<ResumoEstoque>({
    totalKg: 0,
    totalTipos: 0,
    valorTotal: 0
  });
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(networkService.getConnectionStatus());

  useEffect(() => {
    // Monitorar status da rede
    const handleNetworkChange = (status: any) => {
      setIsOnline(status.connected);
      
      // Auto-refresh quando voltar online
      if (status.connected) {
        refreshData();
      }
    };
    
    networkService.addStatusListener(handleNetworkChange);
    
    return () => {
      networkService.removeStatusListener(handleNetworkChange);
    };
  }, []);

  const carregarEstoque = async () => {
    setLoading(true);
    
    try {
      const dados = await supabaseService.buscarEstoqueAtual();
      setItensEstoque(dados);
      
      // Calcular resumo
      const totalKg = dados.reduce((acc: number, item: any) => acc + (item.kg_disponivel || 0), 0);
      const totalTipos = dados.length;
      const valorTotal = dados.reduce((acc: number, item: any) => acc + (item.valor_total_estoque || 0), 0);
      
      setResumoEstoque({ totalKg, totalTipos, valorTotal });
      
      logger.debug(`📦 ${dados.length} itens de estoque carregados`);
      
    } catch (error) {
      notifyError(error, 'carregar estoque');
      setItensEstoque([]);
      setResumoEstoque({ totalKg: 0, totalTipos: 0, valorTotal: 0 });
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    carregarEstoque();
  };

  useEffect(() => {
    carregarEstoque();
  }, []);

  // Refresh periódico quando online (5 minutos)
  useEffect(() => {
    if (!isOnline) return;
    
    const interval = setInterval(() => {
      carregarEstoque();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isOnline]);

  return {
    itensEstoque,
    resumoEstoque,
    loading,
    isOnline,
    refreshData,
    hasData: itensEstoque.length > 0
  };
};