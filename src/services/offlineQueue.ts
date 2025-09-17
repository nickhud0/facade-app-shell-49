/**
 * Fila offline robusta com retry exponencial e idempotência
 * Versão 2.0 - sem dependências de formatters
 */

import { supabaseService } from '@/services/supabase';
import { idempotencyService } from '@/utils/idempotency';
import { networkService } from '@/services/networkService';
import { notifyError } from '@/utils/errorHandler';
import { logger } from '@/utils/logger';

// Utility function - avoiding external imports to prevent loading issues
const formatDateToYMD = (d: Date | string): string => {
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export interface QueueItem {
  id: string;
  idempotencyKey: string;
  type: 'comanda' | 'material' | 'vale' | 'despesa' | 'pendencia';
  action: 'create' | 'update' | 'delete';
  data: any;
  tentativas: number;
  maxTentativas: number;
  status: 'pending' | 'processing' | 'success' | 'failed';
  created_at: string;
  last_attempt?: string;
  next_retry?: string;
}

class OfflineQueueService {
  private isProcessing = false;
  private retryDelays = [1000, 3000, 10000]; // 1s, 3s, 10s

  // Adicionar item à fila
  async addToQueue(type: string, action: string, data: any): Promise<string> {
    await idempotencyService.initialize();
    
    const idempotencyKey = idempotencyService.generateKey(type, data);
    
    // Verificar se já foi processado
    if (idempotencyService.isProcessed(idempotencyKey)) {
      logger.debug(`Item ${idempotencyKey} já foi processado`);
      return idempotencyKey;
    }

    const item: QueueItem = {
      id: crypto.randomUUID(),
      idempotencyKey,
      type: type as any,
      action: action as any,
      data,
      tentativas: 0,
      maxTentativas: 3,
      status: 'pending',
      created_at: formatDateToYMD(new Date())
    };

    const queue = this.getQueue();
    queue.push(item);
    this.saveQueue(queue);
    
    logger.debug(`📝 Item adicionado à fila: ${type}/${action}`);
    
    // Tentar processar se online
    if (networkService.getConnectionStatus()) {
      this.processQueue();
    }

    return idempotencyKey;
  }

  // Processar fila
  async processQueue(): Promise<{ success: number; failed: number }> {
    if (this.isProcessing) {
      logger.debug('Fila já sendo processada');
      return { success: 0, failed: 0 };
    }

    if (!networkService.getConnectionStatus()) {
      logger.debug('Offline - fila não processada');
      return { success: 0, failed: 0 };
    }

    this.isProcessing = true;
    let success = 0;
    let failed = 0;

    try {
      const queue = this.getQueue();
      const pendingItems = queue.filter(item => 
        item.status === 'pending' && 
        (item.tentativas < item.maxTentativas) &&
        (!item.next_retry || new Date(item.next_retry) <= new Date())
      );

      logger.debug(`🔄 Processando ${pendingItems.length} itens da fila`);

      for (const item of pendingItems) {
        try {
          item.status = 'processing';
          item.tentativas++;
          item.last_attempt = formatDateToYMD(new Date());
          
          this.updateQueueItem(item);

          const result = await this.processItem(item);
          
          if (result) {
            item.status = 'success';
            idempotencyService.markAsProcessed(item.idempotencyKey);
            success++;
            logger.debug(`✅ Item processado: ${item.type}/${item.action}`);
          } else {
            throw new Error('Falha no processamento');
          }
        } catch (error) {
          logger.error(`❌ Erro ao processar item ${item.id}:`, error);
          
          if (item.tentativas >= item.maxTentativas) {
            item.status = 'failed';
            failed++;
            logger.error(`💀 Item falhou definitivamente após ${item.tentativas} tentativas`);
          } else {
            item.status = 'pending';
            item.next_retry = formatDateToYMD(new Date(Date.now() + this.retryDelays[item.tentativas - 1]));
            logger.debug(`⏰ Reagendado para ${item.next_retry}`);
          }
        }
        
        this.updateQueueItem(item);
      }

      // Limpar itens bem-sucedidos
      this.cleanSuccessfulItems();

    } finally {
      this.isProcessing = false;
    }

    if (success > 0 || failed > 0) {
      logger.info(`📊 Fila processada: ${success} sucessos, ${failed} falhas`);
    }

    return { success, failed };
  }

  // Processar item individual
  private async processItem(item: QueueItem): Promise<boolean> {
    switch (item.type) {
      case 'comanda':
        return item.action === 'create' 
          ? await supabaseService.syncComanda(item.data)
          : await supabaseService.syncComandaUpdate(item.data);
          
      case 'material':
        if (item.action === 'create') {
          return await supabaseService.syncMaterial(item.data);
        } else if (item.action === 'update') {
          return await supabaseService.syncMaterialUpdate(item.data);
        }
        break;
        
      case 'vale':
        return await supabaseService.syncVale(item.data);
          
      case 'despesa':
        return await supabaseService.syncDespesa(item.data);
        
      case 'pendencia':
        return item.action === 'create'
          ? await supabaseService.syncPendencia(item.data)
          : await supabaseService.syncPendenciaUpdate(item.data);
    }
    
    return false;
  }

  // Obter fila do localStorage
  private getQueue(): QueueItem[] {
    try {
      const saved = localStorage.getItem('offline_queue');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      logger.error('Erro ao carregar fila:', error);
      return [];
    }
  }

  // Salvar fila no localStorage
  private saveQueue(queue: QueueItem[]): void {
    try {
      localStorage.setItem('offline_queue', JSON.stringify(queue));
    } catch (error) {
      logger.error('Erro ao salvar fila:', error);
    }
  }

  // Atualizar item na fila
  private updateQueueItem(updatedItem: QueueItem): void {
    const queue = this.getQueue();
    const index = queue.findIndex(item => item.id === updatedItem.id);
    if (index !== -1) {
      queue[index] = updatedItem;
      this.saveQueue(queue);
    }
  }

  // Limpar itens bem-sucedidos
  private cleanSuccessfulItems(): void {
    const queue = this.getQueue();
    const filtered = queue.filter(item => item.status !== 'success');
    this.saveQueue(filtered);
  }

  // Obter estatísticas da fila
  getQueueStats(): { pending: number; failed: number; total: number } {
    const queue = this.getQueue();
    return {
      pending: queue.filter(item => item.status === 'pending').length,
      failed: queue.filter(item => item.status === 'failed').length,
      total: queue.length
    };
  }

  // Limpar fila completamente (admin)
  clearQueue(): void {
    localStorage.removeItem('offline_queue');
    logger.info('🗑️ Fila limpa');
  }

  // Inicializar monitoramento de rede
  initialize(): void {
    networkService.addStatusListener((status) => {
      if (status.connected) {
        logger.debug('🌐 Reconectado - processando fila');
        setTimeout(() => this.processQueue(), 1000);
      }
    });
  }
}

export const offlineQueueService = new OfflineQueueService();