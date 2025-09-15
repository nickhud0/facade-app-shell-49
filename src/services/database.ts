import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';

export interface SyncQueueItem {
  id_local?: number;
  tipo_acao: string;
  dados: string; // JSON string
  status: 'pending' | 'synced' | 'failed';
  timestamp: string;
  tentativas?: number;
}

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

class DatabaseService {
  private sqlite: SQLiteConnection;
  private db: SQLiteDBConnection | null = null;
  private platform: string;

  constructor() {
    this.platform = Capacitor.getPlatform();
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
  }

  async initializeDatabase(): Promise<void> {
    try {
      // Para web, usar localStorage como fallback se SQLite falhar
      if (this.platform === 'web') {
        try {
          await this.sqlite.initWebStore();
          
          // Criar ou abrir banco
          this.db = await this.sqlite.createConnection(
            'reciclagem_pereque.db',
            false,
            'no-encryption',
            1,
            false
          );

          await this.db.open();
          await this.createTables();
          console.log('SQLite database initialized successfully');
        } catch (sqliteError) {
          console.warn('SQLite failed on web, using localStorage fallback:', sqliteError);
          // Configurar fallback para localStorage
          this.db = null;
        }
      } else {
        // Mobile - usar SQLite normalmente
        this.db = await this.sqlite.createConnection(
          'reciclagem_pereque.db',
          false,
          'no-encryption',
          1,
          false
        );

        await this.db.open();
        await this.createTables();
        console.log('Mobile SQLite database initialized successfully');
      }
    } catch (error) {
      console.error('Error initializing database:', error);
      // Não lançar erro para não travar o app
      this.db = null;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const statements = [
      // Fila de sincronização
      `CREATE TABLE IF NOT EXISTS sync_queue (
        id_local INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo_acao TEXT NOT NULL,
        dados TEXT NOT NULL,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'failed')),
        timestamp TEXT NOT NULL,
        tentativas INTEGER DEFAULT 0
      );`,

      // Cache de materiais
      `CREATE TABLE IF NOT EXISTS materiais_cache (
        id INTEGER PRIMARY KEY,
        nome TEXT NOT NULL,
        preco_compra_kg REAL NOT NULL,
        preco_venda_kg REAL NOT NULL,
        categoria TEXT,
        created_at TEXT,
        updated_at TEXT,
        synced_at TEXT DEFAULT CURRENT_TIMESTAMP
      );`,

      // Cache de transações
      `CREATE TABLE IF NOT EXISTS transacoes_cache (
        id INTEGER PRIMARY KEY,
        tipo TEXT NOT NULL CHECK (tipo IN ('compra', 'venda')),
        material_id INTEGER,
        peso REAL NOT NULL,
        valor_total REAL NOT NULL,
        observacoes TEXT,
        created_at TEXT,
        synced_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (material_id) REFERENCES materiais_cache (id)
      );`,

      // Cache de vales
      `CREATE TABLE IF NOT EXISTS vales_cache (
        id INTEGER PRIMARY KEY,
        valor REAL NOT NULL,
        descricao TEXT NOT NULL,
        status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado')),
        created_at TEXT,
        synced_at TEXT DEFAULT CURRENT_TIMESTAMP
      );`,

      // Cache de despesas
      `CREATE TABLE IF NOT EXISTS despesas_cache (
        id INTEGER PRIMARY KEY,
        descricao TEXT NOT NULL,
        valor REAL NOT NULL,
        categoria TEXT,
        created_at TEXT,
        synced_at TEXT DEFAULT CURRENT_TIMESTAMP
      );`,

      // Cache de pendências
      `CREATE TABLE IF NOT EXISTS pendencias_cache (
        id INTEGER PRIMARY KEY,
        descricao TEXT NOT NULL,
        valor REAL,
        status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'resolvida')),
        prioridade TEXT DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta')),
        created_at TEXT,
        synced_at TEXT DEFAULT CURRENT_TIMESTAMP
      );`,

      // Configurações do app
      `CREATE TABLE IF NOT EXISTS app_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );`,

      // Cache de comandas (últimas 20)
      `CREATE TABLE IF NOT EXISTS comandas_cache (
        id INTEGER PRIMARY KEY,
        numero TEXT NOT NULL UNIQUE,
        tipo TEXT NOT NULL CHECK (tipo IN ('compra', 'venda')),
        total REAL NOT NULL,
        status TEXT DEFAULT 'ativa' CHECK (status IN ('ativa', 'finalizada', 'cancelada')),
        cliente TEXT,
        dispositivo TEXT,
        observacoes TEXT,
        itens TEXT NOT NULL, -- JSON array dos itens
        created_at TEXT,
        updated_at TEXT,
        synced_at TEXT DEFAULT CURRENT_TIMESTAMP
      );`,

      // Metadados de sincronização
      `CREATE TABLE IF NOT EXISTS sync_metadata (
        table_name TEXT PRIMARY KEY,
        last_sync TEXT,
        sync_version INTEGER DEFAULT 1
      );`
    ];

    for (const statement of statements) {
      await this.db.execute(statement);
    }
  }

  // OPERAÇÕES DE FILA DE SINCRONIZAÇÃO
  async addToSyncQueue(tipoAcao: string, dados: any): Promise<void> {
    if (!this.db) {
      // Fallback para localStorage
      const queue = this.getLocalStorageQueue();
      const item: SyncQueueItem = {
        id_local: Date.now(),
        tipo_acao: tipoAcao,
        dados: JSON.stringify(dados),
        status: 'pending',
        timestamp: new Date().toISOString(),
        tentativas: 0
      };
      queue.push(item);
      localStorage.setItem('sync_queue', JSON.stringify(queue));
      return;
    }

    const query = `
      INSERT INTO sync_queue (tipo_acao, dados, timestamp, status, tentativas)
      VALUES (?, ?, ?, 'pending', 0)
    `;
    
    await this.db.run(query, [
      tipoAcao,
      JSON.stringify(dados),
      new Date().toISOString()
    ]);
  }

  async getPendingSyncItems(): Promise<SyncQueueItem[]> {
    if (!this.db) {
      // Fallback para localStorage
      const queue = this.getLocalStorageQueue();
      return queue.filter(item => item.status === 'pending');
    }

    const result = await this.db.query(`
      SELECT * FROM sync_queue 
      WHERE status = 'pending' 
      ORDER BY timestamp ASC
    `);

    return result.values || [];
  }

  async updateSyncItemStatus(
    id: number, 
    status: 'synced' | 'failed', 
    incrementTentativas = false
  ): Promise<void> {
    if (!this.db) {
      // Fallback para localStorage
      const queue = this.getLocalStorageQueue();
      const itemIndex = queue.findIndex(item => item.id_local === id);
      if (itemIndex >= 0) {
        queue[itemIndex].status = status;
        if (incrementTentativas) {
          queue[itemIndex].tentativas = (queue[itemIndex].tentativas || 0) + 1;
        }
        this.setLocalStorageQueue(queue);
      }
      return;
    }

    const tentativasClause = incrementTentativas ? ', tentativas = tentativas + 1' : '';
    
    await this.db.run(
      `UPDATE sync_queue SET status = ?${tentativasClause} WHERE id_local = ?`,
      [status, id]
    );
  }

  async clearSyncedItems(): Promise<void> {
    if (!this.db) {
      // Fallback para localStorage
      const queue = this.getLocalStorageQueue();
      const filteredQueue = queue.filter(item => item.status !== 'synced');
      this.setLocalStorageQueue(filteredQueue);
      return;
    }
    
    await this.db.run(`DELETE FROM sync_queue WHERE status = 'synced'`);
  }

  // OPERAÇÕES DE CACHE - MATERIAIS
  async cacheMateriais(materiais: Material[]): Promise<void> {
    if (!this.db) {
      // Fallback para localStorage
      localStorage.setItem('materiais_cache', JSON.stringify(materiais));
      return;
    }

    await this.db.run('DELETE FROM materiais_cache');
    
    for (const material of materiais) {
      await this.db.run(`
        INSERT INTO materiais_cache (id, nome, preco_compra_kg, preco_venda_kg, categoria, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        material.id,
        material.nome,
        material.preco_compra_kg,
        material.preco_venda_kg,
        material.categoria,
        material.created_at,
        material.updated_at
      ]);
    }
  }

  async addMaterialToCache(material: Omit<Material, 'id'>): Promise<number> {
    const now = new Date().toISOString();
    const materialWithDates = {
      ...material,
      created_at: material.created_at || now,
      updated_at: material.updated_at || now
    };

    if (!this.db) {
      // Fallback para localStorage
      const cached = localStorage.getItem('materiais_cache');
      const materiais = cached ? JSON.parse(cached) : [];
      const newId = Math.max(0, ...materiais.map((m: any) => m.id || 0)) + 1;
      const newMaterial = { ...materialWithDates, id: newId };
      materiais.push(newMaterial);
      localStorage.setItem('materiais_cache', JSON.stringify(materiais));
      return newId;
    }

    const result = await this.db.run(`
      INSERT INTO materiais_cache (nome, preco_compra_kg, preco_venda_kg, categoria, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      materialWithDates.nome,
      materialWithDates.preco_compra_kg,
      materialWithDates.preco_venda_kg,
      materialWithDates.categoria,
      materialWithDates.created_at,
      materialWithDates.updated_at
    ]);

    return result.changes?.lastId || Date.now();
  }

  async updateMaterialInCache(id: number, updates: Partial<Material>): Promise<void> {
    if (!this.db) {
      // Fallback para localStorage
      const cached = localStorage.getItem('materiais_cache');
      if (cached) {
        const materiais = JSON.parse(cached);
        const materialIndex = materiais.findIndex((m: Material) => m.id === id);
        if (materialIndex >= 0) {
          materiais[materialIndex] = { 
            ...materiais[materialIndex], 
            ...updates,
            updated_at: new Date().toISOString()
          };
          localStorage.setItem('materiais_cache', JSON.stringify(materiais));
        }
      }
      return;
    }

    const updateFields = Object.keys(updates)
      .filter(key => key !== 'id')
      .map(key => `${key} = ?`)
      .join(', ');

    if (updateFields) {
      const values = Object.entries(updates)
        .filter(([key]) => key !== 'id')
        .map(([, value]) => value);
      
      values.push(new Date().toISOString()); // updated_at
      values.push(id);

      await this.db.run(`
        UPDATE materiais_cache 
        SET ${updateFields}, updated_at = ?
        WHERE id = ?
      `, values);
    }
  }

  async getCachedMateriais(): Promise<Material[]> {
    if (!this.db) {
      // Fallback para localStorage
      const cached = localStorage.getItem('materiais_cache');
      if (cached) {
        return JSON.parse(cached);
      }
      return [];
    }

    const result = await this.db.query('SELECT * FROM materiais_cache ORDER BY nome');
    return result.values || [];
  }

  // OPERAÇÕES DE CACHE - TRANSAÇÕES
  async cacheTransacoes(transacoes: Transacao[]): Promise<void> {
    if (!this.db) {
      // Fallback para localStorage
      localStorage.setItem('transacoes_cache', JSON.stringify(transacoes));
      return;
    }

    await this.db.run('DELETE FROM transacoes_cache');
    
    for (const transacao of transacoes) {
      await this.db.run(`
        INSERT INTO transacoes_cache (id, tipo, material_id, peso, valor_total, observacoes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        transacao.id,
        transacao.tipo,
        transacao.material_id,
        transacao.peso,
        transacao.valor_total,
        transacao.observacoes,
        transacao.created_at
      ]);
    }
  }

  async getCachedTransacoes(limit = 50): Promise<Transacao[]> {
    if (!this.db) {
      // Fallback para localStorage
      const cached = localStorage.getItem('transacoes_cache');
      if (cached) {
        const transacoes = JSON.parse(cached);
        return transacoes.slice(0, limit);
      }
      return [];
    }

    const result = await this.db.query(`
      SELECT t.*, m.nome as material_nome 
      FROM transacoes_cache t
      LEFT JOIN materiais_cache m ON t.material_id = m.id
      ORDER BY t.created_at DESC 
      LIMIT ?
    `, [limit]);

    return result.values || [];
  }

  // OPERAÇÕES DE CACHE - VALES
  async cacheVales(vales: Vale[]): Promise<void> {
    if (!this.db) {
      // Fallback para localStorage
      localStorage.setItem('vales_cache', JSON.stringify(vales));
      return;
    }

    await this.db.run('DELETE FROM vales_cache');
    
    for (const vale of vales) {
      await this.db.run(`
        INSERT INTO vales_cache (id, valor, descricao, status, created_at)
        VALUES (?, ?, ?, ?, ?)
      `, [vale.id, vale.valor, vale.descricao, vale.status, vale.created_at]);
    }
  }

  async addValeToCache(vale: Vale): Promise<number> {
    const now = new Date().toISOString();
    const valeWithDates = {
      ...vale,
      created_at: vale.created_at || now
    };

    if (!this.db) {
      // Fallback para localStorage
      const cached = localStorage.getItem('vales_cache');
      const vales = cached ? JSON.parse(cached) : [];
      const newId = Math.max(0, ...vales.map((v: any) => v.id || 0)) + 1;
      const newVale = { ...valeWithDates, id: newId };
      vales.push(newVale);
      localStorage.setItem('vales_cache', JSON.stringify(vales));
      return newId;
    }

    const result = await this.db.run(`
      INSERT INTO vales_cache (valor, descricao, status, created_at)
      VALUES (?, ?, ?, ?)
    `, [
      valeWithDates.valor,
      valeWithDates.descricao,
      valeWithDates.status,
      valeWithDates.created_at
    ]);

    return result.changes?.lastId || Date.now();
  }

  async getCachedVales(): Promise<Vale[]> {
    if (!this.db) {
      // Fallback para localStorage
      const cached = localStorage.getItem('vales_cache');
      return cached ? JSON.parse(cached) : [];
    }

    const result = await this.db.query('SELECT * FROM vales_cache ORDER BY created_at DESC');
    return result.values || [];
  }

  // OPERAÇÕES DE CACHE - DESPESAS
  async cacheDespesas(despesas: Despesa[]): Promise<void> {
    if (!this.db) {
      // Fallback para localStorage
      localStorage.setItem('despesas_cache', JSON.stringify(despesas));
      return;
    }

    await this.db.run('DELETE FROM despesas_cache');
    
    for (const despesa of despesas) {
      await this.db.run(`
        INSERT INTO despesas_cache (id, descricao, valor, categoria, created_at)
        VALUES (?, ?, ?, ?, ?)
      `, [despesa.id, despesa.descricao, despesa.valor, despesa.categoria, despesa.created_at]);
    }
  }

  async getCachedDespesas(): Promise<Despesa[]> {
    if (!this.db) {
      // Fallback para localStorage
      const cached = localStorage.getItem('despesas_cache');
      return cached ? JSON.parse(cached) : [];
    }

    const result = await this.db.query('SELECT * FROM despesas_cache ORDER BY created_at DESC');
    return result.values || [];
  }

  async addDespesaToCache(despesa: Despesa): Promise<number> {
    const now = new Date().toISOString();
    const despesaWithDates = {
      ...despesa,
      created_at: despesa.created_at || now
    };

    if (!this.db) {
      // Fallback para localStorage
      const cached = localStorage.getItem('despesas_cache');
      const despesas = cached ? JSON.parse(cached) : [];
      const newId = Math.max(0, ...despesas.map((d: any) => d.id || 0)) + 1;
      const newDespesa = { ...despesaWithDates, id: newId };
      despesas.push(newDespesa);
      localStorage.setItem('despesas_cache', JSON.stringify(despesas));
      return newId;
    }

    const result = await this.db.run(`
      INSERT INTO despesas_cache (descricao, valor, categoria, created_at)
      VALUES (?, ?, ?, ?)
    `, [
      despesaWithDates.descricao,
      despesaWithDates.valor,
      despesaWithDates.categoria,
      despesaWithDates.created_at
    ]);

    return result.changes?.lastId || Date.now();
  }

  // OPERAÇÕES DE CACHE - PENDÊNCIAS
  async cachePendencias(pendencias: Pendencia[]): Promise<void> {
    if (!this.db) {
      // Fallback para localStorage
      localStorage.setItem('pendencias_cache', JSON.stringify(pendencias));
      return;
    }

    await this.db.run('DELETE FROM pendencias_cache');
    
    for (const pendencia of pendencias) {
      await this.db.run(`
        INSERT INTO pendencias_cache (id, descricao, valor, status, prioridade, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        pendencia.id,
        pendencia.descricao,
        pendencia.valor,
        pendencia.status,
        pendencia.prioridade,
        pendencia.created_at
      ]);
    }
  }

  async addPendenciaToCache(pendencia: Pendencia): Promise<number> {
    const now = new Date().toISOString();
    const pendenciaWithDates = {
      ...pendencia,
      created_at: pendencia.created_at || now
    };

    if (!this.db) {
      // Fallback para localStorage
      const cached = localStorage.getItem('pendencias_cache');
      const pendencias = cached ? JSON.parse(cached) : [];
      const newId = Math.max(0, ...pendencias.map((p: any) => p.id || 0)) + 1;
      const newPendencia = { ...pendenciaWithDates, id: newId };
      pendencias.push(newPendencia);
      localStorage.setItem('pendencias_cache', JSON.stringify(pendencias));
      return newId;
    }

    const result = await this.db.run(`
      INSERT INTO pendencias_cache (descricao, valor, status, prioridade, created_at)
      VALUES (?, ?, ?, ?, ?)
    `, [
      pendenciaWithDates.descricao,
      pendenciaWithDates.valor,
      pendenciaWithDates.status,
      pendenciaWithDates.prioridade,
      pendenciaWithDates.created_at
    ]);

    return result.changes?.lastId || Date.now();
  }

  async getCachedPendencias(): Promise<Pendencia[]> {
    if (!this.db) {
      // Fallback para localStorage
      const cached = localStorage.getItem('pendencias_cache');
      return cached ? JSON.parse(cached) : [];
    }

    const result = await this.db.query('SELECT * FROM pendencias_cache ORDER BY created_at DESC');
    return result.values || [];
  }

  // CONFIGURAÇÕES
  async setConfig(key: string, value: string): Promise<void> {
    if (!this.db) {
      // Fallback para localStorage
      localStorage.setItem(`config_${key}`, value);
      return;
    }

    await this.db.run(`
      INSERT OR REPLACE INTO app_config (key, value, updated_at)
      VALUES (?, ?, ?)
    `, [key, value, new Date().toISOString()]);
  }

  async getConfig(key: string): Promise<string | null> {
    if (!this.db) {
      // Fallback para localStorage
      return localStorage.getItem(`config_${key}`);
    }

    const result = await this.db.query('SELECT value FROM app_config WHERE key = ?', [key]);
    return result.values?.[0]?.value || null;
  }

  // OPERAÇÕES DE CACHE - COMANDAS (Últimas 20)
  async cacheComandas(comandas: Comanda[]): Promise<void> {
    if (!this.db) {
      // Fallback para localStorage - manter apenas últimas 20
      const comandasLimitadas = comandas.slice(-20);
      localStorage.setItem('comandas_cache', JSON.stringify(comandasLimitadas));
      return;
    }

    await this.db.run('DELETE FROM comandas_cache');
    
    // Inserir apenas as últimas 20 comandas
    const comandasLimitadas = comandas.slice(-20);
    for (const comanda of comandasLimitadas) {
      await this.db.run(`
        INSERT INTO comandas_cache (id, numero, tipo, total, status, cliente, dispositivo, observacoes, itens, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        comanda.id,
        comanda.numero,
        comanda.tipo,
        comanda.total,
        comanda.status,
        comanda.cliente,
        comanda.dispositivo,
        comanda.observacoes,
        JSON.stringify(comanda.itens),
        comanda.created_at,
        comanda.updated_at
      ]);
    }
  }

  async addComandaToCache(comanda: Comanda): Promise<void> {
    if (!this.db) {
      // Fallback para localStorage
      const cached = localStorage.getItem('comandas_cache');
      let comandas = cached ? JSON.parse(cached) : [];
      
      // Adicionar nova comanda
      comandas.push(comanda);
      
      // Manter apenas as últimas 20
      if (comandas.length > 20) {
        comandas = comandas.slice(-20);
      }
      
      localStorage.setItem('comandas_cache', JSON.stringify(comandas));
      return;
    }

    // Inserir nova comanda
    await this.db.run(`
      INSERT INTO comandas_cache (id, numero, tipo, total, status, cliente, dispositivo, observacoes, itens, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      comanda.id,
      comanda.numero,
      comanda.tipo,
      comanda.total,
      comanda.status,
      comanda.cliente,
      comanda.dispositivo,
      comanda.observacoes,
      JSON.stringify(comanda.itens),
      comanda.created_at,
      comanda.updated_at
    ]);

    // Manter apenas as últimas 20 comandas
    await this.db.run(`
      DELETE FROM comandas_cache 
      WHERE id NOT IN (
        SELECT id FROM comandas_cache 
        ORDER BY created_at DESC 
        LIMIT 20
      )
    `);
  }

  async getCachedComandas(limit?: number): Promise<Comanda[]> {
    if (!this.db) {
      // Fallback para localStorage
      const cached = localStorage.getItem('comandas_cache');
      if (cached) {
        const comandas = JSON.parse(cached);
        return limit ? comandas.slice(-limit) : comandas;
      }
      return [];
    }

    const limitClause = limit ? `LIMIT ${limit}` : '';
    const result = await this.db.query(`
      SELECT * FROM comandas_cache 
      ORDER BY created_at DESC 
      ${limitClause}
    `);

    return (result.values || []).map(row => ({
      ...row,
      itens: JSON.parse(row.itens)
    }));
  }

  async searchCachedComandas(searchTerm: string): Promise<Comanda[]> {
    if (!this.db) {
      // Fallback para localStorage
      const cached = localStorage.getItem('comandas_cache');
      if (cached) {
        const comandas = JSON.parse(cached);
        return comandas.filter((comanda: Comanda) => 
          comanda.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
          comanda.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          comanda.observacoes?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      return [];
    }

    const result = await this.db.query(`
      SELECT * FROM comandas_cache 
      WHERE numero LIKE ? OR cliente LIKE ? OR observacoes LIKE ?
      ORDER BY created_at DESC
    `, [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`]);

    return (result.values || []).map(row => ({
      ...row,
      itens: JSON.parse(row.itens)
    }));
  }

  async getComandaByNumero(numero: string): Promise<Comanda | null> {
    if (!this.db) {
      // Fallback para localStorage
      const cached = localStorage.getItem('comandas_cache');
      if (cached) {
        const comandas = JSON.parse(cached);
        return comandas.find((comanda: Comanda) => comanda.numero === numero) || null;
      }
      return null;
    }

    const result = await this.db.query(`
      SELECT * FROM comandas_cache WHERE numero = ?
    `, [numero]);

    if (result.values && result.values.length > 0) {
      const row = result.values[0];
      return {
        ...row,
        itens: JSON.parse(row.itens)
      };
    }

    return null;
  }

  // METADADOS DE SINCRONIZAÇÃO
  async updateSyncMetadata(tableName: string): Promise<void> {
    if (!this.db) {
      // Fallback para localStorage
      localStorage.setItem(`sync_metadata_${tableName}`, new Date().toISOString());
      return;
    }

    await this.db.run(`
      INSERT OR REPLACE INTO sync_metadata (table_name, last_sync, sync_version)
      VALUES (?, ?, 1)
    `, [tableName, new Date().toISOString()]);
  }

  async getLastSync(tableName: string): Promise<string | null> {
    if (!this.db) {
      // Fallback para localStorage
      return localStorage.getItem(`sync_metadata_${tableName}`);
    }

    const result = await this.db.query(
      'SELECT last_sync FROM sync_metadata WHERE table_name = ?',
      [tableName]
    );
    return result.values?.[0]?.last_sync || null;
  }

  async closeDatabase(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }

  // MÉTODOS DE FALLBACK PARA LOCALSTORAGE
  private getLocalStorageQueue(): SyncQueueItem[] {
    const stored = localStorage.getItem('sync_queue');
    return stored ? JSON.parse(stored) : [];
  }

  private setLocalStorageQueue(queue: SyncQueueItem[]): void {
    localStorage.setItem('sync_queue', JSON.stringify(queue));
  }
}

export const databaseService = new DatabaseService();