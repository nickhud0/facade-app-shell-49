import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';
import { logger } from './logger';
import { getPlatformInfo, getPermissionMessage } from './nativePermissions';

/**
 * Helper functions for native device operations
 */

/**
 * Show appropriate error messages based on platform
 */
export function showNativeError(error: Error, feature: string) {
  const { isNative } = getPlatformInfo();
  
  if (!isNative) {
    toast.error(`${feature} não é suportado no navegador`);
    return;
  }

  logger.debug(`Native error in ${feature}:`, error);
  
  // Check for common error types
  if (error.message.includes('permission') || error.message.includes('Permission')) {
    toast.error(getPermissionMessage(false, feature));
  } else if (error.message.includes('Bluetooth') || error.message.includes('bluetooth')) {
    toast.error(
      'Erro de Bluetooth. Verifique se o Bluetooth está ativado e ' +
      'a impressora está em modo de pareamento.'
    );
  } else if (error.message.includes('connect') || error.message.includes('Connect')) {
    toast.error(
      'Erro de conexão. Verifique se o dispositivo está próximo e ' +
      'tente novamente.'
    );
  } else {
    toast.error(`Erro em ${feature}: ${error.message}`);
  }
}

/**
 * Show success messages for native operations
 */
export function showNativeSuccess(feature: string, details?: string) {
  const message = details ? `${feature}: ${details}` : `${feature} realizado com sucesso!`;
  toast.success(message);
}

/**
 * Check if a native feature is available
 */
export function isFeatureAvailable(feature: 'bluetooth' | 'filesystem' | 'share'): boolean {
  const { isNative, isAndroid, isIOS } = getPlatformInfo();
  
  if (!isNative) {
    return false;
  }

  switch (feature) {
    case 'bluetooth':
      // Bluetooth printing is primarily supported on Android
      return isAndroid;
    case 'filesystem':
      // File system operations are supported on both platforms
      return isAndroid || isIOS;
    case 'share':
      // Sharing is supported on both platforms
      return isAndroid || isIOS;
    default:
      return false;
  }
}

/**
 * Get user-friendly feature availability message
 */
export function getFeatureAvailabilityMessage(feature: string): string {
  const { isNative, platform } = getPlatformInfo();
  
  if (!isNative) {
    return `${feature} não está disponível no navegador. Use o aplicativo móvel.`;
  }
  
  return `${feature} está disponível nesta plataforma (${platform}).`;
}

/**
 * Wrapper for native operations with error handling
 */
export async function withNativeErrorHandling<T>(
  operation: () => Promise<T>,
  feature: string
): Promise<T | null> {
  try {
    if (!getPlatformInfo().isNative) {
      throw new Error(`${feature} requer aplicativo nativo`);
    }
    
    return await operation();
  } catch (error) {
    showNativeError(error as Error, feature);
    return null;
  }
}