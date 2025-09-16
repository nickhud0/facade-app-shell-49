/**
 * Sistema de idempotência para evitar duplicações na fila offline
 */

import { prefixoService } from '@/services/prefixoService';

export interface IdempotentItem {
  id: string;
  idempotencyKey: string;
  type: string;
  data: any;
  tentativas: number;
  status: 'pending' | 'processing' | 'success' | 'failed';
  created_at: string;
  last_attempt?: string;
}

class IdempotencyService {
  private prefix: string = '';

  async initialize() {
    // Usar prefixo padrão se não conseguir obter do serviço
    try {
      this.prefix = localStorage.getItem('prefixo_dispositivo') || 'DEV';
    } catch (error) {
      this.prefix = 'DEV';
    }
  }

  // Gerar chave única baseada no prefixo + timestamp + contador
  generateKey(type: string, data?: any): string {
    const timestamp = Date.now();
    const counter = this.getNextCounter();
    const hash = this.simpleHash(JSON.stringify(data || {}));
    
    return `${this.prefix}-${type}-${timestamp}-${counter}-${hash}`;
  }

  // Contador sequencial para garantir unicidade
  private getNextCounter(): number {
    const key = 'idempotency_counter';
    const current = parseInt(localStorage.getItem(key) || '0', 10);
    const next = current + 1;
    localStorage.setItem(key, next.toString());
    return next;
  }

  // Hash simples para dados
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // Verificar se uma chave já foi processada
  isProcessed(idempotencyKey: string): boolean {
    const processed = this.getProcessedKeys();
    return processed.includes(idempotencyKey);
  }

  // Marcar chave como processada
  markAsProcessed(idempotencyKey: string): void {
    const processed = this.getProcessedKeys();
    processed.push(idempotencyKey);
    
    // Manter apenas as últimas 1000 chaves para evitar crescimento excessivo
    if (processed.length > 1000) {
      processed.splice(0, processed.length - 1000);
    }
    
    localStorage.setItem('processed_keys', JSON.stringify(processed));
  }

  // Obter chaves já processadas
  private getProcessedKeys(): string[] {
    try {
      const saved = localStorage.getItem('processed_keys');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.warn('Erro ao recuperar chaves processadas:', error);
      return [];
    }
  }

  // Limpar chaves antigas (executar periodicamente)
  cleanOldKeys(): void {
    try {
      const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 dias atrás
      const processed = this.getProcessedKeys();
      
      // Filtrar chaves que contêm timestamp recente
      const recent = processed.filter(key => {
        const parts = key.split('-');
        if (parts.length >= 3) {
          const timestamp = parseInt(parts[2], 10);
          return timestamp > cutoff;
        }
        return true; // Manter se não conseguir parsear
      });
      
      localStorage.setItem('processed_keys', JSON.stringify(recent));
    } catch (error) {
      console.warn('Erro ao limpar chaves antigas:', error);
    }
  }
}

export const idempotencyService = new IdempotencyService();