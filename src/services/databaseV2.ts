import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';
import { logger } from '@/utils/logger';

// Interfaces melhoradas com versionamento
export interface SyncQueueItem {
  id: number;
  tipo_acao: string;
  dados: string;
  tentativas: number;
  status: 'pending' | 'synced' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface Material {
  id: number;
  nome: string;
  preco_compra: number;
  preco_venda: number;
  categoria: string;
  unidade: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface ComandaItem {
  id: number;
  comanda_id: number;
  material_id: number;
  material_nome: string;
  preco: number;
  quantidade: number;
  total: number;
  created_at: string;
  updated_at: string;
}

export interface Comanda {
  id: number;
  numero: string;
  prefixo_dispositivo: string;
  numero_local: number;
  tipo: 'compra' | 'venda';
  total: number;
  status: 'aberta' | 'finalizada' | 'cancelada';
  cliente?: string;
  dispositivo?: string;
  observacoes?: string;
  itens?: ComandaItem[];
  created_at: string;
  updated_at: string;
  version: number;
}

export interface SyncMetadata {
  table_name: string;
  last_sync: string;
  last_version: number;
}

class DatabaseV2Service {
  private sqlite: SQLiteConnection;
  private db: SQLiteDBConnection | null = null;
  private dbName = 'reciclagem_pereque_v2.db';

  constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
  }

  async initializeDatabase(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      console.warn('SQLite not available on web platform, using localStorage fallback');
      return;
    }

    try {
      const ret = await this.sqlite.checkConnectionsConsistency();
      const isConn = (await this.sqlite.isConnection(this.dbName, false)).result;

      if (ret.result && isConn) {
        this.db = await this.sqlite.retrieveConnection(this.dbName, false);
      } else {
        this.db = await this.sqlite.createConnection(
          this.dbName,
          false,
          'no-encryption',
          1,
          false
        );
      }

      await this.db.open();
      await this.createTables();
      
      logger.debug('Database V2 initialized successfully');
    } catch (error) {
      console.error('Error initializing database V2:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) return;

    const tables = [
      // Fila de sincronização melhorada
      `CREATE TABLE IF NOT EXISTS sync_queue_v2 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo_acao TEXT NOT NULL,
        dados TEXT NOT NULL,
        tentativas INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'failed')),
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );`,

      // Metadados de sincronização
      `CREATE TABLE IF NOT EXISTS sync_metadata (
        table_name TEXT PRIMARY KEY,
        last_sync TEXT NOT NULL,
        last_version INTEGER DEFAULT 0
      );`,

      // Comandas normalizadas
      `CREATE TABLE IF NOT EXISTS comandas_v2 (
        id INTEGER PRIMARY KEY,
        numero TEXT NOT NULL UNIQUE,
        prefixo_dispositivo TEXT NOT NULL,
        numero_local INTEGER NOT NULL,
        tipo TEXT NOT NULL CHECK (tipo IN ('compra', 'venda')),
        total REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'finalizada', 'cancelada')),
        cliente TEXT,
        dispositivo TEXT,
        observacoes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        version INTEGER DEFAULT 1,
        UNIQUE(prefixo_dispositivo, numero_local)
      );`,

      // Itens de comandas
      `CREATE TABLE IF NOT EXISTS comanda_itens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        comanda_id INTEGER NOT NULL,
        material_id INTEGER NOT NULL,
        material_nome TEXT NOT NULL,
        preco REAL NOT NULL,
        quantidade REAL NOT NULL,
        total REAL NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (comanda_id) REFERENCES comandas_v2(id) ON DELETE CASCADE
      );`,

      // Materiais com versionamento
      `CREATE TABLE IF NOT EXISTS materiais_v2 (
        id INTEGER PRIMARY KEY,
        nome TEXT NOT NULL,
        preco_compra REAL NOT NULL,
        preco_venda REAL NOT NULL,
        categoria TEXT,
        unidade TEXT DEFAULT 'kg',
        ativo BOOLEAN DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        version INTEGER DEFAULT 1
      );`,

      // Índices para performance
      `CREATE INDEX IF NOT EXISTS idx_comandas_numero ON comandas_v2(numero);`,
      `CREATE INDEX IF NOT EXISTS idx_comandas_prefixo_local ON comandas_v2(prefixo_dispositivo, numero_local);`,
      `CREATE INDEX IF NOT EXISTS idx_comandas_status ON comandas_v2(status);`,
      `CREATE INDEX IF NOT EXISTS idx_comandas_tipo ON comandas_v2(tipo);`,
      `CREATE INDEX IF NOT EXISTS idx_comandas_created_at ON comandas_v2(created_at);`,
      `CREATE INDEX IF NOT EXISTS idx_comanda_itens_comanda_id ON comanda_itens(comanda_id);`,
      `CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue_v2(status);`,
    ];

    for (const table of tables) {
      await this.db.run(table);
    }
  }

  // Comandas com itens normalizados
  async saveComanda(comanda: Omit<Comanda, 'version'>, itens: Omit<ComandaItem, 'id' | 'comanda_id' | 'created_at' | 'updated_at'>[]): Promise<number> {
    if (!this.db) {
      // Fallback para localStorage (simplificado)
      const comandaWithItens = { ...comanda, itens, version: 1 };
      const cached = localStorage.getItem('comandas_v2_cache') || '[]';
      const comandas = JSON.parse(cached);
      comandas.push(comandaWithItens);
      localStorage.setItem('comandas_v2_cache', JSON.stringify(comandas.slice(-20)));
      return comanda.id;
    }

    const now = new Date().toISOString();
    
    // Inserir comanda
    await this.db.run(`
      INSERT OR REPLACE INTO comandas_v2 
      (id, numero, prefixo_dispositivo, numero_local, tipo, total, status, cliente, dispositivo, observacoes, created_at, updated_at, version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      comanda.id,
      comanda.numero,
      comanda.prefixo_dispositivo,
      comanda.numero_local,
      comanda.tipo,
      comanda.total,
      comanda.status,
      comanda.cliente || null,
      comanda.dispositivo || null,
      comanda.observacoes || null,
      comanda.created_at,
      now,
      1
    ]);

    // Remover itens existentes
    await this.db.run('DELETE FROM comanda_itens WHERE comanda_id = ?', [comanda.id]);

    // Inserir novos itens
    for (const item of itens) {
      await this.db.run(`
        INSERT INTO comanda_itens 
        (comanda_id, material_id, material_nome, preco, quantidade, total, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        comanda.id,
        item.material_id,
        item.material_nome,
        item.preco,
        item.quantidade,
        item.total,
        now,
        now
      ]);
    }

    return comanda.id;
  }

  async getComandaWithItens(comandaId: number): Promise<Comanda | null> {
    if (!this.db) {
      const cached = localStorage.getItem('comandas_v2_cache') || '[]';
      const comandas = JSON.parse(cached);
      return comandas.find((c: Comanda) => c.id === comandaId) || null;
    }

    // Buscar comanda
    const comandaResult = await this.db.query('SELECT * FROM comandas_v2 WHERE id = ?', [comandaId]);
    
    if (!comandaResult.values || comandaResult.values.length === 0) {
      return null;
    }

    const comanda = comandaResult.values[0] as Comanda;

    // Buscar itens
    const itensResult = await this.db.query('SELECT * FROM comanda_itens WHERE comanda_id = ?', [comandaId]);
    
    comanda.itens = (itensResult.values || []) as ComandaItem[];

    return comanda;
  }

  async getComandasRecentes(limit = 20): Promise<Comanda[]> {
    if (!this.db) {
      const cached = localStorage.getItem('comandas_v2_cache') || '[]';
      return JSON.parse(cached).slice(-limit);
    }

    const result = await this.db.query(`
      SELECT * FROM comandas_v2 
      ORDER BY created_at DESC 
      LIMIT ?
    `, [limit]);

    const comandas = (result.values || []) as Comanda[];

    // Carregar itens para cada comanda
    for (const comanda of comandas) {
      const itensResult = await this.db.query('SELECT * FROM comanda_itens WHERE comanda_id = ?', [comanda.id]);
      comanda.itens = (itensResult.values || []) as ComandaItem[];
    }

    return comandas;
  }

  // Método para obter o próximo número local para um prefixo
  async getProximoNumeroLocal(prefixo: string): Promise<number> {
    if (!this.db) {
      // Fallback para localStorage
      const cached = localStorage.getItem('comandas_v2_cache') || '[]';
      const comandas = JSON.parse(cached);
      const comandasComPrefixo = comandas.filter((c: Comanda) => c.prefixo_dispositivo === prefixo);
      const maiorNumero = comandasComPrefixo.reduce((max: number, c: Comanda) => 
        Math.max(max, c.numero_local || 0), 0
      );
      return maiorNumero + 1;
    }

    const result = await this.db.query(`
      SELECT MAX(numero_local) as max_numero 
      FROM comandas_v2 
      WHERE prefixo_dispositivo = ?
    `, [prefixo]);

    const maxNumero = (result.values?.[0] as any)?.max_numero || 0;
    return maxNumero + 1;
  }

  // Sincronização melhorada com backoff exponencial
  async addToSyncQueue(tipoAcao: string, dados: unknown): Promise<void> {
    const item = {
      id: Date.now(), // Usar timestamp como ID temporário
      tipo_acao: tipoAcao,
      dados: JSON.stringify(dados),
      tentativas: 0,
      status: 'pending' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (!this.db) {
      const queue = this.getLocalStorageQueue();
      queue.push(item);
      localStorage.setItem('sync_queue_v2', JSON.stringify(queue));
      return;
    }

    await this.db.run(`
      INSERT INTO sync_queue_v2 (tipo_acao, dados, tentativas, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [item.tipo_acao, item.dados, item.tentativas, item.status, item.created_at, item.updated_at]);
  }

  async getPendingSyncItems(): Promise<SyncQueueItem[]> {
    if (!this.db) {
      const queue = this.getLocalStorageQueue();
      return queue.filter(item => item.status === 'pending');
    }

    const result = await this.db.query(`
      SELECT * FROM sync_queue_v2 
      WHERE status = 'pending' 
      ORDER BY created_at ASC
    `);

    return (result.values || []) as SyncQueueItem[];
  }

  async updateSyncItemStatus(id: number, status: 'synced' | 'failed'): Promise<void> {
    const now = new Date().toISOString();

    if (!this.db) {
      const queue = this.getLocalStorageQueue();
      const item = queue.find(q => q.id === id);
      if (item) {
        item.status = status;
        item.updated_at = now;
        if (status === 'failed') {
          item.tentativas += 1;
        }
        localStorage.setItem('sync_queue_v2', JSON.stringify(queue));
      }
      return;
    }

    let query = `
      UPDATE sync_queue_v2 
      SET status = ?, updated_at = ?
    `;
    const params = [status, now];

    if (status === 'failed') {
      query += ', tentativas = tentativas + 1';
    }

    query += ' WHERE id = ?';
    params.push(id.toString());

    await this.db.run(query, params);
  }

  async clearSyncedItems(): Promise<void> {
    if (!this.db) {
      const queue = this.getLocalStorageQueue();
      const filtered = queue.filter(item => item.status !== 'synced');
      localStorage.setItem('sync_queue_v2', JSON.stringify(filtered));
      return;
    }

    await this.db.run("DELETE FROM sync_queue_v2 WHERE status = 'synced'");
  }

  private getLocalStorageQueue(): SyncQueueItem[] {
    const queue = localStorage.getItem('sync_queue_v2');
    return queue ? JSON.parse(queue) : [];
  }

  async closeDatabase(): Promise<void> {
    if (this.db) {
      await this.db.close();
      await this.sqlite.closeConnection(this.dbName, false);
      this.db = null;
    }
  }
}

export const databaseV2Service = new DatabaseV2Service();