import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { logger } from '@/utils/logger';

/**
 * Compartilha o PDF da comanda diretamente no WhatsApp
 * @param pdfPath Caminho do arquivo PDF gerado
 * @param message Mensagem inicial para enviar junto
 */
export async function shareComandaWhatsApp(pdfPath: string, message: string) {
  try {
    if (!Capacitor.isNativePlatform()) {
      throw new Error('Compartilhamento só funciona em dispositivos nativos');
    }

    await Share.share({
      title: 'Comanda',
      text: message,
      url: pdfPath,
      dialogTitle: 'Compartilhar Comanda'
    });
  } catch (error) {
    logger.debug('Erro ao compartilhar no WhatsApp:', error);
    throw new Error('Erro ao compartilhar comanda');
  }
}

/**
 * Compartilha texto simples da comanda
 * @param comandaTexto Texto da comanda formatado
 * @param message Mensagem inicial
 */
export async function shareComandaTexto(comandaTexto: string, message: string = '') {
  try {
    const textoCompleto = message ? `${message}\n\n${comandaTexto}` : comandaTexto;
    
    await Share.share({
      title: 'Comanda',
      text: textoCompleto,
      dialogTitle: 'Compartilhar Comanda'
    });
  } catch (error) {
    logger.debug('Erro ao compartilhar texto:', error);
    throw new Error('Erro ao compartilhar comanda');
  }
}