import { databaseService } from './database';
import { supabaseService, SupabaseConfig } from './supabase';
import { networkService } from './networkService';
import { initializeSampleData } from '@/utils/sampleData';

class AppService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('Initializing app services...');

      // 1. Inicializar banco local SQLite
      try {
        await databaseService.initializeDatabase();
        console.log('✓ SQLite database initialized');
      } catch (dbError) {
        console.warn('⚠ SQLite initialization failed, using localStorage:', dbError);
      }

      // 2. Inicializar serviço de rede
      try {
        await networkService.initialize();
        console.log('✓ Network service initialized');
      } catch (networkError) {
        console.warn('⚠ Network service initialization failed:', networkError);
      }

      // 3. Inicializar dados de exemplo para testes locais
      try {
        await initializeSampleData();
        console.log('✓ Sample data checked/initialized');
      } catch (sampleError) {
        console.warn('⚠ Sample data initialization failed:', sampleError);
      }

      // 4. Tentar conectar ao Supabase se credenciais existirem
      try {
        await this.tryConnectSupabase();
        
        // 5. Se Supabase conectado, sincronizar dados essenciais (materiais)
        if (supabaseService.getConnectionStatus() && networkService.getConnectionStatus()) {
          try {
            await this.syncEssentialData();
            console.log('✓ Essential data synced on startup');
          } catch (syncError) {
            console.warn('⚠ Essential data sync failed:', syncError);
          }
        }
      } catch (supabaseError) {
        console.warn('⚠ Supabase connection failed:', supabaseError);
      }

      this.initialized = true;
      console.log('✓ App services initialization completed');
    } catch (error) {
      console.error('Error initializing app services:', error);
      // Não lançar erro para não travar o app
      this.initialized = true; // Marcar como inicializado mesmo com erros
    }
  }

  private async tryConnectSupabase(): Promise<void> {
    try {
      const supabaseUrl = await databaseService.getConfig('supabase_url');
      const supabaseKey = await databaseService.getConfig('supabase_anon_key');

      if (supabaseUrl && supabaseKey) {
        const config: SupabaseConfig = {
          url: supabaseUrl,
          anonKey: supabaseKey
        };

        const connected = await supabaseService.initialize(config);
        
        if (connected && networkService.getConnectionStatus()) {
          // Se conectou e está online, sincronizar dados
          await supabaseService.syncAllData();
          console.log('✓ Supabase connected and data synced');
        } else if (connected) {
          console.log('✓ Supabase connected (offline mode)');
        } else {
          console.log('⚠ Supabase connection failed - continuing in offline mode');
        }
      } else {
        console.log('⚠ No Supabase credentials found - running in local mode');
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
      console.log('✓ Essential data (materials and prices) synced to local cache');
    } catch (error) {
      console.error('Error syncing essential data:', error);
      throw error;
    }
  }

  async saveSupabaseCredentials(url: string, anonKey: string): Promise<boolean> {
    try {
      // Salvar credenciais no banco local
      await databaseService.setConfig('supabase_url', url);
      await databaseService.setConfig('supabase_anon_key', anonKey);

      // Tentar conectar com as novas credenciais
      const config: SupabaseConfig = { url, anonKey };
      const connected = await supabaseService.initialize(config);

      if (connected && networkService.getConnectionStatus()) {
        // Se conectou e está online, sincronizar dados
        await supabaseService.syncAllData();
      }

      return connected;
    } catch (error) {
      console.error('Error saving Supabase credentials:', error);
      return false;
    }
  }

  async getSupabaseCredentials(): Promise<{ url: string | null; anonKey: string | null }> {
    try {
      const url = await databaseService.getConfig('supabase_url');
      const anonKey = await databaseService.getConfig('supabase_anon_key');
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
    return await networkService.getPendingSyncCount();
  }

  async forceSyncIfPossible(): Promise<{ success: boolean; message: string }> {
    return await networkService.forceSyncIfOnline();
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export const appService = new AppService();