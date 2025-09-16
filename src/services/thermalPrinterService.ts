import { Capacitor } from '@capacitor/core';
import { ComandaParaPDF } from './print/pdfService';

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

  async connectPrinter(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      console.warn('Impressão térmica só funciona em dispositivos nativos');
      return false;
    }

    try {
      if (!window.BluetoothPrinter) {
        throw new Error('Plugin de impressora Bluetooth não disponível');
      }

      // Listar dispositivos Bluetooth disponíveis
      const devices = await window.BluetoothPrinter.list();
      
      if (devices.length === 0) {
        throw new Error('Nenhuma impressora Bluetooth encontrada');
      }

      // Tentar conectar com a primeira impressora disponível
      // Em uma implementação real, você pode mostrar uma lista para o usuário escolher
      const device = devices[0];
      const success = await window.BluetoothPrinter.connect(device.address);
      
      if (success) {
        this.connected = true;
        this.connectedDevice = device;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Erro ao conectar impressora:', error);
      return false;
    }
  }

  async isConnected(): Promise<boolean> {
    if (!window.BluetoothPrinter) return false;
    
    try {
      return await window.BluetoothPrinter.isConnected();
    } catch {
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (window.BluetoothPrinter && this.connected) {
      await window.BluetoothPrinter.disconnect();
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
      if (!window.BluetoothPrinter) {
        throw new Error('Plugin de impressora não disponível');
      }

      const success = await window.BluetoothPrinter.print(printData);
      return success;

    } catch (error) {
      console.error('Erro ao imprimir comanda:', error);
      throw error;
    }
  }

  async listPrinters(): Promise<any[]> {
    if (!window.BluetoothPrinter) {
      throw new Error('Plugin de impressora Bluetooth não disponível');
    }
    
    return await window.BluetoothPrinter.list();
  }
}

export const thermalPrinterService = new ThermalPrinterService();