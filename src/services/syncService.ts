import { databaseV2Service } from './databaseV2';
import { supabaseService } from './supabase';

interface SyncResult {
  success: number;
  failed: number;
  errors: string[];
}

interface BackoffConfig {
  baseDelay: number;
  maxDelay: number;
  maxRetries: number;
}

class SyncService {
  private isSync = false;
  private backoffConfig: BackoffConfig = {
    baseDelay: 1000, // 1 segundo
    maxDelay: 30000, // 30 segundos
    maxRetries: 5
  };

  async processSyncQueue(): Promise<SyncResult> {
    if (this.isSync) {
      return { success: 0, failed: 0, errors: ['Sync already in progress'] };
    }

    this.isSync = true;
    const result: SyncResult = { success: 0, failed: 0, errors: [] };

    try {
      const pendingItems = await databaseV2Service.getPendingSyncItems();
      
      for (const item of pendingItems) {
        try {
          // Verificar se deve tentar novamente (backoff exponencial)
          if (item.tentativas >= this.backoffConfig.maxRetries) {
            result.errors.push(`Max retries exceeded for item ${item.id}`);
            continue;
          }

          // Calcular delay baseado no número de tentativas
          if (item.tentativas > 0) {
            const delay = Math.min(
              this.backoffConfig.baseDelay * Math.pow(2, item.tentativas - 1),
              this.backoffConfig.maxDelay
            );
            
            const lastAttempt = new Date(item.updated_at);
            const now = new Date();
            const timeSinceLastAttempt = now.getTime() - lastAttempt.getTime();

            if (timeSinceLastAttempt < delay) {
              continue; // Aguardar mais tempo antes de tentar novamente
            }
          }

          const dados = JSON.parse(item.dados);
          let success = false;

          switch (item.tipo_acao) {
            case 'criar_comanda':
              // Usar método público do SupabaseService
              success = await this.syncComanda(dados);
              break;
            case 'criar_material':
              success = await this.syncMaterial(dados);
              break;
            case 'atualizar_material':
              success = await this.syncMaterialUpdate(dados);
              break;
            case 'criar_vale':
              success = await this.syncVale(dados);
              break;
            case 'criar_despesa':
              success = await this.syncDespesa(dados);
              break;
            default:
              result.errors.push(`Unknown action type: ${item.tipo_acao}`);
              continue;
          }

          if (success) {
            await databaseV2Service.updateSyncItemStatus(item.id, 'synced');
            result.success++;
          } else {
            await databaseV2Service.updateSyncItemStatus(item.id, 'failed');
            result.failed++;
          }

        } catch (error) {
          await databaseV2Service.updateSyncItemStatus(item.id, 'failed');
          result.failed++;
          result.errors.push(`Error syncing item ${item.id}: ${error}`);
        }
      }

      // Limpar itens sincronizados
      await databaseV2Service.clearSyncedItems();

    } catch (error) {
      result.errors.push(`Sync process error: ${error}`);
    } finally {
      this.isSync = false;
    }

    return result;
  }

  async batchSync(items: unknown[]): Promise<SyncResult> {
    const result: SyncResult = { success: 0, failed: 0, errors: [] };

    // Agrupar por tipo de operação para otimizar
    const grouped = this.groupItemsByType(items);

    for (const [type, typeItems] of Object.entries(grouped)) {
      try {
        switch (type) {
          case 'comandas':
            const comandasResult = await this.batchSyncComandas(typeItems);
            result.success += comandasResult.success;
            result.failed += comandasResult.failed;
            result.errors.push(...comandasResult.errors);
            break;
          
          case 'materiais':
            const materiaisResult = await this.batchSyncMateriais(typeItems);
            result.success += materiaisResult.success;
            result.failed += materiaisResult.failed;
            result.errors.push(...materiaisResult.errors);
            break;
        }
      } catch (error) {
        result.errors.push(`Batch sync error for ${type}: ${error}`);
        result.failed += typeItems.length;
      }
    }

    return result;
  }

  private groupItemsByType(items: unknown[]): Record<string, unknown[]> {
    const grouped: Record<string, unknown[]> = {};

    for (const item of items) {
      // Implementar lógica de agrupamento baseada no tipo
      // Por exemplo, verificar propriedades específicas para identificar o tipo
      if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, unknown>;
        
        if ('numero' in obj && 'itens' in obj) {
          grouped.comandas = grouped.comandas || [];
          grouped.comandas.push(item);
        } else if ('nome' in obj && 'preco_compra' in obj) {
          grouped.materiais = grouped.materiais || [];
          grouped.materiais.push(item);
        }
      }
    }

