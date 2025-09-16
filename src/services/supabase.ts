import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { databaseService, Material, Transacao, Vale, Despesa, Pendencia, Comanda } from './database';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

class SupabaseService {
  public client: SupabaseClient | null = null;
  private isConnected = false;

  async initialize(config: SupabaseConfig): Promise<boolean> {
    try {
      this.client = createClient(config.url, config.anonKey);
      
      // Teste de conexão - usando tabela material conforme o schema
      const { data, error } = await this.client.from('material').select('count').limit(1);
      
      if (error) {
        console.error('Failed to connect to Supabase:', error);
        this.isConnected = false;
        return false;
      }

      this.isConnected = true;
      console.log('Supabase connection established');
      return true;
    } catch (error) {
      console.error('Error initializing Supabase:', error);
      this.isConnected = false;
      return false;
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected && this.client !== null;
  }

  async testConnection(): Promise<boolean> {
    if (!this.client) return false;

    try {
      const { error } = await this.client.from('material').select('count').limit(1);
      this.isConnected = !error;
      return this.isConnected;
    } catch (error) {
      this.isConnected = false;
      return false;
    }
  }

  // SINCRONIZAÇÃO DE DADOS DO SUPABASE PARA CACHE LOCAL
  async syncAllData(): Promise<void> {
    if (!this.client || !this.isConnected) {
      throw new Error('Supabase not connected');
    }

    try {
      console.log('Starting full data sync...');

      // Sync materiais
      await this.syncMateriais();
      
      // Sync transações recentes (últimos 30 dias)
      await this.syncTransacoes();
      
      // Sync vales
      await this.syncVales();
      
      // Sync despesas
      await this.syncDespesas();
      
      // Sync pendências
      await this.syncPendencias();
      
      // Sync comandas (últimas 20)
      await this.syncComandas();

      console.log('Full data sync completed');
    } catch (error) {
      console.error('Error during full sync:', error);
      throw error;
    }
  }

  private async syncMateriais(): Promise<void> {
    if (!this.client) throw new Error('Supabase not connected');

    const { data, error } = await this.client
      .from('material')
      .select('*')
      .order('nome_material');

    if (error) throw error;

    await databaseService.cacheMateriais(data || []);
    await databaseService.updateSyncMetadata('materiais');
  }

  private async syncTransacoes(): Promise<void> {
    if (!this.client) throw new Error('Supabase not connected');

    // Buscar últimas transações dos últimos 30 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Como não temos tabela transacoes, vamos simular baseado nos itens/comandas
    // Para manter compatibilidade, vamos apenas manter o cache existente
    await databaseService.updateSyncMetadata('transacoes');
  }

  private async syncVales(): Promise<void> {
    if (!this.client) throw new Error('Supabase not connected');

    const { data, error } = await this.client
      .from('vale')
      .select('*')
      .order('data', { ascending: false });

    if (error) throw error;

    await databaseService.cacheVales(data || []);
    await databaseService.updateSyncMetadata('vales');
  }

  private async syncDespesas(): Promise<void> {
    if (!this.client) throw new Error('Supabase not connected');

    // Despesas são pendências do tipo 'eu devo'
    const { data, error } = await this.client
      .from('pendencia')
      .select('*')
      .eq('tipo', 'eu devo')
      .order('data', { ascending: false });

    if (error) throw error;

    // Converter pendências para formato de despesas
    const despesasFormatadas = (data || []).map(pendencia => ({
      id: pendencia.id,
      descricao: pendencia.descricao,
      valor: pendencia.valor,
      categoria: 'geral',
      created_at: pendencia.data
    }));

    await databaseService.cacheDespesas(despesasFormatadas);
    await databaseService.updateSyncMetadata('despesas');
  }

  private async syncPendencias(): Promise<void> {
    if (!this.client) throw new Error('Supabase not connected');

    const { data, error } = await this.client
      .from('pendencia')
      .select('*')
      .order('data', { ascending: false });

    if (error) throw error;

    await databaseService.cachePendencias(data || []);
    await databaseService.updateSyncMetadata('pendencias');
  }

  private async syncComandas(): Promise<void> {
    if (!this.client) throw new Error('Supabase not connected');

    const { data, error } = await this.client
      .from('comanda')
      .select('*')
      .order('data', { ascending: false })
      .limit(20);

    if (error) throw error;

    await databaseService.cacheComandas(data || []);
    await databaseService.updateSyncMetadata('comandas');
  }

  // ENVIO DE DADOS LOCAIS PARA SUPABASE
  async processSyncQueue(): Promise<{ success: number; failed: number }> {
    if (!this.client || !this.isConnected) {
      throw new Error('Supabase not connected');
    }

    const pendingItems = await databaseService.getPendingSyncItems();
    let successCount = 0;
    let failedCount = 0;

    for (const item of pendingItems) {
      try {
        const dados = JSON.parse(item.dados);
        let success = false;

        switch (item.tipo_acao) {
          case 'criar_material':
            success = await this.createMaterial(dados);
            break;
          case 'atualizar_material':
            success = await this.updateMaterial(dados.id, dados);
            break;
          case 'deletar_material':
            success = await this.deleteMaterial(dados.id);
            break;
          case 'criar_transacao':
            success = await this.createTransacao(dados);
            break;
          case 'criar_vale':
            success = await this.createVale(dados);
            break;
          case 'atualizar_vale':
            success = await this.updateVale(dados.id, dados);
            break;
          case 'criar_despesa':
            success = await this.createPendencia(dados);
            break;
          case 'atualizar_despesa':
            success = await this.updatePendencia(dados.id, dados);
            break;
          case 'finalizar_comanda':
            success = await this.finalizarComanda(dados);
            break;
          case 'criar_comanda':
            success = await this.createComanda(dados);
            break;
          case 'atualizar_comanda':
            success = await this.updateComanda(dados.id, dados);
            break;
          default:
            console.warn(`Unknown sync action: ${item.tipo_acao}`);
            continue;
        }

        if (success) {
          await databaseService.updateSyncItemStatus(item.id_local!, 'synced');
          successCount++;
        } else {
          await databaseService.updateSyncItemStatus(item.id_local!, 'failed', true);
          failedCount++;
        }
      } catch (error) {
        console.error(`Error processing sync item ${item.id_local}:`, error);
        await databaseService.updateSyncItemStatus(item.id_local!, 'failed', true);
        failedCount++;
      }
    }

    // Limpar itens sincronizados com sucesso
    if (successCount > 0) {
      await databaseService.clearSyncedItems();
    }

    return { success: successCount, failed: failedCount };
  }

  // OPERAÇÕES ESPECÍFICAS NO SUPABASE
  private async createMaterial(material: Omit<Material, 'id'>): Promise<boolean> {
    if (!this.client) return false;

    const { error } = await this.client
      .from('material')
      .insert([material]);

    return !error;
  }

  private async updateMaterial(id: number, material: Partial<Material>): Promise<boolean> {
    if (!this.client) return false;

    const { error } = await this.client
      .from('material')
      .update(material)
      .eq('id', id);

    return !error;
  }

  private async deleteMaterial(id: number): Promise<boolean> {
    if (!this.client) return false;

    const { error } = await this.client
      .from('material')
      .delete()
      .eq('id', id);

    return !error;
  }

  private async createTransacao(transacao: Omit<Transacao, 'id'>): Promise<boolean> {
    if (!this.client) return false;

    const { error } = await this.client
      .from('transacoes')
      .insert([transacao]);

    return !error;
  }

  private async createVale(vale: Omit<Vale, 'id'>): Promise<boolean> {
    if (!this.client) return false;

    const { error } = await this.client
      .from('vale')
      .insert([vale]);

    return !error;
  }

  private async updateVale(id: number, vale: Partial<Vale>): Promise<boolean> {
    if (!this.client) return false;

    const { error } = await this.client
      .from('vale')
      .update(vale)
      .eq('id', id);

    return !error;
  }

  private async createDespesa(despesa: Omit<Despesa, 'id'>): Promise<boolean> {
    if (!this.client) return false;

    // Despesas são criadas como pendências do tipo 'eu devo'
    const { error } = await this.client
      .from('pendencia')
      .insert([{
        descricao: despesa.descricao,
        valor: despesa.valor,
        tipo: 'eu devo',
        status: 'pendente',
        data: despesa.created_at || new Date().toISOString()
      }]);

    return !error;
  }

  private async createPendencia(pendencia: Omit<Pendencia, 'id'>): Promise<boolean> {
    if (!this.client) return false;

    const { error } = await this.client
      .from('pendencia')
      .insert([pendencia]);

    return !error;
  }

  private async updatePendencia(id: number, pendencia: Partial<Pendencia>): Promise<boolean> {
    if (!this.client) return false;

    const { error } = await this.client
      .from('pendencia')
      .update(pendencia)
      .eq('id', id);

    return !error;
  }

  private async createComanda(comanda: Omit<Comanda, 'id'>): Promise<boolean> {
    if (!this.client) return false;

    const { error } = await this.client
      .from('comanda')
      .insert([{
        ...comanda,
        itens: JSON.stringify(comanda.itens)
      }]);

    return !error;
  }

  private async updateComanda(id: number, comanda: Partial<Comanda>): Promise<boolean> {
    if (!this.client) return false;

    const updateData = {
      ...comanda,
      itens: comanda.itens ? JSON.stringify(comanda.itens) : undefined
    };

    const { error } = await this.client
      .from('comanda')
      .update(updateData)
      .eq('id', id);

    return !error;
  }

  // Finalizar comanda (criar comanda e seus itens)
  private async finalizarComanda(dados: any): Promise<boolean> {
    if (!this.client) return false;

    try {
      const { comanda, itens } = dados;
      
      // Primeiro inserir a comanda
      const { data: comandaData, error: comandaError } = await this.client
        .from('comanda')
        .insert([{
          numero: comanda.numero,
          tipo: comanda.tipo,
          total: comanda.total,
          status: comanda.status,
          cliente: comanda.cliente,
          dispositivo_update: comanda.dispositivo,
          observacoes: comanda.observacoes,
          data: comanda.created_at || new Date().toISOString()
        }])
        .select()
        .single();

      if (comandaError) {
        console.error('Error creating comanda:', comandaError);
        return false;
      }

      // Depois inserir os itens da comanda
      if (itens && itens.length > 0 && comandaData) {
        const itensFormatados = itens.map((item: any) => ({
          comanda_fk: comandaData.id,
          material_fk: item.material_id || 1, // Buscar ID real do material
          total_kg: item.quantidade,
          total_item: item.total
        }));

        const { error: itensError } = await this.client
          .from('item')
          .insert(itensFormatados);

        if (itensError) {
          console.error('Error creating items:', itensError);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error in finalizarComanda:', error);
      return false;
    }
  }

  // Métodos públicos para a fila offline
  async syncComanda(dados: any): Promise<boolean> {
    return this.createComanda(dados);
  }

  async syncComandaUpdate(dados: any): Promise<boolean> {
    return this.updateComanda(dados.id, dados);
  }

  async syncMaterial(dados: any): Promise<boolean> {
    return this.createMaterial(dados);
  }

  async syncMaterialUpdate(dados: any): Promise<boolean> {
    return this.updateMaterial(dados.id, dados);
  }

  async syncVale(dados: any): Promise<boolean> {
    return this.createVale(dados);
  }

  async syncDespesa(dados: any): Promise<boolean> {
    return this.createDespesa(dados);
  }

  async syncPendencia(dados: any): Promise<boolean> {
    return this.createPendencia(dados);
  }

  async syncPendenciaUpdate(dados: any): Promise<boolean> {
    return this.updatePendencia(dados.id, dados);
  }

  // BUSCA NO HISTÓRICO COMPLETO (somente quando online)
  async searchComandas(searchTerm: string, limit = 50): Promise<Comanda[]> {
    if (!this.client || !this.isConnected) {
      return [];
    }

    const { data, error } = await this.client
      .from('comanda')
      .select('*')
      .or(`numero.ilike.%${searchTerm}%,cliente.ilike.%${searchTerm}%,observacoes.ilike.%${searchTerm}%`)
      .order('data', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error searching comandas:', error);
      return [];
    }

    return (data || []).map(row => ({
      ...row,
      itens: typeof row.itens === 'string' ? JSON.parse(row.itens) : row.itens
    }));
  }

  async getComandaById(id: number): Promise<Comanda | null> {
    if (!this.client || !this.isConnected) {
      return null;
    }

    const { data, error } = await this.client
      .from('comanda')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching comanda:', error);
      return null;
    }

    return {
      ...data,
      itens: typeof data.itens === 'string' ? JSON.parse(data.itens) : data.itens
    };
  }

  // BUSCAR ESTOQUE ATUAL DA VIEW estoque_atual
  async buscarEstoqueAtual(): Promise<any[]> {
    try {
      // Se offline, usar cache
      if (!this.client || !this.isConnected) {
        const cache = localStorage.getItem('estoqueAtualCache');
        return cache ? JSON.parse(cache) : [];
      }

      const { data, error } = await this.client
        .from('estoque_atual')
        .select('*')
        .order('material_nome', { ascending: true });

      if (error) throw error;

      // Salva no cache offline
      const result = data || [];
      localStorage.setItem('estoqueAtualCache', JSON.stringify(result));
      
      return result;
    } catch (error) {
      console.error('Erro ao buscar estoque atual:', error);
      
      // Fallback para cache offline
      const cache = localStorage.getItem('estoqueAtualCache');
      return cache ? JSON.parse(cache) : [];
    }
  }

  // BUSCAR SOBRAS DA VIEW relatorio_vendas_excedentes
  async buscarSobras(periodo: 'diario' | 'mensal' | 'anual' | 'personalizado', dataInicio?: Date, dataFim?: Date): Promise<any[]> {
    try {
      // Se offline, usar cache
      if (!this.client || !this.isConnected) {
        const cache = localStorage.getItem('sobrasCache');
        return cache ? JSON.parse(cache) : [];
      }

      let query = this.client.from('relatorio_vendas_excedentes').select('*');

      // Aplica filtros de período
      switch (periodo) {
        case 'diario':
          query = query.gte('data', new Date().toISOString().split('T')[0]);
          break;
        case 'mensal':
          const inicioMes = new Date();
          inicioMes.setDate(1);
          query = query.gte('data', inicioMes.toISOString().split('T')[0]);
          break;
        case 'anual':
          const inicioAno = new Date();
          inicioAno.setMonth(0, 1);
          query = query.gte('data', inicioAno.toISOString().split('T')[0]);
          break;
        case 'personalizado':
          if (dataInicio && dataFim) {
            query = query
              .gte('data', dataInicio.toISOString().split('T')[0])
              .lte('data', dataFim.toISOString().split('T')[0]);
          }
          break;
      }

      // Ordenar por data mais recente primeira
      query = query.order('data', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      // Salva no cache offline
      const result = data || [];
      localStorage.setItem('sobrasCache', JSON.stringify(result));
      
      return result;
    } catch (error) {
      console.error('Erro ao buscar sobras:', error);
      
      // Fallback para cache offline
      const cache = localStorage.getItem('sobrasCache');
      return cache ? JSON.parse(cache) : [];
    }
  }
}

// Função standalone para buscar sobras
export async function buscarSobras(periodo: string, dataInicio?: string, dataFim?: string) {
  try {
    // Se offline, usar cache
    if (!supabaseService.client || !supabaseService.getConnectionStatus()) {
      const cache = localStorage.getItem("sobrasCache");
      return cache ? JSON.parse(cache) : [];
    }

    let query = supabaseService.client.from("relatorio_vendas_excedentes").select("*");

    // Aplica filtros de período
    if (periodo === "mensal") {
      const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      query = query.gte("data", inicioMes);
    } else if (periodo === "anual") {
      const inicioAno = new Date(new Date().getFullYear(), 0, 1).toISOString();
      query = query.gte("data", inicioAno);
    } else if (periodo === "personalizado" && dataInicio && dataFim) {
      query = query.gte("data", dataInicio).lte("data", dataFim);
    }

    // Ordenar por data mais recente primeiro
    query = query.order("data", { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    // Salvar no cache offline
    localStorage.setItem("sobrasCache", JSON.stringify(data || []));
    return data || [];
  } catch (e) {
    console.error("Erro ao buscar sobras:", e);
    // Fallback para cache offline
    const cache = localStorage.getItem("sobrasCache");
    return cache ? JSON.parse(cache) : [];
  }
}

export const supabaseService = new SupabaseService();