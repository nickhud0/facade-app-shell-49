import { useState, useEffect } from 'react';
import { useComandasOffline } from '@/hooks/useComandasOffline';
import { Comanda as ComandaDB } from '@/services/database';

export interface ItemComanda {
  id: number;
  material: string;
  preco: number;
  quantidade: number;
  total: number;
}

export interface Comanda {
  itens: ItemComanda[];
  tipo: 'compra' | 'venda';
  total: number;
  observacoes?: string;
}

export const useComandas = () => {
  const [comandaAtual, setComandaAtual] = useState<Comanda>({
    itens: [],
    tipo: 'compra',
    total: 0
  });

  const { criarComanda, isOnline } = useComandasOffline();

  // Carregar comanda do localStorage na inicialização
  useEffect(() => {
    const comandaStorage = localStorage.getItem('comandaAtual');
    if (comandaStorage) {
      try {
        const comanda = JSON.parse(comandaStorage);
        setComandaAtual(comanda);
      } catch (error) {
        console.error('Erro ao carregar comanda do localStorage:', error);
      }
    }
  }, []);

  // Sincronizar comanda com localStorage sempre que mudar
  useEffect(() => {
    localStorage.setItem('comandaAtual', JSON.stringify(comandaAtual));
  }, [comandaAtual]);

  const adicionarItem = (item: Omit<ItemComanda, 'id'>) => {
    const novoItem: ItemComanda = {
      ...item,
      id: Date.now()
    };

    setComandaAtual(prev => {
      const novosItens = [...prev.itens, novoItem];
      return {
        ...prev,
        itens: novosItens,
        total: novosItens.reduce((acc, item) => acc + item.total, 0)
      };
    });

    return novoItem;
  };

  const removerItem = (itemId: number) => {
    setComandaAtual(prev => {
      const novosItens = prev.itens.filter(item => item.id !== itemId);
      return {
        ...prev,
        itens: novosItens,
        total: novosItens.reduce((acc, item) => acc + item.total, 0)
      };
    });
  };

  const atualizarTipo = (tipo: 'compra' | 'venda') => {
    setComandaAtual(prev => ({
      ...prev,
      tipo
    }));
  };

  const finalizarComanda = async (): Promise<boolean> => {
    if (comandaAtual.itens.length === 0) {
      return false;
    }

    try {
      // Importar prefixoService dinamicamente
      const { prefixoService } = await import('@/services/prefixoService');
      
      // Gerar código da comanda usando prefixo + número sequencial
      const { codigoCompleto, prefixo, numeroLocal } = await prefixoService.gerarProximoNumeroComanda();
      
      // Preparar dados da comanda para o sistema offline
      const comanda: Omit<ComandaDB, 'id'> = {
        numero: codigoCompleto,
        prefixo_dispositivo: prefixo,
        numero_local: numeroLocal,
        tipo: comandaAtual.tipo,
        total: comandaAtual.total,
        status: 'finalizada',
        cliente: 'Sistema',
        dispositivo: navigator.userAgent.substring(0, 50),
        observacoes: comandaAtual.observacoes,
        itens: comandaAtual.itens.map(item => ({
          id: item.id,
          material: item.material,
          preco: item.preco,
          quantidade: item.quantidade,
          total: item.total
        })),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Salvar comanda no sistema offline
      const success = await criarComanda(comanda);
      
      if (success) {
        // Salvar no histórico localStorage para compatibilidade
        const historicoStorage = JSON.parse(localStorage.getItem('historicoComandas') || '[]');
        const comandaHistorico = {
          id: Date.now(),
          numero: codigoCompleto,
          data: new Date().toISOString().split('T')[0],
          horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          total: comandaAtual.total,
          itens: comandaAtual.itens.length,
          status: 'Finalizada',
          cliente: 'Sistema',
          tipo: comandaAtual.tipo,
          materiais: comandaAtual.itens.map(item => ({
            nome: item.material,
            quantidade: item.quantidade,
            preco: item.preco
          })),
          observacao: comandaAtual.observacoes
        };
        
        historicoStorage.push(comandaHistorico);
        localStorage.setItem('historicoComandas', JSON.stringify(historicoStorage));
        
        // Limpar comanda atual
        limparComanda();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Erro ao finalizar comanda:', error);
      return false;
    }
  };

  const limparComanda = () => {
    const novaComanda: Comanda = {
      itens: [],
      tipo: 'compra',
      total: 0
    };
    setComandaAtual(novaComanda);
    localStorage.removeItem('comandaAtual');
  };

  const temItens = comandaAtual.itens.length > 0;
  const podeAdicionarTipo = (tipo: 'compra' | 'venda') => {
    return !temItens || comandaAtual.tipo === tipo;
  };

  return {
    comandaAtual,
    adicionarItem,
    removerItem,
    atualizarTipo,
    finalizarComanda,
    limparComanda,
    temItens,
    podeAdicionarTipo
  };
};