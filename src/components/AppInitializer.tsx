import { ReactNode } from 'react';

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
        console.log('🚀 Starting app initialization...');
        
        // Importações dinâmicas para evitar dependências circulares
        const { appService } = await import('@/services/appService');
        await appService.initialize();
        
        const { MobileOptimizations } = await import('@/utils/mobileOptimizations');
        await MobileOptimizations.initialize();
        MobileOptimizations.adaptUIForDevice();
        
        console.log('✅ App initialization completed');
      } catch (error) {
        console.warn('⚠ App initialization failed:', error);
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