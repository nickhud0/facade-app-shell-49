/**
 * Serviço centralizado de dados offline-first
 * Padrão único para todas as telas: offline → cache local → online → sincronização
 */

import { databaseService, Material, Transacao, Vale, Despesa, Pendencia, Comanda } from '@/services/database';
import { supabaseService } from '@/services/supabase';
import { networkService } from '@/services/networkService';
import { offlineQueueService } from '@/services/offlineQueue';
import { logger } from '@/utils/logger';

export interface DataLoadResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  isOnline: boolean;
  hasData: boolean;
}

export interface FechamentoData {
  ultimoFechamento: string;
  receitas: number;
  compras: number;
  despesas: number;
  lucroAtual: number;
}

export interface EstoqueItem {
  material_id: number;
  material_nome: string;
  categoria?: string;
  kg_comprado: number;
  kg_vendido: number;
  kg_disponivel: number;
  valor_medio_compra: number;
  valor_total_estoque: number;
}

export interface EstoqueResumo {
  totalKg: number;
  totalTipos: number;
  valorTotal: number;
}

class DataService {
  private isOnline = false;

  constructor() {
    // Monitor status da rede
    networkService.addStatusListener((status) => {
      const wasOffline = !this.isOnline;
      this.isOnline = status.connected;
      
      // Auto-sincronizar quando voltar online
      if (status.connected && wasOffline) {
        this.autoSync().catch(err => 
          logger.error('Auto-sync failed:', err)
        );
      }
    });
    
    this.isOnline = networkService.getConnectionStatus();
  }

  /**
   * Padrão padrão para carregar dados offline-first
   */
  private async loadData<T>(
    cacheLoader: () => Promise<T[]>,
    serverLoader?: () => Promise<T[]>,
    cacheUpdater?: (data: T[]) => Promise<void>
  ): Promise<DataLoadResult<T>> {
    let data: T[] = [];
    let loading = true;
    let error: string | null = null;
    const isOnline = this.isOnline;

    try {
      // 1. Sempre carregar cache local primeiro (rápido)
      data = await cacheLoader();
      
      // 2. Se online, tentar sincronizar com servidor
      if (isOnline && serverLoader && cacheUpdater) {
        try {
          const serverData = await serverLoader();
          await cacheUpdater(serverData);
          data = serverData;
        } catch (serverError) {
          logger.debug('Server sync failed, using cached data:', serverError);
          // Não é erro crítico - continua com dados do cache
        }
      }
    } catch (e) {
      error = 'Erro ao carregar dados';
      logger.error('Data loading failed:', e);
    } finally {
      loading = false;
    }

    return {
      data,
      loading,
      error,
      isOnline,
      hasData: data.length > 0
    };
  }

  /**
   * Padrão para criar dados offline-first
   */
  private async createData<T>(
    localCreator: (item: T) => Promise<number | boolean>,
    syncAction: string,
    syncData: T
  ): Promise<boolean> {
    try {
      // 1. Salvar localmente primeiro
      await localCreator(syncData);
      
      // 2. Adicionar à fila de sincronização
      await offlineQueueService.addToQueue(syncAction, 'create', syncData);
      
      return true;
    } catch (error) {
      logger.error('Create data failed:', error);
      return false;
    }
  }

  /**
   * Carregar materiais
   */
  async loadMateriais(): Promise<DataLoadResult<Material>> {
    return this.loadData(
      () => databaseService.getCachedMateriais(),
      async () => {
        const client = supabaseService.client;
        if (!client) throw new Error('Supabase not connected');
        
        const { data, error } = await client
          .from('material')
          .select('*')
          .order('nome');
        
        if (error) throw error;
        return data || [];
      },
      (data) => databaseService.cacheMateriais(data)
    );
  }

  /**
   * Criar material
   */
  async createMaterial(material: Omit<Material, 'id'>): Promise<boolean> {
    return this.createData<Omit<Material, 'id'>>(
      (item) => databaseService.addMaterialToCache(item),
      'material',
      material
    );
  }

  /**
   * Carregar transações (histórico compra/venda)
   */
  async loadTransacoes(limit = 50): Promise<DataLoadResult<Transacao>> {
    return this.loadData(
      () => databaseService.getCachedTransacoes(limit),
      async () => {
        const client = supabaseService.client;
        if (!client) throw new Error('Supabase not connected');
        
        const { data, error } = await client
          .from('item')
          .select(`
            *,
            material:material_id(nome)
          `)
          .order('created_at', { ascending: false })
          .limit(limit);
        
        if (error) throw error;
        
        // Transformar para formato local
        return (data || []).map(item => ({
          id: item.id,
          tipo: item.tipo as 'compra' | 'venda',
          material_id: item.material_id,
          peso: item.peso,
          valor_total: item.valor_total,
          observacoes: item.observacoes,
          created_at: item.created_at
        }));
      },
      (data) => databaseService.cacheTransacoes(data)
    );
  }

