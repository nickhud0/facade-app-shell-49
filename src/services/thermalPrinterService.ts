import { Capacitor } from '@capacitor/core';
import { ComandaParaPDF } from './print/pdfService';

// Import the Bluetooth plugin
let BluetoothPrinter: any = null;

if (Capacitor.isNativePlatform()) {
  try {
    // Dynamic import for Capacitor plugin
    BluetoothPrinter = (window as any).BluetoothPrinter || require('capacitor-bluetooth-printer');
  } catch (error) {
    console.warn('Capacitor Bluetooth Printer plugin not available');
  }
}

declare global {
  interface Window {
    BluetoothPrinter?: {
      list: () => Promise<any[]>;
      connect: (address: string) => Promise<boolean>;
      isConnected: () => Promise<boolean>;
      print: (text: string) => Promise<boolean>;
      printBase64: (base64: string) => Promise<boolean>;
      disconnect: () => Promise<boolean>;
    };
  }
}

class ThermalPrinterService {
  private connected = false;
  private connectedDevice: any = null;

  // Comandos ESC/POS para impressora térmica 58mm
  private ESC = '\x1B';
  private INIT = '\x1B\x40'; // Inicializar impressora
  private CENTER = '\x1B\x61\x01'; // Centralizar texto
  private LEFT = '\x1B\x61\x00'; // Alinhar à esquerda
  private RIGHT = '\x1B\x61\x02'; // Alinhar à direita
  private BOLD_ON = '\x1B\x45\x01'; // Negrito ligado
  private BOLD_OFF = '\x1B\x45\x00'; // Negrito desligado
  private DOUBLE_HEIGHT = '\x1D\x21\x11'; // Altura dupla
  private NORMAL_SIZE = '\x1D\x21\x00'; // Tamanho normal
  private CUT = '\x1D\x56\x00'; // Cortar papel
  private LINE_FEED = '\x0A'; // Nova linha

  async ensurePermissions(): Promise<void> {
    if (!(window as any).Capacitor?.isNativePlatform?.()) return;
    const printer = (window as any).BluetoothPrinter;
    try {
      if (printer?.requestPermissions) {
        await printer.requestPermissions();
      }
    } catch (e) {
      console.warn("Falha ao solicitar permissões Bluetooth:", e);
    }
  }

