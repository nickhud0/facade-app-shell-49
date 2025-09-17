import { Capacitor, registerPlugin } from '@capacitor/core';
import { ComandaParaPDF } from './print/pdfService';
import { logger } from '@/utils/logger';

// Import ThermalPrinter plugin
const ThermalPrinter = registerPlugin<any>('ThermalPrinter');

class ThermalPrinterService {
  private connected = false;
  private connectedDevice: any = null;

  public gerarTextoComanda(comanda: ComandaParaPDF): string {
    let texto = '';
    texto += 'Reciclagem Pereque\n';
    texto += 'Ubatuba, Pereque Mirim, Av Marginal, 2504\n';
    texto += '12 99162-0321\n';
    texto += 'CNPJ/PIX - 45.492.161/0001-88\n\n';
    texto += `Comanda: ${comanda.numero}\n`;
    texto += `Data: ${comanda.data}\n`;
    texto += `Horario: ${comanda.horario}\n`;
    texto += `Tipo: ${comanda.tipo.toUpperCase()}\n\n`;

    comanda.itens.forEach((item: any) => {
      texto += `${item.produto}\n`;
      texto += `${item.quantidade}x R$${this.formatPrice(item.precoUnitario)}   R$${this.formatPrice(item.total)}\n`;
    });

    texto += `\nTOTAL: R$${this.formatPrice(comanda.total)}\n\n`;
    texto += 'Obrigado\n';
    texto += 'DEUS SEJA LOUVADO!!!\n';
    texto += 'Versao 1.0\n';

    return texto;
  }

  // Formatar preço brasileiro
  private formatPrice(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  async requestPermissions(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      logger.debug('Permissões Bluetooth só necessárias em dispositivos nativos');
      return true;
    }

    try {
      const result = await ThermalPrinter.requestPermissions();
      return result.granted || false;
    } catch (error) {
      logger.debug('Erro ao solicitar permissões:', error);
      return false;
    }
  }

  async connectPrinter(address?: string): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      logger.debug('Impressão térmica só funciona em dispositivos nativos');
      return false;
    }

    try {
      // Check permissions first
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Permissão Bluetooth negada');
      }

      // If specific address provided, connect to it
      if (address) {
        await ThermalPrinter.connect({ name: address });
        this.connected = true;
        // Store connected device info
        const savedDevice = localStorage.getItem('thermal_printer_device');
        if (savedDevice) {
          this.connectedDevice = JSON.parse(savedDevice);
        }
        return true;
      }

      // Otherwise, try to connect to saved device
      const savedDevice = localStorage.getItem('thermal_printer_device');
      if (savedDevice) {
        const device = JSON.parse(savedDevice);
        await ThermalPrinter.connect({ name: device.name });
        this.connected = true;
        this.connectedDevice = device;
        return true;
      }

      // List devices if no saved device or connection failed
      const printers = await this.listPrinters();
      
      if (!printers || printers.length === 0) {
        throw new Error('Nenhuma impressora Bluetooth encontrada');
      }

      // Try to connect to first available device as fallback
      const device = printers[0];
      await ThermalPrinter.connect({ name: device.name });
      
      this.connected = true;
      this.connectedDevice = device;
      // Save device for future connections
      localStorage.setItem('thermal_printer_device', JSON.stringify(device));
      return true;
    } catch (error) {
      logger.debug('Erro ao conectar impressora:', error);
      return false;
    }
  }

  async isConnected(): Promise<boolean> {
    try {
      // ThermalPrinter doesn't have isConnected method, so we track it manually
      return this.connected;
    } catch {
      this.connected = false;
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      try {
        await ThermalPrinter.disconnect();
      } catch (error) {
        logger.debug('Erro ao desconectar:', error);
      }
      this.connected = false;
      this.connectedDevice = null;
    }
  }

  async printComanda(comanda: ComandaParaPDF): Promise<boolean> {
    try {
      // Verificar conexão
      if (!(await this.isConnected())) {
        const connected = await this.connectPrinter();
        if (!connected) {
          throw new Error('Não foi possível conectar à impressora');
        }
      }

      const texto = this.gerarTextoComanda(comanda);
      await ThermalPrinter.print({ text: texto });
      return true;

    } catch (error) {
      logger.debug('Erro ao imprimir comanda:', error);
      throw error;
    }
  }

  async printTest(): Promise<boolean> {
    if (!this.connected) {
      throw new Error('Impressora não conectada');
    }

    try {
      const testData = 
        "TESTE DE IMPRESSAO\n" +
        "\n" +
        "Data: " + new Date().toLocaleDateString('pt-BR') + "\n" +
        "Hora: " + new Date().toLocaleTimeString('pt-BR') + "\n" +
        "\n" +
        "Caracteres especiais:\n" +
        "cao, nao, coracao\n" +
        "Preco: R$ 123,45\n" +
        "\n" +
        "TESTE OK\n" +
        "\n\n";

      await ThermalPrinter.print({ text: testData });
      return true;
    } catch (error) {
      logger.debug('Erro no teste de impressão:', error);
      throw error;
    }
  }

  async listPrinters(): Promise<any[]> {
    if (!Capacitor.isNativePlatform()) {
      logger.debug('Lista de impressoras só funciona em dispositivos nativos');
      return [];
    }

    try {
      // Check permissions first
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Permissão Bluetooth negada');
      }

      const printers = await ThermalPrinter.listPrinters();
      return printers || [];
    } catch (error) {
      logger.debug('Erro ao listar impressoras:', error);
      return [];
    }
  }
}

export const thermalPrinterService = new ThermalPrinterService();

/**
 * Função utilitária para imprimir comanda com seleção automática de impressora
 * @deprecated Use thermalPrinterService.printComanda() em vez desta função
 */
export async function imprimirComanda(comanda: any) {
  try {
    // Check permissions first
    const hasPermission = await thermalPrinterService.requestPermissions();
    if (!hasPermission) {
      alert('Permissão Bluetooth negada');
      return;
    }

    const printers = await thermalPrinterService.listPrinters();

    if (!printers || printers.length === 0) {
      alert('Nenhuma impressora encontrada.');
      return;
    }

    await ThermalPrinter.connect({ name: printers[0].name });

    const texto = thermalPrinterService.gerarTextoComanda(comanda);

    await ThermalPrinter.print({ text: texto });

    await ThermalPrinter.disconnect();

    alert('Comanda impressa com sucesso!');
  } catch (error) {
    logger.debug('Erro ao imprimir:', error);
    alert('Erro ao imprimir comanda.');
  }
}
