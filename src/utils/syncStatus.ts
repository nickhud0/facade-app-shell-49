import { Clock, CheckCircle, WifiOff } from "lucide-react";

export type SyncStatus = "pending" | "synced" | "offline";

export function getSyncIcon(status: SyncStatus) {
  switch (status) {
    case "pending":
      return Clock;
    case "synced":
      return CheckCircle;
    case "offline":
      return WifiOff;
    default:
      return Clock;
  }
}

export function getSyncTooltip(status: SyncStatus) {
  switch (status) {
    case "pending":
      return "Aguardando sincronização";
    case "synced":
      return "Sincronizado com o servidor";
    case "offline":
      return "Dados offline - última atualização desconhecida";
    default:
      return "Status desconhecido";
  }
}

export function getSyncIconColor(status: SyncStatus) {
  switch (status) {
    case "pending":
      return "text-warning";
    case "synced":
      return "text-success";
    case "offline":
      return "text-muted-foreground";
    default:
      return "text-muted-foreground";
  }
}

export function formatLastUpdate(dateString?: string): string {
  if (!dateString) return "desconhecida";
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return "agora";
    if (diffMinutes < 60) return `${diffMinutes}min atrás`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h atrás`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d atrás`;
    
    return date.toLocaleDateString('pt-BR');
  } catch (error) {
    return "desconhecida";
  }
}