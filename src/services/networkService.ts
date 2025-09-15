import { Network } from '@capacitor/network';
import { supabaseService } from './supabase';
import { databaseService } from './database';

export interface NetworkStatus {
  connected: boolean;
  connectionType: string;
}

class NetworkService {
  private isOnline = false;
  private listeners: Array<(status: NetworkStatus) => void> = [];
  private syncInProgress = false;

  async initialize(): Promise<void> {
    try {
      // Verificar status inicial da rede
      const status = await Network.getStatus();
      this.isOnline = status.connected;

      // Escutar mudanças na conectividade
      Network.addListener('networkStatusChange', async (status) => {
        console.log('Network status changed:', status);
        
        const wasOnline = this.isOnline;
        this.isOnline = status.connected;

        // Notificar listeners
        this.notifyListeners({
          connected: status.connected,
          connectionType: status.connectionType
        });

        // Se voltou online, iniciar sincronização
        if (!wasOnline && status.connected) {
          await this.handleOnlineReconnection();
        }
      });

      console.log('Network service initialized. Online:', this.isOnline);
    } catch (error) {
      console.warn('Network service initialization failed, using fallback:', error);
      // Assumir online como padrão se Capacitor Network falhar no web
      this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      
      // Para web, usar eventos do navegador se disponível
      if (typeof window !== 'undefined') {
        window.addEventListener('online', () => {
          this.isOnline = true;
          this.notifyListeners({ connected: true, connectionType: 'wifi' });
          this.handleOnlineReconnection();
        });
        
        window.addEventListener('offline', () => {
          this.isOnline = false;
          this.notifyListeners({ connected: false, connectionType: 'none' });
        });
      }
    }
  }

  getConnectionStatus(): boolean {
    return this.isOnline;
  }

  addStatusListener(callback: (status: NetworkStatus) => void): void {
    this.listeners.push(callback);
  }

  removeStatusListener(callback: (status: NetworkStatus) => void): void {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  private notifyListeners(status: NetworkStatus): void {
    this.listeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('Error notifying network status listener:', error);
      }
    });
  }

  private async handleOnlineReconnection(): Promise<void> {
    if (this.syncInProgress) {
      console.log('Sync already in progress, skipping...');
      return;
    }

    try {
      this.syncInProgress = true;
      console.log('Device came back online, starting sync...');

      // Verificar se a conexão com Supabase ainda está válida
      const supabaseConnected = await supabaseService.testConnection();
      
      if (supabaseConnected) {
        // Processar fila de sincronização
        const syncResult = await supabaseService.processSyncQueue();
        console.log('Sync completed:', syncResult);

        // Se houve sincronização bem-sucedida, atualizar cache
        if (syncResult.success > 0) {
          await supabaseService.syncAllData();
          console.log('Local cache updated with latest data');
        }

        // Notificar sobre sincronização
        if (syncResult.failed > 0) {
          console.warn(`${syncResult.failed} items failed to sync`);
          // Aqui você pode implementar notificação ao usuário sobre falhas
        }
      } else {
        console.error('Supabase connection test failed during reconnection');
      }
    } catch (error) {
      console.error('Error during online reconnection sync:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  async forceSyncIfOnline(): Promise<{ success: boolean; message: string }> {
    if (!this.isOnline) {
      return {
        success: false,
        message: 'Dispositivo offline. Dados serão sincronizados quando a conexão for restabelecida.'
      };
    }

    if (this.syncInProgress) {
      return {
        success: false,
        message: 'Sincronização já em andamento.'
      };
    }

    try {
      this.syncInProgress = true;

      // Verificar conexão com Supabase
      const supabaseConnected = await supabaseService.testConnection();
      
      if (!supabaseConnected) {
        return {
          success: false,
          message: 'Erro na conexão com o servidor. Verifique as configurações.'
        };
      }

      // Processar fila e sincronizar dados
      const syncResult = await supabaseService.processSyncQueue();
      await supabaseService.syncAllData();

      return {
        success: true,
        message: `Sincronização concluída. ${syncResult.success} itens sincronizados, ${syncResult.failed} falharam.`
      };
    } catch (error) {
      console.error('Error during forced sync:', error);
      return {
        success: false,
        message: 'Erro durante a sincronização. Tente novamente.'
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  async getPendingSyncCount(): Promise<number> {
    try {
      const pendingItems = await databaseService.getPendingSyncItems();
      return pendingItems.length;
    } catch (error) {
      console.error('Error getting pending sync count:', error);
      return 0;
    }
  }

  isSyncInProgress(): boolean {
    return this.syncInProgress;
  }
}

export const networkService = new NetworkService();