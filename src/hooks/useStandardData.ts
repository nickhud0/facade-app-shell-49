/**
 * Hooks padronizados para todos os tipos de dados
 * Todos seguem o padrão: offline-first, loading states, error handling
 */

import { useState, useEffect, useCallback } from 'react';
import { useMockData } from '@/contexts/MockDataContext';

export interface Material {
  id: number;
  nome: string;
  preco_compra: number;
  preco_venda: number;
  unidade: string;
  created_at: string;
}

export interface Transacao {
  id: number;
  tipo: 'compra' | 'venda';
  material_id: number;
  peso: number;
  valor_total: number;
  created_at: string;
}

export interface Vale {
  id: number;
  nome_cliente: string;
  valor: number;
  status: 'pendente' | 'pago';
  created_at: string;
}

export interface Despesa {
  id: number;
  descricao: string;
  valor: number;
  categoria: string;
  created_at: string;
}

/**
 * Hook padrão para materiais
 */
export function useMateriais() {
  const { materiais, loading } = useMockData();
  
  const createMaterial = useCallback(async (material: Omit<Material, 'id'>) => {
    // Mock implementation
    console.log('Creating material:', material);
    return true;
  }, []);

  return {
    materiais,
    loading,
    error: null,
    isOnline: true,
    hasData: materiais.length > 0,
    refreshMateriais: () => {},
    createMaterial
  };
}

/**
 * Hook padrão para transações (histórico compra/venda)
 */
export function useTransacoes(limit = 50) {
  const { transacoes, loading } = useMockData();
  
  const createTransacao = useCallback(async (transacao: Omit<Transacao, 'id'>) => {
    // Mock implementation
    console.log('Creating transacao:', transacao);
    return true;
  }, []);

  return {
    transacoes: transacoes.slice(0, limit),
    loading,
    error: null,
    isOnline: true,
    hasData: transacoes.length > 0,
    refreshTransacoes: () => {},
    createTransacao
  };
}

/**
 * Hook padrão para vales
 */
export function useVales() {
  const { vales, loading } = useMockData();
  
  const createVale = useCallback(async (vale: Omit<Vale, 'id'>) => {
    // Mock implementation
    console.log('Creating vale:', vale);
    return true;
  }, []);

  const updateValeStatus = useCallback(async (id: number, status: Vale['status']) => {
    // Mock implementation
    console.log('Updating vale status:', id, status);
    return true;
  }, []);

  // Calcular vales pendentes
  const valesPendentes = vales.filter(vale => vale.status === 'pendente');
  const totalPendente = valesPendentes.reduce((acc, vale) => acc + vale.valor, 0);

  return {
    vales,
    valesPendentes,
    totalPendente,
    quantidadePendentes: valesPendentes.length,
    loading,
    error: null,
    isOnline: true,
    hasData: vales.length > 0,
    refreshVales: () => {},
    createVale,
    updateValeStatus
  };
}

/**
 * Hook padrão para despesas
 */
export function useDespesas() {
  const { despesas, loading } = useMockData();
  
  const createDespesa = useCallback(async (despesa: Omit<Despesa, 'id'>) => {
    // Mock implementation
    console.log('Creating despesa:', despesa);
    return true;
  }, []);

  return {
    despesas,
    loading,
    error: null,
    isOnline: true,
    hasData: despesas.length > 0,
    refreshDespesas: () => {},
    createDespesa
  };
}