  async connectPrinter(address?: string): Promise<boolean> {
    await this.ensurePermissions();
    
    if (!Capacitor.isNativePlatform()) {
      console.warn('Impressão térmica só funciona em dispositivos nativos');
      return false;
    }

    try {
      const printer = BluetoothPrinter || window.BluetoothPrinter;
      if (!printer) {
        throw new Error('Plugin de impressora Bluetooth não disponível');
      }

      // If specific address provided, connect to it
      if (address) {
        const success = await printer.connect(address);
        if (success) {
          this.connected = true;
          // Store connected device info
          const savedDevice = localStorage.getItem('thermal_printer_device');
          if (savedDevice) {
            this.connectedDevice = JSON.parse(savedDevice);
          }
          return true;
        }
        return false;
      }

      // Otherwise, try to connect to saved device
      const savedDevice = localStorage.getItem('thermal_printer_device');
      if (savedDevice) {
        const device = JSON.parse(savedDevice);
        const success = await printer.connect(device.address);
        if (success) {
          this.connected = true;
          this.connectedDevice = device;
          return true;
        }
      }

      // List devices if no saved device or connection failed
      const devices = await printer.list();
      
      if (devices.length === 0) {
        throw new Error('Nenhuma impressora Bluetooth encontrada');
      }

      // Try to connect to first available device as fallback
      const device = devices[0];
      const success = await printer.connect(device.address);
      
      if (success) {
        this.connected = true;
        this.connectedDevice = device;
        // Save device for future connections
        localStorage.setItem('thermal_printer_device', JSON.stringify(device));
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Erro ao conectar impressora:', error);
      return false;
    }
  }

  async isConnected(): Promise<boolean> {
    const printer = BluetoothPrinter || window.BluetoothPrinter;
    if (!printer) return false;
    
    try {
      const connected = await printer.isConnected();
      this.connected = connected;
      return connected;
    } catch {
      this.connected = false;
      return false;
    }
  }

  async disconnect(): Promise<void> {
    const printer = BluetoothPrinter || window.BluetoothPrinter;
    if (printer && this.connected) {
      try {
        await printer.disconnect();
      } catch (error) {
        console.warn('Erro ao desconectar:', error);
      }
      this.connected = false;
      this.connectedDevice = null;
    }
  }

  // Função para centralizar texto em uma linha de 32 caracteres
  private centerText(text: string, width: number = 32): string {
    if (text.length >= width) return text.substring(0, width);
    const padding = Math.floor((width - text.length) / 2);
    return ' '.repeat(padding) + text + ' '.repeat(width - text.length - padding);
  }

  // Função para alinhar texto à direita
  private rightAlignText(text: string, width: number = 32): string {
    if (text.length >= width) return text.substring(0, width);
    return ' '.repeat(width - text.length) + text;
  }

  // Função para dividir texto entre esquerda e direita
  private splitText(left: string, right: string, width: number = 32): string {
    const totalLength = left.length + right.length;
    if (totalLength >= width) {
      return left.substring(0, width - right.length) + right;
    }
    const spaces = width - totalLength;
    return left + ' '.repeat(spaces) + right;
  }

  // Formatar preço brasileiro
  private formatPrice(value: number): string {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
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

      let printData = '';

      // Inicializar impressora
      printData += this.INIT;

      // Cabeçalho - Centralizado
      printData += this.CENTER;
      printData += this.BOLD_ON;
      printData += this.DOUBLE_HEIGHT;
      printData += 'Reciclagem Pereque' + this.LINE_FEED;
      printData += this.NORMAL_SIZE;
      printData += this.BOLD_OFF;
      
      printData += this.centerText('Ubatuba, Pereque Mirim,') + this.LINE_FEED;
      printData += this.centerText('Av Marginal, 2504') + this.LINE_FEED;
      printData += this.centerText('12 99162-0321') + this.LINE_FEED;
      printData += this.centerText('CNPJ/PIX - 45.492.161/0001-88') + this.LINE_FEED;
      
      // Linha separadora
      printData += this.centerText('--------------------------------') + this.LINE_FEED;
      printData += this.LINE_FEED;

      // Dados da comanda - Alinhado à esquerda
      printData += this.LEFT;
      printData += this.splitText('Comanda:', comanda.numero) + this.LINE_FEED;
      printData += this.splitText('Data:', comanda.data) + this.LINE_FEED;
      printData += this.splitText('Horario:', comanda.horario) + this.LINE_FEED;
      printData += this.splitText('Tipo:', comanda.tipo.toUpperCase()) + this.LINE_FEED;
      printData += this.LINE_FEED;

      // Linha separadora
      printData += this.centerText('--------------------------------') + this.LINE_FEED;

      // Cabeçalho dos itens
      printData += this.BOLD_ON;
      printData += 'Produto          Qtd x R$   Total' + this.LINE_FEED;
      printData += this.BOLD_OFF;
      
      // Itens
      comanda.itens.forEach(item => {
        const produto = item.produto.substring(0, 16).padEnd(16, ' ');
        const qtdPreco = `${item.quantidade}x ${this.formatPrice(item.precoUnitario)}`;
        const total = this.formatPrice(item.total);
        
        // Primeira linha: nome do produto
        printData += produto + this.LINE_FEED;
        
        // Segunda linha: quantidade x preço = total
        const qtdPrecoFormatted = qtdPreco.padEnd(16, ' ');
        const totalFormatted = this.rightAlignText(total, 16);
        printData += qtdPrecoFormatted + totalFormatted + this.LINE_FEED;
        printData += this.LINE_FEED;
      });

      // Linha separadora
      printData += this.centerText('--------------------------------') + this.LINE_FEED;

      // Total
      printData += this.BOLD_ON;
      printData += this.DOUBLE_HEIGHT;
      printData += this.splitText('TOTAL:', `R$ ${this.formatPrice(comanda.total)}`) + this.LINE_FEED;
      printData += this.NORMAL_SIZE;
      printData += this.BOLD_OFF;

      // Linha separadora
      printData += this.centerText('--------------------------------') + this.LINE_FEED;
      printData += this.LINE_FEED;

      // Rodapé - Centralizado
      printData += this.CENTER;
      printData += 'Obrigado' + this.LINE_FEED;
      printData += this.BOLD_ON;
      printData += 'DEUS SEJA LOUVADO!!!' + this.LINE_FEED;
      printData += this.BOLD_OFF;
      printData += this.LINE_FEED;
      printData += 'Versao 1.0' + this.LINE_FEED;
      printData += this.LINE_FEED;
      printData += this.LINE_FEED;

      // Cortar papel
      printData += this.CUT;

      // Enviar para impressora
      const printer = BluetoothPrinter || window.BluetoothPrinter;
      if (!printer) {
        throw new Error('Plugin de impressora não disponível');
      }

      const success = await printer.print(printData);
      return success;

    } catch (error) {
      console.error('Erro ao imprimir comanda:', error);
      throw error;
    }
  }

  async printTest(): Promise<boolean> {
    if (!this.connected) {
      throw new Error('Impressora não conectada');
    }

    const printer = BluetoothPrinter || window.BluetoothPrinter;
    if (!printer) {
      throw new Error('Plugin de impressora Bluetooth não disponível');
    }

    try {
      const testData = 
        this.INIT +
        this.CENTER +
        this.BOLD_ON +
        "TESTE DE IMPRESSÃO\n" +
        this.BOLD_OFF +
        this.LEFT +
        "\n" +
        "Data: " + new Date().toLocaleDateString('pt-BR') + "\n" +
        "Hora: " + new Date().toLocaleTimeString('pt-BR') + "\n" +
        "\n" +
        "Caracteres especiais:\n" +
        "ção, não, coração\n" +
        "Preço: R$ 123,45\n" +
        "\n" +
        this.CENTER +
        "✓ TESTE OK ✓\n" +
        "\n\n" +
        this.CUT;

      const success = await printer.print(testData);
      return success;
    } catch (error) {
      console.error('Erro no teste de impressão:', error);
      throw error;
    }
  }

  async listPrinters(): Promise<any[]> {
    await this.ensurePermissions();
    
    const printer = BluetoothPrinter || window.BluetoothPrinter;
    if (!printer) {
      throw new Error('Plugin de impressora Bluetooth não disponível');
    }
    
    try {
      return await printer.list();
    } catch (error) {
      console.error('Erro ao listar impressoras:', error);
      return [];
    }
  }
}

export const thermalPrinterService = new ThermalPrinterService();