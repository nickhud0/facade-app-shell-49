import { useState, useEffect } from 'react';
import { checkAppHealth, logAppHealth, AppHealthStatus } from '@/utils/appHealthCheck';

export function useAppHealth() {
  const [healthStatus, setHealthStatus] = useState<AppHealthStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const performHealthCheck = async () => {
    setIsChecking(true);
    try {
      const status = await checkAppHealth();
      setHealthStatus(status);
      logAppHealth(status);
    } catch (error) {
      console.error('Health check failed:', error);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Realizar check apenas quando solicitado manualmente
    // Removido check automático para melhor performance
  }, []);

  return {
    healthStatus,
    isChecking,
    refreshHealth: performHealthCheck
  };
}