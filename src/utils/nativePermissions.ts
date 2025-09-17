import { Capacitor } from '@capacitor/core';
import { logger } from './logger';

/**
 * Utility functions for handling native permissions
 * Required for Bluetooth printing and file system operations
 */

export interface PermissionResult {
  granted: boolean;
  message?: string;
}

/**
 * Request Bluetooth permissions for Android
 * These permissions are required for thermal printer connectivity
 */
export async function requestBluetoothPermissions(): Promise<PermissionResult> {
  if (!Capacitor.isNativePlatform()) {
    return { granted: true, message: 'Web platform - permissions not needed' };
  }

  try {
    // The permissions are handled by the thermal printer plugin
    // This function exists for documentation and future expansion
    logger.debug('Bluetooth permissions managed by thermal printer plugin');
    
    return { 
      granted: true, 
      message: 'Permissions managed by thermal printer plugin' 
    };
  } catch (error) {
    logger.debug('Error requesting Bluetooth permissions:', error);
    return { 
      granted: false, 
      message: 'Failed to request Bluetooth permissions' 
    };
  }
}

/**
 * Check if device supports native features
 */
export function isNativeDevice(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Get platform information
 */
export function getPlatformInfo(): {
  isNative: boolean;
  platform: string;
  isAndroid: boolean;
  isIOS: boolean;
} {
  const platform = Capacitor.getPlatform();
  
  return {
    isNative: Capacitor.isNativePlatform(),
    platform,
    isAndroid: platform === 'android',
    isIOS: platform === 'ios'
  };
}

/**
 * Display user-friendly messages for permission states
 */
export function getPermissionMessage(granted: boolean, feature: string): string {
  if (granted) {
    return `${feature} está funcionando corretamente.`;
  }
  
  return `${feature} requer permissões do sistema. ` +
         'Verifique as configurações do aplicativo em Configurações > Aplicativos > ' +
         'Reciclagem Pereque > Permissões.';
}