    return grouped;
  }

  private async batchSyncComandas(comandas: unknown[]): Promise<SyncResult> {
    const result: SyncResult = { success: 0, failed: 0, errors: [] };

    // Implementar sync em lotes menores (ex: 10 por vez)
    const batchSize = 10;
    for (let i = 0; i < comandas.length; i += batchSize) {
      const batch = comandas.slice(i, i + batchSize);
      
      for (const comanda of batch) {
        try {
          const success = await this.syncComanda(comanda);
          if (success) {
            result.success++;
          } else {
            result.failed++;
          }
        } catch (error) {
          result.failed++;
          result.errors.push(`Error syncing comanda: ${error}`);
        }
      }

      // Pequena pausa entre lotes para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return result;
  }

  private async batchSyncMateriais(materiais: unknown[]): Promise<SyncResult> {
    const result: SyncResult = { success: 0, failed: 0, errors: [] };

    const batchSize = 20; // Materiais podem ser sincronizados em lotes maiores
    for (let i = 0; i < materiais.length; i += batchSize) {
      const batch = materiais.slice(i, i + batchSize);
      
      for (const material of batch) {
        try {
          const success = await this.syncMaterial(material);
          if (success) {
            result.success++;
          } else {
            result.failed++;
          }
        } catch (error) {
          result.failed++;
          result.errors.push(`Error syncing material: ${error}`);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 50));
    }

    return result;
  }

  isSyncInProgress(): boolean {
    return this.isSync;
  }

  async getNextSyncAttempt(item: { tentativas: number; updated_at: string }): Promise<Date> {
    const delay = Math.min(
      this.backoffConfig.baseDelay * Math.pow(2, item.tentativas),
      this.backoffConfig.maxDelay
    );

    const lastAttempt = new Date(item.updated_at);
    return new Date(lastAttempt.getTime() + delay);
  }

  // Métodos de sincronização específicos
  private async syncComanda(dados: unknown): Promise<boolean> {
    try {
      if (!supabaseService.client) return false;
      
      const comanda = dados as any;
      const { error } = await supabaseService.client
        .from('comanda')
        .insert([{
          numero: comanda.numero,
          tipo: comanda.tipo,
          total: comanda.total,
          status: comanda.status || 'finalizada',
          cliente: comanda.cliente,
          dispositivo: comanda.dispositivo,
          observacoes: comanda.observacoes,
          data: comanda.created_at || new Date().toISOString()
        }]);

      if (error) {
        console.error('Error syncing comanda:', error);
        return false;
      }

      // Inserir itens se existirem
      if (comanda.itens && Array.isArray(comanda.itens)) {
        for (const item of comanda.itens) {
          await supabaseService.client
            .from('item')
            .insert([{
              comanda_numero: comanda.numero,
              material: item.material_nome || item.material,
              preco: item.preco,
              quantidade: item.quantidade,
              total: item.total
            }]);
        }
      }

      return true;
    } catch (error) {
      console.error('Error in syncComanda:', error);
      return false;
    }
  }

  private async syncMaterial(dados: unknown): Promise<boolean> {
    try {
      if (!supabaseService.client) return false;
      
      const material = dados as any;
      const { error } = await supabaseService.client
        .from('material')
        .insert([{
          nome: material.nome,
          preco_compra_kg: material.preco_compra || material.preco_compra_kg,
          preco_venda_kg: material.preco_venda || material.preco_venda_kg,
          categoria: material.categoria,
          unidade: material.unidade || 'kg',
          ativo: material.ativo !== false
        }]);

      return !error;
    } catch (error) {
      console.error('Error in syncMaterial:', error);
      return false;
    }
  }

  private async syncMaterialUpdate(dados: unknown): Promise<boolean> {
    try {
      if (!supabaseService.client) return false;
      
      const material = dados as any;
      const { error } = await supabaseService.client
        .from('material')
        .update({
          nome: material.nome,
          preco_compra_kg: material.preco_compra || material.preco_compra_kg,
          preco_venda_kg: material.preco_venda || material.preco_venda_kg,
          categoria: material.categoria,
          unidade: material.unidade || 'kg',
          ativo: material.ativo !== false
        })
        .eq('id', material.id);

      return !error;
    } catch (error) {
      console.error('Error in syncMaterialUpdate:', error);
      return false;
    }
  }

  private async syncVale(dados: unknown): Promise<boolean> {
    try {
      if (!supabaseService.client) return false;
      
      const vale = dados as any;
      const { error } = await supabaseService.client
        .from('vale')
        .insert([{
          numero: vale.numero,
          cliente: vale.cliente,
          valor: vale.valor,
          data: vale.data || new Date().toISOString(),
          status: vale.status || 'aberto',
          observacoes: vale.observacoes
        }]);

      return !error;
    } catch (error) {
      console.error('Error in syncVale:', error);
      return false;
    }
  }

  private async syncDespesa(dados: unknown): Promise<boolean> {
    try {
      if (!supabaseService.client) return false;
      
      const despesa = dados as any;
      const { error } = await supabaseService.client
        .from('pendencia')
        .insert([{
          tipo: 'eu devo',
          descricao: despesa.descricao,
          valor: despesa.valor,
          data: despesa.data || new Date().toISOString(),
          pessoa: despesa.pessoa,
          status: 'pendente'
        }]);

      return !error;
    } catch (error) {
      console.error('Error in syncDespesa:', error);
      return false;
    }
  }
}

export const syncService = new SyncService();