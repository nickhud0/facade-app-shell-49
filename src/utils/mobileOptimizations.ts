import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Device } from '@capacitor/device';

// Otimizações específicas para mobile
export class MobileOptimizations {
  static async initialize(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      // Configurar status bar baseado no tema
      await this.setupStatusBar();
      
      // Otimizar performance
      await this.optimizePerformance();
      
      console.log('✓ Mobile optimizations applied');
    } catch (error) {
      console.warn('Mobile optimizations failed:', error);
    }
  }

  private static async setupStatusBar(): Promise<void> {
    try {
      const deviceInfo = await Device.getInfo();
      
      if (deviceInfo.platform === 'android') {
        await StatusBar.setStyle({ style: Style.Default });
        await StatusBar.setBackgroundColor({ color: '#3b82f6' });
        await StatusBar.setOverlaysWebView({ overlay: false });
      } else if (deviceInfo.platform === 'ios') {
        await StatusBar.setStyle({ style: Style.Default });
      }
    } catch (error) {
      console.warn('Status bar setup failed:', error);
    }
  }

  private static async optimizePerformance(): Promise<void> {
    // Desabilitar zoom para melhor performance
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    }

    // Otimizar touch events
    document.addEventListener('touchstart', () => {}, { passive: true });
    document.addEventListener('touchmove', () => {}, { passive: true });
    
    // Prevenir contexto de menu em elementos específicos
    document.addEventListener('contextmenu', (e) => {
      if ((e.target as HTMLElement).tagName === 'IMG' || 
          (e.target as HTMLElement).classList.contains('no-context-menu')) {
        e.preventDefault();
      }
    });
  }

  static getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    if (!Capacitor.isNativePlatform()) {
      // Para web, detectar pelo user agent
      const userAgent = navigator.userAgent.toLowerCase();
      if (/android|iphone|ipod/.test(userAgent)) {
        return 'mobile';
      }
      if (/ipad|tablet/.test(userAgent)) {
        return 'tablet';
      }
      return 'desktop';
    }

    // Para mobile nativo, sempre retornar mobile
    return 'mobile';
  }

  static async getDeviceInfo(): Promise<{
    platform: string;
    model: string;
    operatingSystem: string;
    osVersion: string;
    isVirtual: boolean;
  }> {
    try {
      if (Capacitor.isNativePlatform()) {
        const info = await Device.getInfo();
        return {
          platform: info.platform,
          model: info.model,
          operatingSystem: info.operatingSystem,
          osVersion: info.osVersion,
          isVirtual: info.isVirtual
        };
      }
    } catch (error) {
      console.warn('Failed to get device info:', error);
    }

    return {
      platform: 'web',
      model: 'Unknown',
      operatingSystem: navigator.platform,
      osVersion: 'Unknown',
      isVirtual: false
    };
  }

  static isLowEndDevice(): boolean {
    // Detectar dispositivos com performance limitada
    const memory = (navigator as any).deviceMemory;
    const cores = navigator.hardwareConcurrency;
    
    if (memory && memory < 4) return true;
    if (cores && cores < 4) return true;
    
    return false;
  }

  static adaptUIForDevice(): void {
    const deviceType = this.getDeviceType();
    const isLowEnd = this.isLowEndDevice();
    
    // Adicionar classes CSS baseadas no dispositivo
    document.body.classList.add(`device-${deviceType}`);
    
    if (isLowEnd) {
      document.body.classList.add('low-end-device');
      // Reduzir animações para dispositivos com baixa performance
      document.documentElement.style.setProperty('--transition-smooth', 'all 0.15s ease');
    }
  }
}