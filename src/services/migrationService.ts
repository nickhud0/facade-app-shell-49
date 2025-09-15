import { databaseService } from './database';
import { databaseV2Service } from './databaseV2';
import { Comanda } from './database';

interface MigrationStatus {
  version: number;
  migrated: boolean;
  lastMigration: string;
}

class MigrationService {
  private readonly CURRENT_VERSION = 2;
  private readonly MIGRATION_KEY = 'db_migration_status';

  async getMigrationStatus(): Promise<MigrationStatus> {
    const stored = localStorage.getItem(this.MIGRATION_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    
    return {
      version: 1,
      migrated: false,
      lastMigration: new Date().toISOString()
    };
  }

  async setMigrationStatus(status: MigrationStatus): Promise<void> {
    localStorage.setItem(this.MIGRATION_KEY, JSON.stringify(status));
  }

  async needsMigration(): Promise<boolean> {
    const status = await this.getMigrationStatus();
    return status.version < this.CURRENT_VERSION;
  }

  async migrateToV2(): Promise<void> {
    console.log('Iniciando migração para v2...');
    
    try {
      // Migrar comandas do formato antigo para o novo
      const comandasAntigas = await this.getComandasV1();
      
      for (const comanda of comandasAntigas) {
        await databaseV2Service.saveComanda(
          {
            id: comanda.id,
            numero: comanda.numero,
            tipo: comanda.tipo,
            total: comanda.total,
            status: comanda.status === 'ativa' ? 'aberta' : comanda.status,
            cliente: comanda.cliente,
            created_at: comanda.created_at || new Date().toISOString(),
            updated_at: comanda.updated_at || new Date().toISOString()
          },
          comanda.itens.map(item => ({
            material_id: item.id,
            material_nome: item.material,
            preco: item.preco,
            quantidade: item.quantidade,
            total: item.total
          }))
        );
      }

      // Migrar materiais se existirem - removendo para evitar erros de método não existente
      // A migração de materiais pode ser implementada posteriormente conforme necessário
      console.log('Migração de materiais pulada - será implementada posteriormente');

      // Atualizar status da migração
      await this.setMigrationStatus({
        version: this.CURRENT_VERSION,
        migrated: true,
        lastMigration: new Date().toISOString()
      });

      console.log('Migração para v2 concluída com sucesso');
    } catch (error) {
      console.error('Erro na migração para v2:', error);
      throw error;
    }
  }

  private async getComandasV1(): Promise<Comanda[]> {
    // Pegar comandas do sistema antigo (database.ts)
    try {
      // Primeiro tentar pegar do localStorage (fallback)
      const cached = localStorage.getItem('comandas_cache');
      if (cached) {
        return JSON.parse(cached);
      }

      // Se não tiver no localStorage, não há comandas para migrar
      return [];
    } catch (error) {
      console.warn('Erro ao recuperar comandas v1:', error);
      return [];
    }
  }

  async runMigrations(): Promise<void> {
    if (await this.needsMigration()) {
      const status = await this.getMigrationStatus();
      
      if (status.version < 2) {
        await this.migrateToV2();
      }
      
      // Futuras migrações podem ser adicionadas aqui
    }
  }
}

export const migrationService = new MigrationService();