/**
 * Serviço de sincronização offline → online
 * Responsabilidade: Processar fila de sincronização e atualizar status
 */

import { offlineQueueService } from './offlineQueue';
import { supabaseService } from './supabaseService';
import { logger } from '@/utils/logger';
import { networkService } from './networkService';

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
  private isSyncing = false;

  async processSyncQueue(): Promise<SyncResult> {
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
    
    try {
      const result = await offlineQueueService.processQueue();
      
      // Atualizar timestamps de última sincronização se houve sucesso
      if (result.success > 0) {
        const now = new Date().toISOString();
        localStorage.setItem('materiais_last_sync', now);
        localStorage.setItem('transacoes_last_sync', now);
        localStorage.setItem('vales_last_sync', now);
        localStorage.setItem('despesas_last_sync', now);
        localStorage.setItem('estoque_last_sync', now);
      }

      return {
        success: result.success,
        failed: result.failed,
        errors: result.failed > 0 ? ['Some items failed to sync'] : []
      };
    } catch (error) {
      logger.error('Sync process error:', error);
      return {
        success: 0,
        failed: 0,
        errors: [`Sync process error: ${error}`]
      };
    } finally {
      this.isSyncing = false;
    }
  }

  async forceSync(): Promise<SyncResult> {
    logger.info('🔄 Forçando sincronização...');
    return await this.processSyncQueue();
  }

  async getQueueStats(): Promise<{ pending: number; failed: number; total: number }> {
    return offlineQueueService.getQueueStats();
  }

  isSyncInProgress(): boolean {
    return this.isSyncing;
  }
}

export const syncService = new SyncService();