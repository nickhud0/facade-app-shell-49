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
      if (!isOnline) {
        // Buscar dados do cache offline
        const cachedData = localStorage.getItem(`sobras_${periodo}`);
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          setSobras(parsed.data || []);
          logger.debug('📦 Dados de sobras carregados do cache offline');
        } else {
          setSobras([]);
          logger.debug('📦 Nenhum dado de sobras disponível offline');
        }
        return;
      }

      // Usar a nova função do supabaseService
      const dados = await supabaseService.buscarSobras(periodo, dataInicio, dataFim);
      setSobras(dados);
      
      // Salvar no cache para uso offline
      const cacheData = {
        data: dados,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(`sobras_${periodo}`, JSON.stringify(cacheData));
      
      logger.debug(`📦 ${dados.length} sobras carregadas do Supabase`);
      
    } catch (error) {
      notifyError(error, 'buscar sobras');
      
      // Fallback para cache offline em caso de erro
      const cachedData = localStorage.getItem(`sobras_${periodo}`);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        setSobras(parsed.data || []);
        logger.debug('📦 Usando cache offline devido ao erro');
      } else {
        setSobras([]);
      }
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