  /**
   * Criar transação
   */
  async createTransacao(transacao: Omit<Transacao, 'id'>): Promise<boolean> {
    try {
      // Adicionar ao cache local como transação
      const cached = localStorage.getItem('transacoes_cache') || '[]';
      const transacoes = JSON.parse(cached);
      const newId = Date.now();
      const newTransacao = { ...transacao, id: newId };
      transacoes.unshift(newTransacao);
      localStorage.setItem('transacoes_cache', JSON.stringify(transacoes.slice(0, 50)));
      
      // Adicionar à fila de sincronização
      await offlineQueueService.addToQueue('comanda', 'create', {
        tipo: transacao.tipo,
        material_id: transacao.material_id,
        peso: transacao.peso,
        valor_total: transacao.valor_total,
        observacoes: transacao.observacoes,
        created_at: transacao.created_at || new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      logger.error('Create transacao failed:', error);
      return false;
    }
  }

  /**
   * Carregar vales
   */
  async loadVales(): Promise<DataLoadResult<Vale>> {
    return this.loadData(
      () => databaseService.getCachedVales(),
      async () => {
        const client = supabaseService.client;
        if (!client) throw new Error('Supabase not connected');
        
        const { data, error } = await client
          .from('vale')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        return (data || []).map(vale => ({
          id: vale.id,
          valor: vale.valor,
          descricao: vale.descricao || vale.cliente_nome || 'Vale',
          status: vale.status as 'pendente' | 'pago' | 'cancelado',
          created_at: vale.created_at
        }));
      },
      (data) => databaseService.cacheVales(data)
    );
  }

  /**
   * Criar vale
   */
  async createVale(vale: Omit<Vale, 'id'>): Promise<boolean> {
    return this.createData<Omit<Vale, 'id'>>(
      (item) => databaseService.addValeToCache(item),
      'vale',
      vale
    );
  }

  /**
   * Atualizar status do vale
   */
  async updateValeStatus(id: number, status: Vale['status']): Promise<boolean> {
    try {
      // Atualizar cache local
      const vales = await databaseService.getCachedVales();
      const updatedVales = vales.map(vale => 
        vale.id === id ? { ...vale, status } : vale
      );
      await databaseService.cacheVales(updatedVales);
      
      // Adicionar à fila de sincronização
      await offlineQueueService.addToQueue('vale', 'update', { id, status });
      
      return true;
    } catch (error) {
      logger.error('Update vale status failed:', error);
      return false;
    }
  }

  /**
   * Carregar despesas
   */
  async loadDespesas(): Promise<DataLoadResult<Despesa>> {
    return this.loadData(
      () => databaseService.getCachedDespesas(),
      async () => {
        const client = supabaseService.client;
        if (!client) throw new Error('Supabase not connected');
        
        const { data, error } = await client
          .from('pendencia')
          .select('*')
          .eq('tipo', 'eu devo')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        return (data || []).map(item => ({
          id: item.id,
          descricao: item.descricao,
          valor: item.valor || 0,
          categoria: item.categoria,
          created_at: item.created_at
        }));
      },
      (data) => databaseService.cacheDespesas(data)
    );
  }

  /**
   * Criar despesa
   */
  async createDespesa(despesa: Omit<Despesa, 'id'>): Promise<boolean> {
    return this.createData<Omit<Despesa, 'id'>>(
      (item) => databaseService.addDespesaToCache(item),
      'despesa',
      despesa
    );
  }

  /**
   * Carregar estoque atual
   */
  async loadEstoque(): Promise<{ itens: EstoqueItem[]; resumo: EstoqueResumo; loading: boolean; error: string | null; isOnline: boolean }> {
    let loading = true;
    let error: string | null = null;
    let itens: EstoqueItem[] = [];
    let resumo: EstoqueResumo = { totalKg: 0, totalTipos: 0, valorTotal: 0 };

    try {
      if (this.isOnline && supabaseService.client) {
        // Tentar usar view do Supabase primeiro
        try {
          const { data, error: supabaseError } = await supabaseService.client
            .from('vw_estoque')
            .select('*');
          
          if (supabaseError) throw supabaseError;
          
          itens = data || [];
          resumo = {
            totalKg: itens.reduce((acc, item) => acc + item.kg_disponivel, 0),
            totalTipos: itens.length,
            valorTotal: itens.reduce((acc, item) => acc + item.valor_total_estoque, 0)
          };
        } catch (viewError) {
          logger.debug('View vw_estoque not found, calculating manually');
          // Fallback: calcular manualmente
          itens = await this.calcularEstoqueManual();
          resumo = {
            totalKg: itens.reduce((acc, item) => acc + item.kg_disponivel, 0),
            totalTipos: itens.length,
            valorTotal: itens.reduce((acc, item) => acc + item.valor_total_estoque, 0)
          };
        }
      } else {
        // Offline: usar dados em cache
        const cachedEstoque = localStorage.getItem('estoque_cache');
        if (cachedEstoque) {
          const cached = JSON.parse(cachedEstoque);
          itens = cached.itens || [];
          resumo = cached.resumo || { totalKg: 0, totalTipos: 0, valorTotal: 0 };
        }
      }
      
      // Cache os dados para uso offline
      if (itens.length > 0) {
        localStorage.setItem('estoque_cache', JSON.stringify({ itens, resumo }));
        localStorage.setItem('estoque_last_update', new Date().toISOString());
      }
    } catch (e) {
      error = 'Erro ao carregar estoque';
      logger.error('Estoque loading failed:', e);
    } finally {
      loading = false;
    }

    return {
      itens,
      resumo,
      loading,
      error,
      isOnline: this.isOnline
    };
  }

  /**
   * Calcular estoque manualmente (fallback)
   */
  private async calcularEstoqueManual(): Promise<EstoqueItem[]> {
    const client = supabaseService.client;
    if (!client) return [];

    // Buscar materiais
    const { data: materiais } = await client
      .from('material')
      .select('*');
    
    // Buscar transações (itens)
    const { data: itens } = await client
      .from('item')
      .select('*');
    
    const estoque: EstoqueItem[] = [];
    
    for (const material of materiais || []) {
      const itensDoMaterial = (itens || []).filter(item => item.material_id === material.id);
      
      const compras = itensDoMaterial.filter(item => item.tipo === 'compra');
      const vendas = itensDoMaterial.filter(item => item.tipo === 'venda');
      
      const kgComprado = compras.reduce((acc, item) => acc + (item.peso || 0), 0);
      const kgVendido = vendas.reduce((acc, item) => acc + (item.peso || 0), 0);
      const kgDisponivel = Math.max(0, kgComprado - kgVendido);
      
      const valorTotalCompras = compras.reduce((acc, item) => acc + (item.valor_total || 0), 0);
      const valorMedioCompra = kgComprado > 0 ? valorTotalCompras / kgComprado : material.preco_compra_kg;
      
      estoque.push({
        material_id: material.id,
        material_nome: material.nome,
        categoria: material.categoria,
        kg_comprado: kgComprado,
        kg_vendido: kgVendido,
        kg_disponivel: kgDisponivel,
        valor_medio_compra: valorMedioCompra,
        valor_total_estoque: kgDisponivel * valorMedioCompra
      });
    }
    
    return estoque.filter(item => item.kg_disponivel > 0);
  }

  /**
   * Carregar dados de fechamento
   */
  async loadFechamento(): Promise<{ dados: FechamentoData; loading: boolean; error: string | null }> {
    let loading = true;
    let error: string | null = null;
    let dados: FechamentoData = {
      ultimoFechamento: new Date().toLocaleDateString('pt-BR'),
      receitas: 0,
      compras: 0,
      despesas: 0,
      lucroAtual: 0
    };

    try {
      // Carregar transações do dia atual
      const transacoesResult = await this.loadTransacoes(100);
      const hoje = new Date().toDateString();
      
      const transacoesHoje = transacoesResult.data.filter(t => 
        new Date(t.created_at || '').toDateString() === hoje
      );
      
      // Carregar despesas do dia atual  
      const despesasResult = await this.loadDespesas();
      const despesasHoje = despesasResult.data.filter(d =>
        new Date(d.created_at || '').toDateString() === hoje
      );
      
      const receitas = transacoesHoje
        .filter(t => t.tipo === 'venda')
        .reduce((acc, t) => acc + t.valor_total, 0);
      
      const compras = transacoesHoje
        .filter(t => t.tipo === 'compra')
        .reduce((acc, t) => acc + t.valor_total, 0);
      
      const despesas = despesasHoje
        .reduce((acc, d) => acc + d.valor, 0);
      
      dados = {
        ultimoFechamento: new Date().toLocaleDateString('pt-BR'),
        receitas,
        compras,
        despesas,
        lucroAtual: receitas - compras - despesas
      };
    } catch (e) {
      error = 'Erro ao carregar dados de fechamento';
      logger.error('Fechamento loading failed:', e);
    } finally {
      loading = false;
    }

    return { dados, loading, error };
  }

  /**
   * Auto-sincronizar quando voltar online
   */
  private async autoSync(): Promise<void> {
    logger.debug('🔄 Auto-syncing data...');
    
    // Processar fila de sincronização
    const result = await offlineQueueService.processQueue();
    
    if (result.success > 0) {
      logger.info(`✅ Auto-sync: ${result.success} itens sincronizados`);
    }
    
    if (result.failed > 0) {
      logger.warn(`⚠️ Auto-sync: ${result.failed} itens falharam`);
    }
  }

  /**
   * Status da fila de sincronização
   */
  getQueueStats() {
    return offlineQueueService.getQueueStats();
  }

  /**
   * Forçar sincronização manual
   */
  async forcSync(): Promise<{ success: number; failed: number }> {
    return offlineQueueService.processQueue();
  }
}

export const dataService = new DataService();