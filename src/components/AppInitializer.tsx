import { ReactNode } from 'react';
import { logger } from '@/utils/logger';
import { notifyError } from '@/utils/errorHandler';

interface AppInitializerProps {
  children: ReactNode;
}

export const AppInitializer = ({ children }: AppInitializerProps) => {
  // Inicialização simples sem hooks para evitar dependências circulares
  if (typeof window !== 'undefined' && !window.__APP_INITIALIZED__) {
    window.__APP_INITIALIZED__ = true;
    
    // Inicialização assíncrona em background
    setTimeout(async () => {
      try {
        logger.debug('🚀 Starting app initialization...');
        
        // Importações dinâmicas para evitar dependências circulares
        const { appService } = await import('@/services/appService');
        await appService.initialize();
        
        const { MobileOptimizations } = await import('@/utils/mobileOptimizations');
        await MobileOptimizations.initialize();
        MobileOptimizations.adaptUIForDevice();
        
        logger.debug('✅ App initialization completed');
      } catch (error) {
        notifyError(error, 'Inicialização do App');
      }
    }, 100);
  }

  return children;
};

// Extend window interface
declare global {
  interface Window {
    __APP_INITIALIZED__?: boolean;
  }
}