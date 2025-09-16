/**
 * Gerenciador de estado da aplicação para revalidação automática
 */

import { networkService } from '@/services/networkService';
import { offlineQueueService } from '@/services/offlineQueue';
import { logger } from '@/utils/logger';

interface AppStateListener {
  onForeground?: () => void;
  onBackground?: () => void;
  onNetworkReconnect?: () => void;
}

class AppStateManager {
  private listeners: AppStateListener[] = [];
  private isInForeground = true;
  private lastActiveTime = Date.now();

  initialize() {
    // Monitorar visibilidade da página
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    
    // Monitorar foco da janela
    window.addEventListener('focus', this.handleFocus.bind(this));
    window.addEventListener('blur', this.handleBlur.bind(this));
    
    // Monitorar mudanças de rede
    networkService.addStatusListener(this.handleNetworkChange.bind(this));
    
    // Inicializar fila offline
    offlineQueueService.initialize();
    
    logger.debug('🎯 AppStateManager inicializado');
  }

  addListener(listener: AppStateListener) {
    this.listeners.push(listener);
  }

  removeListener(listener: AppStateListener) {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  private handleVisibilityChange() {
    if (document.hidden) {
      this.handleBackground();
    } else {
      this.handleForeground();
    }
  }

  private handleFocus() {
    if (!this.isInForeground) {
      this.handleForeground();
    }
  }

  private handleBlur() {
    if (this.isInForeground) {
      this.handleBackground();
    }
  }

  private handleForeground() {
    const wasInBackground = !this.isInForeground;
    this.isInForeground = true;
    
    if (wasInBackground) {
      const timeAway = Date.now() - this.lastActiveTime;
      logger.debug(`📱 App voltou ao foreground após ${Math.round(timeAway / 1000)}s`);
      
      // Revalidar dados se passou mais de 30 segundos
      if (timeAway > 30000) {
        this.notifyForeground();
        
        // Processar fila offline se online
        if (networkService.getConnectionStatus()) {
          setTimeout(() => {
            offlineQueueService.processQueue();
          }, 1000);
        }
      }
    }
  }

  private handleBackground() {
    this.isInForeground = false;
    this.lastActiveTime = Date.now();
    logger.debug('📱 App foi para background');
    
    this.notifyBackground();
  }

  private handleNetworkChange(status: { connected: boolean }) {
    if (status.connected) {
      logger.debug('🌐 Rede reconectada - revalidando dados');
      this.notifyNetworkReconnect();
      
      // Processar fila offline
      setTimeout(() => {
        offlineQueueService.processQueue();
      }, 2000);
    }
  }

  private notifyForeground() {
    this.listeners.forEach(listener => {
      try {
        listener.onForeground?.();
      } catch (error) {
        logger.error('Erro ao notificar listener onForeground:', error);
      }
    });
  }

  private notifyBackground() {
    this.listeners.forEach(listener => {
      try {
        listener.onBackground?.();
      } catch (error) {
        logger.error('Erro ao notificar listener onBackground:', error);
      }
    });
  }

  private notifyNetworkReconnect() {
    this.listeners.forEach(listener => {
      try {
        listener.onNetworkReconnect?.();
      } catch (error) {
        logger.error('Erro ao notificar listener onNetworkReconnect:', error);
      }
    });
  }

  // Métodos utilitários
  isAppInForeground(): boolean {
    return this.isInForeground;
  }

  getTimeSinceLastActive(): number {
    return Date.now() - this.lastActiveTime;
  }
}

export const appStateManager = new AppStateManager();