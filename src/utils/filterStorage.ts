/**
 * Utilitários para salvar e recuperar filtros no localStorage
 */

export interface FiltrosPersistentes {
  periodo?: 'diario' | 'mensal' | 'anual' | 'personalizado';
  dataInicio?: string;
  dataFim?: string;
  categoria?: string;
  busca?: string;
}

// Salvar filtros no localStorage
export const salvarFiltros = (tela: string, filtros: FiltrosPersistentes): void => {
  try {
    localStorage.setItem(`filtros_${tela}`, JSON.stringify(filtros));
  } catch (error) {
    console.warn('Erro ao salvar filtros:', error);
  }
};

// Recuperar filtros do localStorage
export const recuperarFiltros = (tela: string): FiltrosPersistentes => {
  try {
    const saved = localStorage.getItem(`filtros_${tela}`);
    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    console.warn('Erro ao recuperar filtros:', error);
    return {};
  }
};

// Limpar filtros salvos
export const limparFiltros = (tela: string): void => {
  try {
    localStorage.removeItem(`filtros_${tela}`);
  } catch (error) {
    console.warn('Erro ao limpar filtros:', error);
  }
};