/**
 * Serviço exclusivo para operações no SQLite local
 * Responsabilidade: CRUD básico no banco local
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

class LocalDbService {
  private getStorageKey(table: string): string {
    return `${table}_cache`;
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  // =================== MATERIAIS ===================
  async getMateriais(): Promise<Material[]> {
    try {
      const stored = localStorage.getItem(this.getStorageKey('materiais'));
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading materiais:', error);
      return [];
    }
  }

  async saveMateriais(materiais: Material[]): Promise<void> {
    try {
      localStorage.setItem(this.getStorageKey('materiais'), JSON.stringify(materiais));
      localStorage.setItem('materiais_last_update', this.getTimestamp());
    } catch (error) {
      console.error('Error saving materiais:', error);
    }
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
    }
  }

  // =================== TRANSAÇÕES ===================
  async getTransacoes(limit = 50): Promise<Transacao[]> {
    try {
      const stored = localStorage.getItem(this.getStorageKey('transacoes'));
      const transacoes = stored ? JSON.parse(stored) : [];
      return transacoes.slice(0, limit);
    } catch (error) {
      console.error('Error loading transacoes:', error);
      return [];
    }
  }

  async saveTransacoes(transacoes: Transacao[]): Promise<void> {
    try {
      localStorage.setItem(this.getStorageKey('transacoes'), JSON.stringify(transacoes));
      localStorage.setItem('transacoes_last_update', this.getTimestamp());
    } catch (error) {
      console.error('Error saving transacoes:', error);
    }
  }

  async addTransacao(transacao: Omit<Transacao, 'id'>): Promise<number> {
    const transacoes = await this.getTransacoes(100);
    const newId = Date.now();
    const newTransacao = {
      ...transacao,
      id: newId,
      created_at: transacao.created_at || this.getTimestamp()
    };
    
    transacoes.unshift(newTransacao);
    await this.saveTransacoes(transacoes.slice(0, 50)); // Manter apenas últimas 50
    return newId;
  }

  // =================== VALES ===================
  async getVales(): Promise<Vale[]> {
    try {
      const stored = localStorage.getItem(this.getStorageKey('vales'));
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading vales:', error);
      return [];
    }
  }

  async saveVales(vales: Vale[]): Promise<void> {
    try {
      localStorage.setItem(this.getStorageKey('vales'), JSON.stringify(vales));
      localStorage.setItem('vales_last_update', this.getTimestamp());
    } catch (error) {
      console.error('Error saving vales:', error);
    }
  }

  async addVale(vale: Omit<Vale, 'id'>): Promise<number> {
    const vales = await this.getVales();
    const newId = Date.now();
    const newVale = {
      ...vale,
      id: newId,
      created_at: vale.created_at || this.getTimestamp()
    };
    
    vales.unshift(newVale);
    await this.saveVales(vales);
    return newId;
  }

  async updateVale(id: number, updates: Partial<Vale>): Promise<void> {
    const vales = await this.getVales();
    const index = vales.findIndex(v => v.id === id);
    
    if (index >= 0) {
      vales[index] = { ...vales[index], ...updates };
      await this.saveVales(vales);
    }
  }

  // =================== DESPESAS ===================
  async getDespesas(): Promise<Despesa[]> {
    try {
      const stored = localStorage.getItem(this.getStorageKey('despesas'));
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading despesas:', error);
      return [];
    }
  }

  async saveDespesas(despesas: Despesa[]): Promise<void> {
    try {
      localStorage.setItem(this.getStorageKey('despesas'), JSON.stringify(despesas));
      localStorage.setItem('despesas_last_update', this.getTimestamp());
    } catch (error) {
      console.error('Error saving despesas:', error);
    }
  }

  async addDespesa(despesa: Omit<Despesa, 'id'>): Promise<number> {
    const despesas = await this.getDespesas();
    const newId = Date.now();
    const newDespesa = {
      ...despesa,
      id: newId,
      created_at: despesa.created_at || this.getTimestamp()
    };
    
    despesas.unshift(newDespesa);
    await this.saveDespesas(despesas);
    return newId;
  }

  // =================== ESTOQUE ===================
  async getEstoque(): Promise<{ itens: EstoqueItem[]; resumo: { totalKg: number; totalTipos: number; valorTotal: number } }> {
    try {
      const stored = localStorage.getItem(this.getStorageKey('estoque'));
      if (stored) {
        const cached = JSON.parse(stored);
        return {
          itens: cached.itens || [],
          resumo: cached.resumo || { totalKg: 0, totalTipos: 0, valorTotal: 0 }
        };
      }
      return { itens: [], resumo: { totalKg: 0, totalTipos: 0, valorTotal: 0 } };
    } catch (error) {
      console.error('Error loading estoque:', error);
      return { itens: [], resumo: { totalKg: 0, totalTipos: 0, valorTotal: 0 } };
    }
  }

  async saveEstoque(itens: EstoqueItem[], resumo: { totalKg: number; totalTipos: number; valorTotal: number }): Promise<void> {
    try {
      localStorage.setItem(this.getStorageKey('estoque'), JSON.stringify({ itens, resumo }));
      localStorage.setItem('estoque_last_update', this.getTimestamp());
    } catch (error) {
      console.error('Error saving estoque:', error);
    }
  }

  // =================== RELATÓRIOS ===================
  async getFechamentoData(): Promise<{
    ultimoFechamento: string;
    receitas: number;
    compras: number;
    despesas: number;
    lucroAtual: number;
  }> {
    try {
      const stored = localStorage.getItem(this.getStorageKey('fechamento'));
      if (stored) {
        return JSON.parse(stored);
      }
      
      // Calcular automaticamente se não existir cache
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
      
      // Cache o resultado
      localStorage.setItem(this.getStorageKey('fechamento'), JSON.stringify(data));
      
      return data;
    } catch (error) {
      console.error('Error loading fechamento:', error);
      return {
        ultimoFechamento: new Date().toLocaleDateString('pt-BR'),
        receitas: 0,
        compras: 0,
        despesas: 0,
        lucroAtual: 0
      };
    }
  }

  // =================== UTILITÁRIOS ===================
  getLastUpdate(table: string): string | null {
    return localStorage.getItem(`${table}_last_update`);
  }

  async clearAll(): Promise<void> {
    const keys = ['materiais', 'transacoes', 'vales', 'despesas', 'estoque', 'fechamento'];
    keys.forEach(key => {
      localStorage.removeItem(this.getStorageKey(key));
      localStorage.removeItem(`${key}_last_update`);
    });
  }
}

export const localDbService = new LocalDbService();