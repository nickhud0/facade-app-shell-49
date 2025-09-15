import { useState, useEffect, useCallback } from 'react';
import { databaseService } from '@/services/database';
import { supabaseService } from '@/services/supabase';
import { useToast } from '@/hooks/use-toast';

export interface ConfiguracaoSupabase {
  url: string;
  anonKey: string;
}

export interface UseConfiguracaoReturn {
  configuracao: ConfiguracaoSupabase | null;
  loading: boolean;
  isConnected: boolean;
  salvarConfiguracao: (config: ConfiguracaoSupabase) => Promise<boolean>;
  testarConexao: () => Promise<boolean>;
  limparConfiguracao: () => Promise<void>;
}

export function useConfiguracao(): UseConfiguracaoReturn {
  const [configuracao, setConfiguracao] = useState<ConfiguracaoSupabase | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();

  // Carregar configuração salva
  const loadConfiguracao = useCallback(async () => {
    try {
      // Tentar carregar do cache local primeiro
      const cachedConfig = await databaseService.getConfig('supabase_config');
      if (cachedConfig) {
        const config = JSON.parse(cachedConfig);
        setConfiguracao(config);
        
        // Testar conexão automaticamente
        await testarConexaoComConfig(config);
      }
    } catch (error) {
      console.error('Error loading configuracao:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Testar conexão com configuração específica
  const testarConexaoComConfig = useCallback(async (config: ConfiguracaoSupabase): Promise<boolean> => {
    try {
      // Criar cliente temporário para teste
      const testClient = await supabaseService.initialize(config);
      setIsConnected(testClient);
      return testClient;
    } catch (error) {
      console.error('Error testing connection:', error);
      setIsConnected(false);
      return false;
    }
  }, []);

  // Salvar configuração
  const salvarConfiguracao = useCallback(async (config: ConfiguracaoSupabase): Promise<boolean> => {
    try {
      // Testar conexão antes de salvar
      const connectionValid = await testarConexaoComConfig(config);
      
      if (!connectionValid) {
        toast({
          title: "Erro de conexão",
          description: "Não foi possível conectar com as credenciais fornecidas",
          variant: "destructive"
        });
        return false;
      }

      // Salvar no cache local
      await databaseService.setConfig('supabase_config', JSON.stringify(config));
      
      // Configurar Supabase
      await supabaseService.initialize(config);
      
      setConfiguracao(config);
      setIsConnected(true);

      toast({
        title: "Configuração salva",
        description: "Supabase configurado com sucesso",
      });

      return true;
    } catch (error) {
      console.error('Error saving configuracao:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar configuração",
        variant: "destructive"
      });
      return false;
    }
  }, [toast, testarConexaoComConfig]);

  // Testar conexão atual
  const testarConexao = useCallback(async (): Promise<boolean> => {
    if (!configuracao) {
      toast({
        title: "Erro",
        description: "Nenhuma configuração encontrada",
        variant: "destructive"
      });
      return false;
    }

    const result = await testarConexaoComConfig(configuracao);
    
    if (result) {
      toast({
        title: "Conexão OK",
        description: "Conectado ao Supabase com sucesso",
      });
    } else {
      toast({
        title: "Erro de conexão",
        description: "Falha ao conectar com o Supabase",
        variant: "destructive"
      });
    }

    return result;
  }, [configuracao, toast, testarConexaoComConfig]);

  // Limpar configuração
  const limparConfiguracao = useCallback(async () => {
    try {
      await databaseService.setConfig('supabase_config', '');
      supabaseService.client = null;
      
      setConfiguracao(null);
      setIsConnected(false);

      toast({
        title: "Configuração removida",
        description: "Supabase desconectado",
      });
    } catch (error) {
      console.error('Error clearing configuracao:', error);
      toast({
        title: "Erro",
        description: "Erro ao limpar configuração",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Carregar configuração inicial
  useEffect(() => {
    loadConfiguracao();
  }, [loadConfiguracao]);

  return {
    configuracao,
    loading,
    isConnected,
    salvarConfiguracao,
    testarConexao,
    limparConfiguracao
  };
}