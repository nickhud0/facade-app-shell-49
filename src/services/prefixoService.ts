import { databaseV2Service } from './databaseV2';

interface PrefixoConfig {
  prefixoDispositivo: string;
  created_at: string;
  updated_at: string;
}

class PrefixoService {
  private readonly PREFIXO_CONFIG_KEY = 'prefixo_dispositivo_config';

  // Obter configuração de prefixo do dispositivo
  async getPrefixoDispositivo(): Promise<string> {
    const stored = localStorage.getItem(this.PREFIXO_CONFIG_KEY);
    
    if (stored) {
      const config: PrefixoConfig = JSON.parse(stored);
      return config.prefixoDispositivo;
    }

    // Se não existir, gerar um prefixo padrão baseado no timestamp
    const prefixoPadrao = this.gerarPrefixoPadrao();
    await this.setPrefixoDispositivo(prefixoPadrao);
    return prefixoPadrao;
  }

  // Definir prefixo do dispositivo
  async setPrefixoDispositivo(prefixo: string): Promise<void> {
    // Validar prefixo (máximo 5 caracteres, apenas letras e números)
    if (!this.validarPrefixo(prefixo)) {
      throw new Error('Prefixo inválido. Use apenas letras e números (máximo 5 caracteres)');
    }

    const config: PrefixoConfig = {
      prefixoDispositivo: prefixo.toUpperCase(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    localStorage.setItem(this.PREFIXO_CONFIG_KEY, JSON.stringify(config));
  }

  // Validar formato do prefixo
  private validarPrefixo(prefixo: string): boolean {
    // Máximo 5 caracteres, apenas letras e números
    const regex = /^[A-Za-z0-9]{1,5}$/;
    return regex.test(prefixo);
  }

  // Gerar prefixo padrão baseado no timestamp
  private gerarPrefixoPadrao(): string {
    const timestamp = Date.now().toString();
    // Pegar os últimos 3 dígitos e converter para uma letra baseada
    const suffixNumber = parseInt(timestamp.slice(-3)) % 26;
    const suffixLetter = String.fromCharCode(65 + suffixNumber); // A-Z
    return `T${suffixLetter}`; // T + letra (ex: TA, TB, TC...)
  }

  // Gerar próximo número de comanda para o dispositivo
  async gerarProximoNumeroComanda(): Promise<{ prefixo: string; numeroLocal: number; codigoCompleto: string }> {
    const prefixo = await this.getPrefixoDispositivo();
    const numeroLocal = await databaseV2Service.getProximoNumeroLocal(prefixo);
    const codigoCompleto = `${prefixo}-${numeroLocal}`;

    return {
      prefixo,
      numeroLocal,
      codigoCompleto
    };
  }

  // Validar se um código de comanda está no formato correto
  validarCodigoComanda(codigo: string): boolean {
    // Formato: PREFIXO-NUMERO (ex: A-123, TB-45)
    const regex = /^[A-Z0-9]{1,5}-\d+$/;
    return regex.test(codigo);
  }

  // Extrair prefixo e número de um código completo
  extrairPrefixoENumero(codigoCompleto: string): { prefixo: string; numeroLocal: number } | null {
    if (!this.validarCodigoComanda(codigoCompleto)) {
      return null;
    }

    const [prefixo, numeroStr] = codigoCompleto.split('-');
    const numeroLocal = parseInt(numeroStr);

    return {
      prefixo,
      numeroLocal: isNaN(numeroLocal) ? 0 : numeroLocal
    };
  }

  // Verificar se o prefixo atual foi configurado (não é o padrão gerado automaticamente)
  async isPrefixoConfigurado(): Promise<boolean> {
    const stored = localStorage.getItem(this.PREFIXO_CONFIG_KEY);
    if (!stored) return false;

    const config: PrefixoConfig = JSON.parse(stored);
    // Se não começar com 'T', significa que foi configurado manualmente
    return !config.prefixoDispositivo.startsWith('T');
  }

  // Obter estatísticas do prefixo atual
  async getEstatisticasPrefixo(): Promise<{
    prefixo: string;
    totalComandas: number;
    ultimoNumero: number;
    configuradoManualmente: boolean;
  }> {
    const prefixo = await this.getPrefixoDispositivo();
    const ultimoNumero = await databaseV2Service.getProximoNumeroLocal(prefixo) - 1;
    const configuradoManualmente = await this.isPrefixoConfigurado();

    return {
      prefixo,
      totalComandas: ultimoNumero,
      ultimoNumero: Math.max(ultimoNumero, 0),
      configuradoManualmente
    };
  }
}

export const prefixoService = new PrefixoService();