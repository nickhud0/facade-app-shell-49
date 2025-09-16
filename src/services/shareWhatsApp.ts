import { Share } from '@capacitor/share';

/**
 * Compartilha o PDF da comanda diretamente no WhatsApp
 * @param pdfPath Caminho do arquivo PDF gerado
 * @param message Mensagem inicial para enviar junto
 */
export async function shareComandaWhatsApp(pdfPath: string, message: string) {
  try {
    await Share.share({
      title: 'Comanda',
      text: message,
      url: pdfPath,
      dialogTitle: 'Compartilhar via WhatsApp'
    });
  } catch (e) {
    console.error('Erro ao compartilhar no WhatsApp', e);
    throw e;
  }
}