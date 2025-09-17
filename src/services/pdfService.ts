import { pdfService as printPdfService, ComandaParaPDF } from '@/services/print/pdfService';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { logger } from '@/utils/logger';

/**
 * Gera PDF da comanda e salva no dispositivo
 * @param comanda Dados da comanda formatados para PDF
 * @returns Promise com o caminho/URI do arquivo salvo
 */
export async function gerarPDF(comanda: ComandaParaPDF): Promise<string> {
  try {
    // Gera o PDF usando o serviço existente
    const pdf = printPdfService.generateComandaPDF(comanda);
    const pdfBase64 = pdf.output('datauristring').split(',')[1];
    const fileName = `comanda_${comanda.numero}_${Date.now()}.pdf`;
    
    if (Capacitor.isNativePlatform()) {
      // Salva no dispositivo nativo usando Filesystem
      const result = await Filesystem.writeFile({
        path: fileName,
        data: pdfBase64,
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      });
      
      logger.debug('PDF salvo em:', result.uri);
      return result.uri;
    } else {
      // Fallback para web - usar blob URL
      const pdfBlob = pdf.output('blob');
      const pdfFile = new File([pdfBlob], fileName, { 
        type: 'application/pdf' 
      });
      return URL.createObjectURL(pdfFile);
    }
  } catch (error) {
    logger.debug('Erro ao gerar PDF:', error);
    throw new Error('Falha ao gerar PDF da comanda');
  }
}

/**
 * Abre PDF no visualizador do sistema
 * @param uri Caminho do arquivo PDF
 */
export async function abrirPDF(uri: string): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      // No Android/iOS, usa Share para abrir/compartilhar o arquivo
      const { Share } = await import('@capacitor/share');
      await Share.share({
        title: 'Comanda (PDF)',
        text: 'Abrir ou Compartilhar PDF',
        url: uri,
        dialogTitle: 'Abrir/Compartilhar Comanda'
      });
    } else {
      // Na web, abre em nova aba
      window.open(uri, '_blank');
    }
  } catch (error) {
    logger.debug('Erro ao abrir/compartilhar PDF:', error);
    throw new Error('Erro ao abrir/compartilhar PDF');
  }
}