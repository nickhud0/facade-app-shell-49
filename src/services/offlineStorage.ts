/**
 * SERVIÇO OFFLINE UNIFICADO
 * Responsável por: Cache localStorage + Fila de sincronização
 * Funciona 100% offline com sincronização automática quando online
 */

export interface Material {
  id?: number;
  nome: string;
  preco_compra_kg: number;
  preco_venda_kg: number;
  categoria?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Transacao {
  id?: number;
  tipo: 'compra' | 'venda';
  material_id: number;
  material_nome?: string;
  peso: number;
  valor_total: number;
  observacoes?: string;
  created_at?: string;
}

export interface Vale {
  id?: number;
  valor: number;
  descricao: string;
  status: 'pendente' | 'pago' | 'cancelado';
  created_at?: string;
}

export interface Despesa {
  id?: number;
  descricao: string;
  valor: number;
  categoria?: string;
  created_at?: string;
}

export interface Pendencia {
  id?: number;
  descricao: string;
  valor?: number;
  status: 'pendente' | 'resolvida';
  prioridade: 'baixa' | 'media' | 'alta';
  created_at?: string;
}

export interface ComandaItem {
  id: number;
  material: string;
  preco: number;
  quantidade: number;
  total: number;
}

export interface Comanda {
  id?: number;
  numero: string;
  prefixo_dispositivo?: string;
  numero_local?: number;
  tipo: 'compra' | 'venda';
  total: number;
  status: 'ativa' | 'finalizada' | 'cancelada';
  cliente?: string;
  dispositivo?: string;
  observacoes?: string;
  itens: ComandaItem[];
  created_at?: string;
  updated_at?: string;
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

export interface QueueItem {
  id: string;
  type: string;
  action: string;
  data: any;
  timestamp: string;
  tentativas: number;
  status: 'pending' | 'synced' | 'failed';
}

class OfflineStorageService {
  private getKey(table: string): string {
    return `offline_${table}`;
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private generateId(): number {
    return Date.now();
  }

  // =================== MATERIAIS ===================
  async getMateriais(): Promise<Material[]> {
    try {
      const stored = localStorage.getItem(this.getKey('materiais'));
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  async saveMateriais(materiais: Material[]): Promise<void> {
    localStorage.setItem(this.getKey('materiais'), JSON.stringify(materiais));
    localStorage.setItem('materiais_last_update', this.getTimestamp());
  }

  async addMaterial(material: Omit<Material, 'id'>): Promise<number> {
    const materiais = await this.getMateriais();
    const newId = Math.max(0, ...materiais.map(m => m.id || 0)) + 1;
    const newMaterial = {
      ...material,
      id: newId,
      created_at: material.created_at || this.getTimestamp(),
      updated_at: this.getTimestamp()
    };
    
    materiais.push(newMaterial);
    await this.saveMateriais(materiais);
    await this.addToQueue('material', 'create', newMaterial);
    return newId;
  }

  async updateMaterial(id: number, updates: Partial<Material>): Promise<void> {
    const materiais = await this.getMateriais();
    const index = materiais.findIndex(m => m.id === id);
    
    if (index >= 0) {
      materiais[index] = {
        ...materiais[index],
        ...updates,
        updated_at: this.getTimestamp()
      };
      await this.saveMateriais(materiais);
      await this.addToQueue('material', 'update', { id, ...updates });
    }
  }

  // =================== TRANSAÇÕES ===================
  async getTransacoes(limit = 50): Promise<Transacao[]> {
    try {
      const stored = localStorage.getItem(this.getKey('transacoes'));
      const transacoes = stored ? JSON.parse(stored) : [];
      return transacoes.slice(0, limit);
    } catch {
      return [];
    }
  }

  async saveTransacoes(transacoes: Transacao[]): Promise<void> {
    localStorage.setItem(this.getKey('transacoes'), JSON.stringify(transacoes));
    localStorage.setItem('transacoes_last_update', this.getTimestamp());
  }

  async addTransacao(transacao: Omit<Transacao, 'id'>): Promise<number> {
    const transacoes = await this.getTransacoes(100);
    const newId = this.generateId();
    const newTransacao = {
      ...transacao,
      id: newId,
      created_at: transacao.created_at || this.getTimestamp()
    };
    
    transacoes.unshift(newTransacao);
    await this.saveTransacoes(transacoes.slice(0, 50));
    await this.addToQueue('transacao', 'create', newTransacao);
    return newId;
  }

  // =================== VALES ===================
  async getVales(): Promise<Vale[]> {
    try {
      const stored = localStorage.getItem(this.getKey('vales'));
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  async saveVales(vales: Vale[]): Promise<void> {
    localStorage.setItem(this.getKey('vales'), JSON.stringify(vales));
    localStorage.setItem('vales_last_update', this.getTimestamp());
  }

  async addVale(vale: Omit<Vale, 'id'>): Promise<number> {
    const vales = await this.getVales();
    const newId = this.generateId();
    const newVale = {
      ...vale,
      id: newId,
      created_at: vale.created_at || this.getTimestamp()
    };
    
    vales.unshift(newVale);
    await this.saveVales(vales);
    await this.addToQueue('vale', 'create', newVale);
    return newId;
  }

  async updateVale(id: number, updates: Partial<Vale>): Promise<void> {
    const vales = await this.getVales();
    const index = vales.findIndex(v => v.id === id);
    
    if (index >= 0) {
      vales[index] = { ...vales[index], ...updates };
      await this.saveVales(vales);
      await this.addToQueue('vale', 'update', { id, ...updates });
    }
  }

  // =================== DESPESAS ===================
  async getDespesas(): Promise<Despesa[]> {
    try {
      const stored = localStorage.getItem(this.getKey('despesas'));
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  async saveDespesas(despesas: Despesa[]): Promise<void> {
    localStorage.setItem(this.getKey('despesas'), JSON.stringify(despesas));
    localStorage.setItem('despesas_last_update', this.getTimestamp());
  }

  async addDespesa(despesa: Omit<Despesa, 'id'>): Promise<number> {
    const despesas = await this.getDespesas();
    const newId = this.generateId();
    const newDespesa = {
      ...despesa,
      id: newId,
      created_at: despesa.created_at || this.getTimestamp()
    };
    
    despesas.unshift(newDespesa);
    await this.saveDespesas(despesas);
    await this.addToQueue('despesa', 'create', newDespesa);
    return newId;
  }

  // =================== PENDÊNCIAS ===================
  async getPendencias(): Promise<Pendencia[]> {
    try {
      const stored = localStorage.getItem(this.getKey('pendencias'));
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  async savePendencias(pendencias: Pendencia[]): Promise<void> {
    localStorage.setItem(this.getKey('pendencias'), JSON.stringify(pendencias));
    localStorage.setItem('pendencias_last_update', this.getTimestamp());
  }

  async addPendencia(pendencia: Omit<Pendencia, 'id'>): Promise<number> {
    const pendencias = await this.getPendencias();
    const newId = this.generateId();
    const newPendencia = {
      ...pendencia,
      id: newId,
      created_at: pendencia.created_at || this.getTimestamp()
    };
    
    pendencias.unshift(newPendencia);
    await this.savePendencias(pendencias);
    await this.addToQueue('pendencia', 'create', newPendencia);
    return newId;
  }

  async updatePendencia(id: number, updates: Partial<Pendencia>): Promise<void> {
    const pendencias = await this.getPendencias();
    const index = pendencias.findIndex(p => p.id === id);
    
    if (index >= 0) {
      pendencias[index] = { ...pendencias[index], ...updates };
      await this.savePendencias(pendencias);
      await this.addToQueue('pendencia', 'update', { id, ...updates });
    }
  }

  // =================== COMANDAS ===================
  async getComandas(): Promise<Comanda[]> {
    try {
      const stored = localStorage.getItem(this.getKey('comandas'));
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  async saveComandas(comandas: Comanda[]): Promise<void> {
    // Manter apenas últimas 20 comandas
    const limitedComandas = comandas.slice(0, 20);
    localStorage.setItem(this.getKey('comandas'), JSON.stringify(limitedComandas));
    localStorage.setItem('comandas_last_update', this.getTimestamp());
  }

  async addComanda(comanda: Omit<Comanda, 'id'>): Promise<number> {
    const comandas = await this.getComandas();
    const newId = this.generateId();
    const newComanda = {
      ...comanda,
      id: newId,
      created_at: comanda.created_at || this.getTimestamp(),
      updated_at: this.getTimestamp()
    };
    
    comandas.unshift(newComanda);
    await this.saveComandas(comandas);
    await this.addToQueue('comanda', 'create', newComanda);
    return newId;
  }

  async updateComanda(id: number, updates: Partial<Comanda>): Promise<void> {
    const comandas = await this.getComandas();
    const index = comandas.findIndex(c => c.id === id);
    
    if (index >= 0) {
      comandas[index] = {
        ...comandas[index],
        ...updates,
        updated_at: this.getTimestamp()
      };
      await this.saveComandas(comandas);
      await this.addToQueue('comanda', 'update', { id, ...updates });
    }
  }

  // =================== ESTOQUE ===================
  async getEstoque(): Promise<{ itens: EstoqueItem[]; resumo: { totalKg: number; totalTipos: number; valorTotal: number } }> {
    try {
      const stored = localStorage.getItem(this.getKey('estoque'));
      if (stored) {
        const cached = JSON.parse(stored);
        return {
          itens: cached.itens || [],
          resumo: cached.resumo || { totalKg: 0, totalTipos: 0, valorTotal: 0 }
        };
      }
      return { itens: [], resumo: { totalKg: 0, totalTipos: 0, valorTotal: 0 } };
    } catch {
      return { itens: [], resumo: { totalKg: 0, totalTipos: 0, valorTotal: 0 } };
    }
  }

  async saveEstoque(itens: EstoqueItem[], resumo: { totalKg: number; totalTipos: number; valorTotal: number }): Promise<void> {
    localStorage.setItem(this.getKey('estoque'), JSON.stringify({ itens, resumo }));
    localStorage.setItem('estoque_last_update', this.getTimestamp());
  }

  // =================== FILA DE SINCRONIZAÇÃO ===================
  async addToQueue(type: string, action: string, data: any): Promise<void> {
    const queue = await this.getQueue();
    const item: QueueItem = {
      id: crypto.randomUUID(),
      type,
      action,
      data,
      timestamp: this.getTimestamp(),
      tentativas: 0,
      status: 'pending'
    };
    
    queue.push(item);
    localStorage.setItem('sync_queue', JSON.stringify(queue));
  }

  async getQueue(): Promise<QueueItem[]> {
    try {
      const stored = localStorage.getItem('sync_queue');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  async updateQueueItem(id: string, updates: Partial<QueueItem>): Promise<void> {
    const queue = await this.getQueue();
    const index = queue.findIndex(item => item.id === id);
    
    if (index >= 0) {
      queue[index] = { ...queue[index], ...updates };
      localStorage.setItem('sync_queue', JSON.stringify(queue));
    }
  }

  async getPendingCount(): Promise<number> {
    const queue = await this.getQueue();
    return queue.filter(item => item.status === 'pending').length;
  }

  async clearSyncedItems(): Promise<void> {
    const queue = await this.getQueue();
    const filtered = queue.filter(item => item.status !== 'synced');
    localStorage.setItem('sync_queue', JSON.stringify(filtered));
  }

  // =================== UTILITÁRIOS ===================
  getLastUpdate(table: string): string | null {
    return localStorage.getItem(`${table}_last_update`);
  }

  async getFechamentoData(): Promise<{
    ultimoFechamento: string;
    receitas: number;
    compras: number;
    despesas: number;
    lucroAtual: number;
  }> {
    try {
      const stored = localStorage.getItem(this.getKey('fechamento'));
      if (stored) {
        return JSON.parse(stored);
      }
      
      // Calcular automaticamente
      const transacoes = await this.getTransacoes(100);
      const despesas = await this.getDespesas();
      const hoje = new Date().toDateString();
      
      const transacoesHoje = transacoes.filter(t => 
        new Date(t.created_at || '').toDateString() === hoje
      );
      
      const despesasHoje = despesas.filter(d =>
        new Date(d.created_at || '').toDateString() === hoje
      );
      
      const receitas = transacoesHoje
        .filter(t => t.tipo === 'venda')
        .reduce((acc, t) => acc + t.valor_total, 0);
      
      const compras = transacoesHoje
        .filter(t => t.tipo === 'compra')
        .reduce((acc, t) => acc + t.valor_total, 0);
      
      const despesasTotal = despesasHoje
        .reduce((acc, d) => acc + d.valor, 0);
      
      const data = {
        ultimoFechamento: new Date().toLocaleDateString('pt-BR'),
        receitas,
        compras,
        despesas: despesasTotal,
        lucroAtual: receitas - compras - despesasTotal
      };
      
      localStorage.setItem(this.getKey('fechamento'), JSON.stringify(data));
      return data;
    } catch {
      return {
        ultimoFechamento: new Date().toLocaleDateString('pt-BR'),
        receitas: 0,
        compras: 0,
        despesas: 0,
        lucroAtual: 0
      };
    }
  }

  async clearAll(): Promise<void> {
    const keys = ['materiais', 'transacoes', 'vales', 'despesas', 'pendencias', 'comandas', 'estoque', 'fechamento'];
    keys.forEach(key => {
      localStorage.removeItem(this.getKey(key));
      localStorage.removeItem(`${key}_last_update`);
    });
    localStorage.removeItem('sync_queue');
  }
}

export const offlineStorage = new OfflineStorageService();