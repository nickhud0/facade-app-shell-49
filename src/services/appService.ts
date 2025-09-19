import { offlineStorage } from './offlineStorage';
import { supabaseService, SupabaseConfig } from './supabase';
import { networkService } from './networkService';
import { unifiedSyncService } from './unifiedSyncService';
import { initializeSampleData } from '@/utils/sampleData';
import { logger } from '@/utils/logger';

function withTimeout<T>(p: Promise<T>, ms = 2500): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))
  ]);
}

class AppService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      logger.info('Initializing app services...');

      // 1. Offline storage (localStorage - sempre funciona)
      logger.info('✓ Offline storage ready');

      // 2. Inicializar serviço de rede
      try {
        await networkService.initialize();
        logger.info('✓ Network service initialized');
      } catch (networkError) {
        console.warn('⚠ Network service initialization failed:', networkError);
      }

      // 3. Inicializar sincronização unificada
      unifiedSyncService.initialize();
      logger.info('✓ Unified sync service initialized');

      // 4. Inicializar dados de exemplo para testes locais
      try {
        await initializeSampleData();
        logger.info('✓ Sample data checked/initialized');
      } catch (sampleError) {
        console.warn('⚠ Sample data initialization failed:', sampleError);
      }

      // 5. Tentar conectar ao Supabase se credenciais existirem
      try {
        await this.tryConnectSupabase();
        
        // 6. Se Supabase conectado, sincronizar dados essenciais
        if (supabaseService.getConnectionStatus() && networkService.getConnectionStatus()) {
          try {
            await this.syncEssentialData();
            logger.info('✓ Essential data synced on startup');
          } catch (syncError) {
            console.warn('⚠ Essential data sync failed:', syncError);
          }
        }
      } catch (supabaseError) {
        console.warn('⚠ Supabase connection failed:', supabaseError);
      }

      this.initialized = true;
      logger.info('✓ App services initialization completed');
    } catch (error) {
      console.error('Error initializing app services:', error);
      // Não lançar erro para não travar o app
      this.initialized = true; // Marcar como inicializado mesmo com erros
    }
  }

  private async tryConnectSupabase(): Promise<void> {
    try {
      const supabaseUrl = localStorage.getItem('config_supabase_url');
      const supabaseKey = localStorage.getItem('config_supabase_anon_key');

      if (supabaseUrl && supabaseKey) {
        const config: SupabaseConfig = {
          url: supabaseUrl,
          anonKey: supabaseKey
        };

        const connected = await withTimeout(supabaseService.initialize(config), 2000).catch(() => false);
        
        if (connected && networkService.getConnectionStatus()) {
          // Se conectou e está online, processar fila de sync
          void unifiedSyncService.processQueue().catch(console.warn);
          logger.info('✓ Supabase connected and sync started');
        } else if (connected) {
          logger.info('✓ Supabase connected (offline mode)');
        } else {
          logger.warn('⚠ Supabase connection failed - continuing in offline mode');
        }
      } else {
        logger.warn('⚠ No Supabase credentials found - running in local mode');
      }
    } catch (error) {
      console.error('Error connecting to Supabase:', error);
      // Não bloquear a inicialização do app se o Supabase falhar
    }
  }

  private async syncEssentialData(): Promise<void> {
    try {
      // Sincronizar apenas dados essenciais para funcionamento offline
      // Prioridade para materiais pois são necessários para compra/venda
      await supabaseService.syncAllData();
      logger.info('✓ Essential data (materials and prices) synced to local cache');
    } catch (error) {
      console.error('Error syncing essential data:', error);
      throw error;
    }
  }

  async saveSupabaseCredentials(url: string, anonKey: string): Promise<boolean> {
    try {
      // Salvar credenciais no localStorage
      localStorage.setItem('config_supabase_url', url);
      localStorage.setItem('config_supabase_anon_key', anonKey);

      // Tentar conectar com as novas credenciais
      const config: SupabaseConfig = { url, anonKey };
      const connected = await supabaseService.initialize(config);

      if (connected && networkService.getConnectionStatus()) {
        // Se conectou e está online, processar fila de sync
        await unifiedSyncService.processQueue();
      }

      return connected;
    } catch (error) {
      console.error('Error saving Supabase credentials:', error);
      return false;
    }
  }

  async getSupabaseCredentials(): Promise<{ url: string | null; anonKey: string | null }> {
    try {
      const url = localStorage.getItem('config_supabase_url');
      const anonKey = localStorage.getItem('config_supabase_anon_key');
      return { url, anonKey };
    } catch (error) {
      console.error('Error getting Supabase credentials:', error);
      return { url: null, anonKey: null };
    }
  }

  getConnectionStatus(): {
    isOnline: boolean;
    supabaseConnected: boolean;
    canSync: boolean;
  } {
    const isOnline = networkService.getConnectionStatus();
    const supabaseConnected = supabaseService.getConnectionStatus();
    
    return {
      isOnline,
      supabaseConnected,
      canSync: isOnline && supabaseConnected
    };
  }

  async getPendingSyncCount(): Promise<number> {
    const stats = await unifiedSyncService.getStats();
    return stats.pending;
  }

  async forceSyncIfPossible(): Promise<{ success: boolean; message: string }> {
    if (!networkService.getConnectionStatus()) {
      return { success: false, message: 'Sem conexão de rede' };
    }

    if (!supabaseService.getConnectionStatus()) {
      return { success: false, message: 'Supabase não conectado' };
    }

    try {
      const result = await unifiedSyncService.forceSync();
      return { 
        success: result.success > 0, 
        message: `${result.success} itens sincronizados, ${result.failed} falharam` 
      };
    } catch (error) {
      return { success: false, message: 'Erro na sincronização' };
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export const appService = new AppService();