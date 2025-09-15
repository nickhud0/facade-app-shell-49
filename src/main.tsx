import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

// Registrar service worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

// Configuração inicial para mobile
const initializeMobileFeatures = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      // Configurar status bar
      await StatusBar.setStyle({ style: Style.Default });
      await StatusBar.setBackgroundColor({ color: '#3b82f6' });
      
      // Ocultar splash screen após carregamento
      await SplashScreen.hide();
    } catch (error) {
      console.warn('Mobile features initialization failed:', error);
    }
  }
};

// Inicializar app
const root = createRoot(document.getElementById("root")!);
root.render(<App />);

// Inicializar recursos mobile em background
initializeMobileFeatures();
