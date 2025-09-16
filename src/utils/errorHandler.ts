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
    toast.error("Sem conexão. Mostrando última atualização.");
    return;
  }
  
  // Verificar se é erro de sync/Supabase
  if (message.includes("sync") || 
      message.includes("supabase") || 
      message.includes("database") ||
      message.includes("PostgrestError")) {
    toast.error("Não foi possível carregar agora. Tente novamente.");
    return;
  }
  
  // Verificar se é erro de view inexistente
  if (message.includes("does not exist") || 
      message.includes("relation") ||
      message.includes("table")) {
    toast.error("Funcionalidade indisponível. Verifique a configuração do banco.");
    return;
  }
  
  // Erro genérico com contexto mais amigável
  const friendlyContext = getFriendlyContext(context);
  toast.error(`Erro ao ${friendlyContext}. Tente novamente.`);
}

/**
 * Converte contexto técnico em mensagem amigável
 */
function getFriendlyContext(context: string): string {
  const contextMap: Record<string, string> = {
    'carregar estoque': 'carregar estoque',
    'buscar sobras': 'buscar sobras',
    'carregar relatórios': 'carregar relatórios',
    'salvar comanda': 'salvar comanda',
    'imprimir': 'imprimir',
    'sincronizar': 'sincronizar dados',
    'login': 'fazer login',
    'cadastrar': 'cadastrar'
  };
  
  return contextMap[context] || context;
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