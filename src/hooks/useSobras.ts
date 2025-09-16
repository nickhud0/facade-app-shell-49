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

      if (!supabaseService.client) {
        notifyError(new Error('Supabase não inicializado'), 'buscar sobras');
        return;
      }

      let query = supabaseService.client
        .from('relatorio_vendas_excedentes')
        .select('*')
        .order('data', { ascending: false });

      // Aplicar filtros baseado no período
      switch (periodo) {
        case 'diario':
          query = query.gte('data', new Date().toISOString().split('T')[0]);
          break;
        case 'mensal':
          const inicioMes = new Date();
          inicioMes.setDate(1);
          query = query.filter('data', 'gte', inicioMes.toISOString().split('T')[0]);
          break;
        case 'anual':
          const inicioAno = new Date();
          inicioAno.setMonth(0, 1);
          query = query.filter('data', 'gte', inicioAno.toISOString().split('T')[0]);
          break;
        case 'personalizado':
          if (dataInicio && dataFim) {
            query = query
              .filter('data', 'gte', dataInicio.toISOString().split('T')[0])
              .filter('data', 'lte', dataFim.toISOString().split('T')[0]);
          }
          break;
      }

      const { data, error } = await query;

      if (error) {
        notifyError(error, 'buscar sobras');
        return;
      }

      setSobras(data || []);
      
      // Salvar no cache para uso offline
      const cacheData = {
        data: data || [],
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(`sobras_${periodo}`, JSON.stringify(cacheData));
      
      logger.debug(`📦 ${data?.length || 0} sobras carregadas do Supabase`);
      
    } catch (error) {
      notifyError(error, 'buscar sobras');
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