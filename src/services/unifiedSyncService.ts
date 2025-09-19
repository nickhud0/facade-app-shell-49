/**
 * SERVIÇO DE SINCRONIZAÇÃO UNIFICADO
 * Processa a fila offline e sincroniza com Supabase
 */

import { offlineStorage, QueueItem } from '@/services/offlineStorage';
import { supabaseService } from '@/services/supabaseService';
import { networkService } from '@/services/networkService';
import { logger } from '@/utils/logger';

export interface SyncStats {
  pending: number;
  failed: number;
  total: number;
}

export interface SyncResult {
  success: number;
  failed: number;
  errors: string[];
}

class UnifiedSyncService {
  private isSyncing = false;
  private retryDelays = [2000, 5000, 15000]; // 2s, 5s, 15s

  async processQueue(): Promise<SyncResult> {
    if (this.isSyncing) {
      return { success: 0, failed: 0, errors: ['Sync already in progress'] };
    }

    if (!networkService.getConnectionStatus()) {
      return { success: 0, failed: 0, errors: ['No network connection'] };
    }

    if (!supabaseService.getConnectionStatus()) {
      return { success: 0, failed: 0, errors: ['Supabase not connected'] };
    }

    this.isSyncing = true;
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    try {
      const queue = await offlineStorage.getQueue();
      const pendingItems = queue.filter(item => 
        item.status === 'pending' && 
        item.tentativas < 3
      );

      logger.debug(`🔄 Processing ${pendingItems.length} items in sync queue`);

      for (const item of pendingItems) {
        try {
          const result = await this.processItem(item);
          
          if (result) {
            await offlineStorage.updateQueueItem(item.id, { 
              status: 'synced',
              tentativas: item.tentativas + 1
            });
            success++;
            logger.debug(`✅ Synced: ${item.type}/${item.action}`);
          } else {
            throw new Error('Sync failed');
          }
        } catch (error) {
          const newTentativas = item.tentativas + 1;
          
          if (newTentativas >= 3) {
            await offlineStorage.updateQueueItem(item.id, { 
              status: 'failed',
              tentativas: newTentativas
            });
            failed++;
            errors.push(`${item.type}/${item.action}: Max retries exceeded`);
            logger.error(`💀 Failed permanently: ${item.type}/${item.action}`);
          } else {
            await offlineStorage.updateQueueItem(item.id, { 
              status: 'pending',
              tentativas: newTentativas
            });
            logger.debug(`⏰ Retry ${newTentativas}/3: ${item.type}/${item.action}`);
          }
        }
      }

      // Limpar itens sincronizados
      await offlineStorage.clearSyncedItems();

    } finally {
      this.isSyncing = false;
    }

    if (success > 0 || failed > 0) {
      logger.info(`📊 Sync completed: ${success} success, ${failed} failed`);
    }

    return { success, failed, errors };
  }

  private async processItem(item: QueueItem): Promise<boolean> {
    try {
      switch (item.type) {
        case 'material':
          if (item.action === 'create') {
            return await supabaseService.createMaterial(item.data);
          } else if (item.action === 'update') {
            return await supabaseService.updateMaterial(item.data.id, item.data);
          }
          break;

        case 'transacao':
          if (item.action === 'create') {
            // Transações são criadas via comandas, não diretamente
            return true;
          }
          break;

        case 'vale':
          if (item.action === 'create') {
            return await supabaseService.createVale(item.data);
          } else if (item.action === 'update') {
            return await supabaseService.updateVale(item.data.id, item.data);
          }
          break;

        case 'despesa':
          if (item.action === 'create') {
            return await supabaseService.createDespesa(item.data);
          }
          break;

        case 'pendencia':
          if (item.action === 'create') {
            return await supabaseService.createDespesa(item.data);
          } else if (item.action === 'update') {
            return await supabaseService.updateVale(item.data.id, item.data);
          }
          break;

        case 'comanda':
          if (item.action === 'create') {
            return await supabaseService.createComanda(item.data);
          } else if (item.action === 'update') {
            // Comandas não têm update direto
            return true;
          }
          break;
      }
      
      return false;
    } catch (error) {
      logger.error(`Error processing item ${item.type}/${item.action}:`, error);
      return false;
    }
  }

  async getStats(): Promise<SyncStats> {
    const queue = await offlineStorage.getQueue();
    return {
      pending: queue.filter(item => item.status === 'pending').length,
      failed: queue.filter(item => item.status === 'failed').length,
      total: queue.length
    };
  }

  async forceSync(): Promise<SyncResult> {
    logger.info('🔄 Force sync initiated...');
    return await this.processQueue();
  }

  isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  async clearQueue(): Promise<void> {
    const queue = await offlineStorage.getQueue();
    const filteredQueue = queue.filter(item => item.status === 'pending');
    
    // Limpar apenas itens sincronizados e com falha
    localStorage.setItem('sync_queue', JSON.stringify(filteredQueue));
    logger.info('🗑️ Sync queue cleaned');
  }

  // Inicializar listeners
  initialize(): void {
    // Auto-sync quando voltar online
    networkService.addStatusListener((status) => {
      if (status.connected && !this.isSyncing) {
        setTimeout(() => {
          this.processQueue().catch(error => 
            logger.error('Auto-sync failed:', error)
          );
        }, 1000);
      }
    });

    // Auto-sync periódico se online
    setInterval(() => {
      if (networkService.getConnectionStatus() && !this.isSyncing) {
        this.processQueue().catch(error => 
          logger.debug('Periodic sync failed:', error)
        );
      }
    }, 30000); // A cada 30 segundos
  }
}

export const unifiedSyncService = new UnifiedSyncService();