import { useState, useEffect } from 'react';
import { buscarSobras } from '@/services/supabase';
import { networkService } from '@/services/networkService';
import { notifyError } from '@/utils/errorHandler';
import { logger } from '@/utils/logger';

export interface SobraItem {
  material: string;
  data: string;
  quantidade_excedente: number;
  comanda?: string;
}

export const useSobras = () => {
  const [sobras, setSobras] = useState<SobraItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(networkService.getConnectionStatus());

  useEffect(() => {
    // Monitorar status da rede
    const handleNetworkChange = (status: any) => {
      setIsOnline(status.connected);
    };
    
    networkService.addStatusListener(handleNetworkChange);
    
    return () => {
      networkService.removeStatusListener(handleNetworkChange);
    };
  }, []);

  const carregarSobras = async (periodo: 'diario' | 'mensal' | 'anual' | 'personalizado', dataInicio?: Date, dataFim?: Date) => {
    setLoading(true);
    
    try {
      // Converter as datas para string no formato esperado
      const dataInicioStr = dataInicio?.toISOString().split('T')[0];
      const dataFimStr = dataFim?.toISOString().split('T')[0];
      
      // Usar a função standalone buscarSobras
      const dados = await buscarSobras(periodo, dataInicioStr, dataFimStr);
      setSobras(dados);
      
      logger.debug(`📦 ${dados.length} sobras carregadas`);
      
    } catch (error) {
      notifyError(error, 'buscar sobras');
      setSobras([]);
    } finally {
      setLoading(false);
    }
  };

  return {
    sobras,
    loading,
    isOnline,
    buscarSobras: carregarSobras
  };
};