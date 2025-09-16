import { useState, useEffect, useCallback } from 'react';
import { databaseService, Comanda, ComandaItem } from '@/services/database';
import { supabaseService } from '@/services/supabase';
import { networkService } from '@/services/networkService';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export interface UseComandaAtualReturn {
  comandaAtual: Comanda | null;
  loading: boolean;
  isOnline: boolean;
  criarComanda: (tipo: 'compra' | 'venda', cliente?: string) => Promise<boolean>;
  adicionarItem: (material: string, preco: number, quantidade: number) => Promise<boolean>;
  removerItem: (itemId: number) => Promise<boolean>;
  finalizarComanda: (observacoes?: string) => Promise<boolean>;
  cancelarComanda: () => Promise<boolean>;
  limparComanda: () => void;
}

export function useComandaAtual(): UseComandaAtualReturn {
  const [comandaAtual, setComandaAtual] = useState<Comanda | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const { toast } = useToast();

  // Carregar comanda ativa do cache local
  const loadComandaAtual = useCallback(async () => {
    try {
      const cachedComandas = await databaseService.getCachedComandas(1);
      const comandaAtiva = cachedComandas.find(c => c.status === 'ativa');
      setComandaAtual(comandaAtiva || null);
    } catch (error) {
      console.error('Error loading comanda atual:', error);
    }
  }, []);

  // Criar nova comanda
  const criarComanda = useCallback(async (tipo: 'compra' | 'venda', cliente?: string): Promise<boolean> => {
    try {
      // Verificar se já existe comanda ativa
      if (comandaAtual && comandaAtual.status === 'ativa') {
        toast({
          title: "Comanda ativa",
          description: "Finalize a comanda atual antes de criar uma nova",
          variant: "destructive"
        });
        return false;
      }

      const now = new Date();
      const numeroComanda = `CMD-${Date.now()}`;
      
      const novaComanda: Comanda = {
        id: Date.now(),
        numero: numeroComanda,
        tipo,
        total: 0,
        status: 'ativa',
        cliente: cliente || undefined,
        dispositivo: 'Local',
        observacoes: undefined,
        itens: [],
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      };

      // Salvar no cache local
      await databaseService.cacheComandas([novaComanda]);
      setComandaAtual(novaComanda);

      toast({
        title: "Comanda criada",
        description: `${tipo.charAt(0).toUpperCase() + tipo.slice(1)} - ${numeroComanda}`,
      });

      return true;
    } catch (error) {
      console.error('Error creating comanda:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar comanda",
        variant: "destructive"
      });
      return false;
    }
  }, [comandaAtual, toast]);

  // Adicionar item à comanda
  const adicionarItem = useCallback(async (material: string, preco: number, quantidade: number): Promise<boolean> => {
    if (!comandaAtual || comandaAtual.status !== 'ativa') {
      toast({
        title: "Erro",
        description: "Nenhuma comanda ativa encontrada",
        variant: "destructive"
      });
      return false;
    }

    try {
      const novoItem: ComandaItem = {
        id: Date.now(),
        material,
        preco,
        quantidade,
        total: preco * quantidade
      };

      const itensAtualizados = [...comandaAtual.itens, novoItem];
      const totalAtualizado = itensAtualizados.reduce((sum, item) => sum + item.total, 0);

      const comandaAtualizada: Comanda = {
        ...comandaAtual,
        itens: itensAtualizados,
        total: totalAtualizado,
        updated_at: new Date().toISOString()
      };

      // Atualizar cache local
      await databaseService.cacheComandas([comandaAtualizada]);
      setComandaAtual(comandaAtualizada);

      toast({
        title: "Item adicionado",
        description: `${material} - ${quantidade}kg`,
      });

      return true;
    } catch (error) {
      console.error('Error adding item to comanda:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar item",
        variant: "destructive"
      });
      return false;
    }
  }, [comandaAtual, toast]);

  // Remover item da comanda
  const removerItem = useCallback(async (itemId: number): Promise<boolean> => {
    if (!comandaAtual || comandaAtual.status !== 'ativa') return false;

    try {
      const itensAtualizados = comandaAtual.itens.filter(item => item.id !== itemId);
      const totalAtualizado = itensAtualizados.reduce((sum, item) => sum + item.total, 0);

      const comandaAtualizada: Comanda = {
        ...comandaAtual,
        itens: itensAtualizados,
        total: totalAtualizado,
        updated_at: new Date().toISOString()
      };

      // Atualizar cache local
      await databaseService.cacheComandas([comandaAtualizada]);
      setComandaAtual(comandaAtualizada);

      toast({
        title: "Item removido",
        description: "Item removido da comanda",
      });

      return true;
    } catch (error) {
      console.error('Error removing item from comanda:', error);
      return false;
    }
  }, [comandaAtual, toast]);

  // Finalizar comanda
  const finalizarComanda = useCallback(async (observacoes?: string): Promise<boolean> => {
    if (!comandaAtual || comandaAtual.status !== 'ativa') {
      toast({
        title: "Erro",
        description: "Nenhuma comanda ativa para finalizar",
        variant: "destructive"
      });
      return false;
    }

    if (comandaAtual.itens.length === 0) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos um item antes de finalizar",
        variant: "destructive"
      });
      return false;
    }

    try {
      const comandaFinalizada: Comanda = {
        ...comandaAtual,
        status: 'finalizada',
        observacoes,
        updated_at: new Date().toISOString()
      };

      // Atualizar cache local
      await databaseService.cacheComandas([comandaFinalizada]);

      // Adicionar à fila de sincronização para enviar ao servidor
      await databaseService.addToSyncQueue('finalizar_comanda', {
        comanda: comandaFinalizada,
        itens: comandaFinalizada.itens
      });

      // Se online, tentar sincronizar imediatamente
      if (isOnline && supabaseService.getConnectionStatus()) {
        const syncResult = await supabaseService.processSyncQueue();
        if (syncResult.success > 0) {
          logger.debug('Comanda sincronizada com sucesso');
        }
      }

      setComandaAtual(null);

      toast({
        title: "Comanda finalizada",
        description: `Total: R$ ${comandaFinalizada.total.toFixed(2)}`,
      });

      return true;
    } catch (error) {
      console.error('Error finalizing comanda:', error);
      toast({
        title: "Erro",
        description: "Erro ao finalizar comanda",
        variant: "destructive"
      });
      return false;
    }
  }, [comandaAtual, isOnline, toast]);

  // Cancelar comanda
  const cancelarComanda = useCallback(async (): Promise<boolean> => {
    if (!comandaAtual) return false;

    try {
      const comandaCancelada: Comanda = {
        ...comandaAtual,
        status: 'cancelada',
        updated_at: new Date().toISOString()
      };

      await databaseService.cacheComandas([comandaCancelada]);
      setComandaAtual(null);

      toast({
        title: "Comanda cancelada",
        description: "Comanda foi cancelada",
      });

      return true;
    } catch (error) {
      console.error('Error canceling comanda:', error);
      return false;
    }
  }, [comandaAtual, toast]);

  // Limpar comanda atual (sem salvar)
  const limparComanda = useCallback(() => {
    setComandaAtual(null);
  }, []);

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

  // Carregar comanda atual ao inicializar
  useEffect(() => {
    loadComandaAtual();
  }, [loadComandaAtual]);

  return {
    comandaAtual,
    loading,
    isOnline,
    criarComanda,
    adicionarItem,
    removerItem,
    finalizarComanda,
    cancelarComanda,
    limparComanda
  };
}