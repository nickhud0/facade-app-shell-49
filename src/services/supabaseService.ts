/**
 * Serviço exclusivo para consultas e inserts no Supabase
 * Responsabilidade: Comunicação com o backend remoto
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';
import { Material, Transacao, Vale, Despesa, EstoqueItem } from './localDbService';

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
      
      // Teste de conexão
      const { error } = await this.client.from('material').select('count').limit(1);
      
      if (error) {
        console.error('Failed to connect to Supabase:', error);
        this.isConnected = false;
        return false;
      }

      this.isConnected = true;
      logger.debug('Supabase connection established');
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

  // =================== CONSULTAS ===================

  async getMateriais(): Promise<Material[]> {
    if (!this.client) throw new Error('Supabase not connected');

    const { data, error } = await this.client
      .from('material')
      .select('*')
      .order('nome');

    if (error) throw error;

    return (data || []).map(item => ({
      id: item.id,
      nome: item.nome,
      preco_compra_kg: item.preco_compra_kg || 0,
      preco_venda_kg: item.preco_venda_kg || 0,
      categoria: item.categoria,
      created_at: item.created_at,
      updated_at: item.updated_at
    }));
  }

  async getTransacoes(limit = 50): Promise<Transacao[]> {
    if (!this.client) throw new Error('Supabase not connected');

    // Buscar dos itens das comandas
    const { data, error } = await this.client
      .from('item')
      .select(`
        *,
        comanda!inner(tipo, data),
        material(nome)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(item => ({
      id: item.id,
      tipo: item.comanda.tipo as 'compra' | 'venda',
      material_id: item.material_fk,
      material_nome: item.material?.nome,
      peso: item.total_kg || 0,
      valor_total: item.total_item || 0,
      observacoes: item.observacoes,
      created_at: item.comanda.data
    }));
  }

  async getVales(): Promise<Vale[]> {
    if (!this.client) throw new Error('Supabase not connected');

    const { data, error } = await this.client
      .from('vale')
      .select('*')
      .order('data', { ascending: false });

    if (error) throw error;

    return (data || []).map(vale => ({
      id: vale.id,
      valor: vale.valor || 0,
      descricao: vale.cliente_nome || vale.numero || 'Vale',
      status: vale.status === 'quitado' ? 'pago' : 'pendente',
      created_at: vale.data
    }));
  }

  async getDespesas(): Promise<Despesa[]> {
    if (!this.client) throw new Error('Supabase not connected');

    const { data, error } = await this.client
      .from('pendencia')
      .select('*')
      .eq('tipo', 'eu devo')
      .order('data', { ascending: false });

    if (error) throw error;

    return (data || []).map(item => ({
      id: item.id,
      descricao: item.descricao,
      valor: item.valor || 0,
      categoria: item.categoria,
      created_at: item.data
    }));
  }

  async getEstoque(): Promise<{ itens: EstoqueItem[]; resumo: { totalKg: number; totalTipos: number; valorTotal: number } }> {
    if (!this.client) throw new Error('Supabase not connected');

    try {
      // Tentar usar view se existir
      const { data: viewData, error: viewError } = await this.client
        .from('vw_estoque')
        .select('*');

      if (!viewError && viewData) {
        const itens = viewData.map((item: any) => ({
          material_id: item.material_id,
          material_nome: item.material_nome,
          categoria: item.categoria,
          kg_comprado: item.kg_comprado || 0,
          kg_vendido: item.kg_vendido || 0,
          kg_disponivel: item.kg_disponivel || 0,
          valor_medio_compra: item.valor_medio_compra || 0,
          valor_total_estoque: item.valor_total_estoque || 0
        }));

        const resumo = {
          totalKg: itens.reduce((acc, item) => acc + item.kg_disponivel, 0),
          totalTipos: itens.length,
          valorTotal: itens.reduce((acc, item) => acc + item.valor_total_estoque, 0)
        };

        return { itens, resumo };
      }
    } catch (error) {
      logger.debug('View vw_estoque not available, calculating manually');
    }

    // Fallback: calcular manualmente
    return await this.calcularEstoqueManual();
  }

  private async calcularEstoqueManual(): Promise<{ itens: EstoqueItem[]; resumo: { totalKg: number; totalTipos: number; valorTotal: number } }> {
    if (!this.client) throw new Error('Supabase not connected');

    // Buscar materiais
    const { data: materiais } = await this.client
      .from('material')
      .select('*');

    // Buscar transações (itens)
    const { data: itens } = await this.client
      .from('item')
      .select(`
        *,
        comanda!inner(tipo)
      `);

    const estoque: EstoqueItem[] = [];

    for (const material of materiais || []) {
      const itensDoMaterial = (itens || []).filter(item => item.material_fk === material.id);

      const compras = itensDoMaterial.filter(item => item.comanda.tipo === 'compra');
      const vendas = itensDoMaterial.filter(item => item.comanda.tipo === 'venda');

      const kgComprado = compras.reduce((acc, item) => acc + (item.total_kg || 0), 0);
      const kgVendido = vendas.reduce((acc, item) => acc + (item.total_kg || 0), 0);
      const kgDisponivel = Math.max(0, kgComprado - kgVendido);

      const valorTotalCompras = compras.reduce((acc, item) => acc + (item.total_item || 0), 0);
      const valorMedioCompra = kgComprado > 0 ? valorTotalCompras / kgComprado : material.preco_compra_kg;

      if (kgDisponivel > 0) {
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
    }

    const resumo = {
      totalKg: estoque.reduce((acc, item) => acc + item.kg_disponivel, 0),
      totalTipos: estoque.length,
      valorTotal: estoque.reduce((acc, item) => acc + item.valor_total_estoque, 0)
    };

    return { itens: estoque, resumo };
  }

  // =================== INSERTS ===================

  async createMaterial(material: Omit<Material, 'id'>): Promise<boolean> {
    if (!this.client) return false;

    const { error } = await this.client
      .from('material')
      .insert([{
        nome: material.nome,
        preco_compra_kg: material.preco_compra_kg,
        preco_venda_kg: material.preco_venda_kg,
        categoria: material.categoria,
        unidade: 'kg',
        ativo: true
      }]);

    return !error;
  }

  async updateMaterial(id: number, material: Partial<Material>): Promise<boolean> {
    if (!this.client) return false;

    const { error } = await this.client
      .from('material')
      .update({
        nome: material.nome,
        preco_compra_kg: material.preco_compra_kg,
        preco_venda_kg: material.preco_venda_kg,
        categoria: material.categoria
      })
      .eq('id', id);

    return !error;
  }

  async createComanda(dados: any): Promise<boolean> {
    if (!this.client) return false;

    try {
      // Criar comanda
      const { data: comandaData, error: comandaError } = await this.client
        .from('comanda')
        .insert([{
          numero: dados.numero,
          tipo: dados.tipo,
          total: dados.total,
          status: 'finalizada',
          cliente: dados.cliente,
          dispositivo: dados.dispositivo,
          observacoes: dados.observacoes,
          data: dados.created_at || new Date().toISOString().split('T')[0]
        }])
        .select()
        .single();

      if (comandaError) return false;

      // Criar itens se existirem
      if (dados.itens && Array.isArray(dados.itens) && comandaData) {
        const itensFormatados = dados.itens.map((item: any) => ({
          comanda_fk: comandaData.id,
          material_fk: item.material_id || 1,
          total_kg: item.quantidade || item.peso,
          total_item: item.total || item.valor_total
        }));

        const { error: itensError } = await this.client
          .from('item')
          .insert(itensFormatados);

        return !itensError;
      }

      return true;
    } catch (error) {
      logger.error('Error creating comanda:', error);
      return false;
    }
  }

  async createVale(vale: Omit<Vale, 'id'>): Promise<boolean> {
    if (!this.client) return false;

    const { error } = await this.client
      .from('vale')
      .insert([{
        numero: `V${Date.now()}`,
        cliente_nome: vale.descricao,
        valor: vale.valor,
        data: vale.created_at || new Date().toISOString().split('T')[0],
        status: 'aberto',
        observacoes: ''
      }]);

    return !error;
  }

  async updateVale(id: number, updates: Partial<Vale>): Promise<boolean> {
    if (!this.client) return false;

    const { error } = await this.client
      .from('vale')
      .update({
        status: updates.status === 'pago' ? 'quitado' : 'aberto'
      })
      .eq('id', id);

    return !error;
  }

  async createDespesa(despesa: Omit<Despesa, 'id'>): Promise<boolean> {
    if (!this.client) return false;

    const { error } = await this.client
      .from('pendencia')
      .insert([{
        tipo: 'eu devo',
        descricao: despesa.descricao,
        valor: despesa.valor,
        data: despesa.created_at || new Date().toISOString().split('T')[0],
        pessoa: 'Sistema',
        status: 'pendente'
      }]);

    return !error;
  }

  /**
   * RELATÓRIOS (sempre via views)
   */
  async getRelatorios(dataInicio?: string, dataFim?: string): Promise<any[]> {
    if (!this.client) throw new Error('Supabase not connected');

    try {
      // Simular dados de relatório por enquanto
      return [];
    } catch (error) {
      logger.error('Error fetching reports:', error);
      return [];
    }
  }
}

export const supabaseService = new SupabaseService();