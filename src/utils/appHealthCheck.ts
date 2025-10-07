// Verificação de saúde do app para garantir que todos os serviços estão funcionando
import { appService } from '@/services/appService';
import { databaseService } from '@/services/database';
import { networkService } from '@/services/networkService';

export interface AppHealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    database: 'online' | 'fallback' | 'offline';
    network: 'online' | 'offline';
    supabase: 'connected' | 'disconnected' | 'not_configured';
    sync: 'active' | 'pending' | 'disabled';
  };
  pendingSync: number;
  errors: string[];
}

export async function checkAppHealth(): Promise<AppHealthStatus> {
  const errors: string[] = [];
  const status: AppHealthStatus = {
    overall: 'healthy',
    services: {
      database: 'offline',
      network: 'offline', 
      supabase: 'disconnected',
      sync: 'disabled'
    },
    pendingSync: 0,
    errors
  };

  try {
    // Verificar status de inicialização
    if (!appService.isInitialized()) {
      errors.push('App services not initialized');
      status.overall = 'degraded';
    }

    // Verificar database
    try {
      await databaseService.getConfig('test');
      status.services.database = 'online';
    } catch (error) {
      // Verificar se localStorage está funcionando como fallback
      if (typeof localStorage !== 'undefined') {
        status.services.database = 'fallback';
      } else {
        errors.push('Database and localStorage fallback unavailable');
        status.services.database = 'offline';
        status.overall = 'unhealthy';
      }
    }

    // Verificar network
    status.services.network = networkService.getConnectionStatus() ? 'online' : 'offline';

    // Verificar Supabase
    const connectionStatus = appService.getConnectionStatus();
    if (connectionStatus.supabaseConnected) {
      status.services.supabase = 'connected';
      status.services.sync = connectionStatus.canSync ? 'active' : 'pending';
    } else {
      const credentials = await appService.getSupabaseCredentials();
      status.services.supabase = (credentials.url && credentials.anonKey) ? 'disconnected' : 'not_configured';
    }

    // Verificar fila de sincronização
    status.pendingSync = await networkService.getPendingSyncCount();

    // Determinar status geral
    if (status.services.database === 'offline') {
      status.overall = 'unhealthy';
    } else if (errors.length > 0 || status.services.database === 'fallback') {
      status.overall = 'degraded';
    }

  } catch (error) {
    errors.push(`Health check failed: ${error}`);
    status.overall = 'unhealthy';
  }

  return status;
}

export function logAppHealth(status: AppHealthStatus): void {
  console.log('🏥 App Health Check:', {
    overall: status.overall,
    services: status.services,
    pendingSync: status.pendingSync,
    errors: status.errors
  });

  if (status.overall === 'unhealthy') {
    console.error('❌ App is in unhealthy state:', status.errors);
  } else if (status.overall === 'degraded') {
    console.warn('⚠️ App is in degraded state:', status.errors);
  } else {
    console.log('✅ App is healthy');
  }
}