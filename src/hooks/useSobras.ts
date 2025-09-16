import { useState, useEffect } from 'react';
import { supabaseService } from '@/services/supabase';
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

  const buscarSobras = async (periodo: 'diario' | 'mensal' | 'anual' | 'personalizado', dataInicio?: Date, dataFim?: Date) => {
    setLoading(true);
    
    try {
      // Usar a função do supabaseService que já trata online/offline
      const dados = await supabaseService.buscarSobras(periodo, dataInicio, dataFim);
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
    buscarSobras
  };
};