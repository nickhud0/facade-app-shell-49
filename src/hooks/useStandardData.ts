/**
 * Hooks padronizados para todos os tipos de dados
 * Todos seguem o padrão: offline-first, loading states, error handling
 */

import { useState, useEffect, useCallback } from 'react';
import { Material, Transacao, Vale, Despesa } from '@/services/database';
import { useDataService } from '@/hooks/useDataService';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook padrão para materiais
 */
export function useMateriais() {
  const { data, loading, error, isOnline, hasData, refresh, createItem } = useDataService<Material>('materiais');
  const { toast } = useToast();

  const createMaterial = useCallback(async (material: Omit<Material, 'id'>) => {
    const success = await createItem(material);
    
    if (success) {
      toast({
        title: "Material cadastrado",
        description: isOnline ? "Salvo no servidor" : "Será sincronizado quando conectar"
      });
    } else {
      toast({
        title: "Erro",
        description: "Erro ao cadastrar material",
        variant: "destructive"
      });
    }
    
    return success;
  }, [isOnline, toast, createItem]);

  return {
    materiais: data,
    loading,
    error,
    isOnline,
    hasData,
    refreshMateriais: refresh,
    createMaterial
  };
}

/**
 * Hook padrão para transações (histórico compra/venda)
 */
export function useTransacoes(limit = 50) {
  const { data, loading, error, isOnline, hasData, refresh, createItem } = useDataService<Transacao>('transacoes');
  const { toast } = useToast();

  const createTransacao = useCallback(async (transacao: Omit<Transacao, 'id'>) => {
    const success = await createItem(transacao);
    
    if (success) {
      toast({
        title: "Transação registrada",
        description: isOnline ? "Salva no servidor" : "Será sincronizada quando conectar"
      });
    } else {
      toast({
        title: "Erro",
        description: "Erro ao registrar transação",
        variant: "destructive"
      });
    }
    
    return success;
  }, [isOnline, toast, createItem]);

  return {
    transacoes: data,
    loading,
    error,
    isOnline,
    hasData,
    refreshTransacoes: refresh,
    createTransacao
  };
}

/**
 * Hook padrão para vales
 */
export function useVales() {
  const { data, loading, error, isOnline, hasData, refresh, createItem, updateItem } = useDataService<Vale>('vales');
  const { toast } = useToast();

  const createVale = useCallback(async (vale: Omit<Vale, 'id'>) => {
    const success = await createItem(vale);
    
    if (success) {
      toast({
        title: "Vale cadastrado",
        description: isOnline ? "Salvo no servidor" : "Será sincronizado quando conectar"
      });
    } else {
      toast({
        title: "Erro",
        description: "Erro ao cadastrar vale",
        variant: "destructive"
      });
    }
    
    return success;
  }, [isOnline, toast, createItem]);

  const updateValeStatus = useCallback(async (id: number, status: Vale['status']) => {
    const success = await updateItem(id, { status });
    
    if (success) {
      toast({
        title: "Vale atualizado",
        description: `Status alterado para: ${status}`
      });
    } else {
      toast({
        title: "Erro",
        description: "Erro ao atualizar vale",
        variant: "destructive"
      });
    }
    
    return success;
  }, [toast, updateItem]);

  // Calcular vales pendentes
  const valesPendentes = data.filter(vale => vale.status === 'pendente');
  const totalPendente = valesPendentes.reduce((acc, vale) => acc + vale.valor, 0);

  return {
    vales: data,
    valesPendentes,
    totalPendente,
    quantidadePendentes: valesPendentes.length,
    loading,
    error,
    isOnline,
    hasData,
    refreshVales: refresh,
    createVale,
    updateValeStatus
  };
}

/**
 * Hook padrão para despesas
 */
export function useDespesas() {
  const { data, loading, error, isOnline, hasData, refresh, createItem } = useDataService<Despesa>('despesas');
  const { toast } = useToast();

  const createDespesa = useCallback(async (despesa: Omit<Despesa, 'id'>) => {
    const success = await createItem(despesa);
    
    if (success) {
      toast({
        title: "Despesa cadastrada",
        description: isOnline ? "Salva no servidor" : "Será sincronizada quando conectar"
      });
    } else {
      toast({
        title: "Erro",
        description: "Erro ao cadastrar despesa",
        variant: "destructive"
      });
    }
    
    return success;
  }, [isOnline, toast, createItem]);

  return {
    despesas: data,
    loading,
    error,
    isOnline,
    hasData,
    refreshDespesas: refresh,
    createDespesa
  };
}