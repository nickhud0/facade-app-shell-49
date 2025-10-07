import { useState, useEffect, useMemo } from 'react';
import { useOfflineData } from '@/hooks/useOfflineData';
import { Transacao, Material } from '@/services/database';

export interface ItemEstoque {
  material_id: number;
  material_nome: string;
  categoria: string;
  kg_comprado: number;
  kg_vendido: number;
  kg_disponivel: number;
  valor_medio_compra: number;
  valor_total_estoque: number;
}

export const useEstoque = () => {
  const { data: transacoes, refreshData: refreshTransacoes } = useOfflineData<Transacao>('transacoes');
  const { data: materiais, refreshData: refreshMateriais } = useOfflineData<Material>('materiais');

  // Função para obter nome do material por ID
  const getMaterialInfo = (materialId: number) => {
    const material = materiais.find(m => m.id === materialId);
    return {
      nome: material?.nome || `Material ${materialId}`,
      categoria: material?.categoria || "Outros"
    };
  };

  // Calcular estoque baseado nas transações
  const calcularEstoque = useMemo(() => {
    const estoqueMap = new Map<number, {
      compras: { peso: number; valor: number }[];
      vendas: { peso: number; valor: number }[];
    }>();

    // Agrupar transações por material
    transacoes.forEach(transacao => {
      if (!estoqueMap.has(transacao.material_id)) {
        estoqueMap.set(transacao.material_id, { compras: [], vendas: [] });
      }

      const item = estoqueMap.get(transacao.material_id)!;
      
      if (transacao.tipo === 'compra') {
        item.compras.push({
          peso: transacao.peso,
          valor: transacao.valor_total
        });
      } else {
        item.vendas.push({
          peso: transacao.peso,
          valor: transacao.valor_total
        });
      }
    });

    // Calcular dados do estoque
    const itensEstoque: ItemEstoque[] = [];

    estoqueMap.forEach((dados, materialId) => {
      const materialInfo = getMaterialInfo(materialId);
      
      const kgComprado = dados.compras.reduce((acc, compra) => acc + compra.peso, 0);
      const kgVendido = dados.vendas.reduce((acc, venda) => acc + venda.peso, 0);
      const kgDisponivel = Math.max(0, kgComprado - kgVendido);
      
      const valorTotalCompras = dados.compras.reduce((acc, compra) => acc + compra.valor, 0);
      const valorMedioCompra = kgComprado > 0 ? valorTotalCompras / kgComprado : 0;
      const valorTotalEstoque = kgDisponivel * valorMedioCompra;

      // Só incluir no estoque se há material disponível
      if (kgDisponivel > 0) {
        itensEstoque.push({
          material_id: materialId,
          material_nome: materialInfo.nome,
          categoria: materialInfo.categoria,
          kg_comprado: kgComprado,
          kg_vendido: kgVendido,
          kg_disponivel: kgDisponivel,
          valor_medio_compra: valorMedioCompra,
          valor_total_estoque: valorTotalEstoque
        });
      }
    });

    return itensEstoque.sort((a, b) => a.material_nome.localeCompare(b.material_nome));
  }, [transacoes, materiais]);

  // Resumo do estoque
  const resumoEstoque = useMemo(() => {
    const totalKg = calcularEstoque.reduce((acc, item) => acc + item.kg_disponivel, 0);
    const totalTipos = calcularEstoque.length;
    const valorTotal = calcularEstoque.reduce((acc, item) => acc + item.valor_total_estoque, 0);

    return {
      totalKg,
      totalTipos,
      valorTotal
    };
  }, [calcularEstoque]);

  const refreshData = () => {
    refreshTransacoes();
    refreshMateriais();
  };

  return {
    itensEstoque: calcularEstoque,
    resumoEstoque,
    refreshData,
    hasData: transacoes.length > 0
  };
};