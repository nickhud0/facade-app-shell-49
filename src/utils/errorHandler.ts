import { toast } from "sonner";

/**
 * Tratamento padronizado de erros com notificações amigáveis
 * @param error O erro capturado
 * @param context Contexto onde o erro ocorreu (nome da tela/ação)
 */
export function notifyError(error: any, context: string) {
  console.error(`Erro em ${context}:`, error);
  
  // Extrair mensagem do erro
  const message = error?.message || error?.toString() || "Ocorreu um erro inesperado.";
  
  // Verificar se é erro de conectividade
  if (message.includes("offline") || 
      message.includes("network") || 
      message.includes("fetch") ||
      message.includes("NetworkError") ||
      message.includes("Failed to fetch")) {
    toast.error("Sem conexão. Salvamos offline, vamos sincronizar depois.");
    return;
  }
  
  // Verificar se é erro de sync/Supabase
  if (message.includes("sync") || 
      message.includes("supabase") || 
      message.includes("database")) {
    toast.error("Erro de sincronização. Dados salvos localmente.");
    return;
  }
  
  // Erro genérico com contexto
  toast.error(`Erro em ${context}: ${message}`);
}

/**
 * Wrapper para operações que podem falhar
 * @param operation Função a ser executada
 * @param context Contexto da operação
 * @param fallback Valor de retorno em caso de erro (opcional)
 */
export async function safeExecute<T>(
  operation: () => Promise<T>,
  context: string,
  fallback?: T
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    notifyError(error, context);
    return fallback;
  }
}