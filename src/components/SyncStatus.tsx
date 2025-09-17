/**
 * Componente para mostrar feedback visual de sincronização em listas
 * Exibe ⭮ para pendente e ✓ para sincronizado
 */

import { Clock, CheckCircle, AlertCircle, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SyncStatusProps {
  status: 'pending' | 'synced' | 'failed' | 'syncing';
  size?: 'sm' | 'md';
  showText?: boolean;
}

export function SyncStatus({ status, size = 'sm', showText = false }: SyncStatusProps) {
  const getIcon = () => {
    switch (status) {
      case 'pending':
        return <Clock className={`${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} text-yellow-500`} />;
      case 'synced':
        return <CheckCircle className={`${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} text-green-500`} />;
      case 'failed':
        return <AlertCircle className={`${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} text-red-500`} />;
      case 'syncing':
        return <RotateCcw className={`${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} text-blue-500 animate-spin`} />;
      default:
        return <Clock className={`${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} text-gray-400`} />;
    }
  };

  const getText = () => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'synced':
        return 'Sincronizado';
      case 'failed':
        return 'Falha';
      case 'syncing':
        return 'Sincronizando';
      default:
        return 'Desconhecido';
    }
  };

  const getTooltip = () => {
    switch (status) {
      case 'pending':
        return 'Item pendente para sincronização';
      case 'synced':
        return 'Item sincronizado com sucesso';
      case 'failed':
        return 'Falha na sincronização - será tentado novamente';
      case 'syncing':
        return 'Sincronizando item...';
      default:
        return 'Status desconhecido';
    }
  };

  const getBadgeVariant = () => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'synced':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'syncing':
        return 'default';
      default:
        return 'secondary';
    }
  };

  if (showText) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant={getBadgeVariant() as any} className={`gap-1 ${size === 'sm' ? 'h-5 px-1.5 text-xs' : 'h-6 px-2 text-sm'}`}>
              {getIcon()}
              <span>{getText()}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{getTooltip()}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center justify-center">
            {getIcon()}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltip()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}