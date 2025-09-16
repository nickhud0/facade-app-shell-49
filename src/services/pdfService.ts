import { pdfService as printPdfService, ComandaParaPDF } from '@/services/print/pdfService';

/**
 * Gera PDF da comanda e retorna o caminho/URL do arquivo
 * @param comanda Dados da comanda formatados para PDF
 * @returns Promise com o URL do PDF gerado
 */
export async function gerarPDF(comanda: ComandaParaPDF): Promise<string> {
  try {
    // Gera o PDF usando o serviço existente
    const pdf = printPdfService.generateComandaPDF(comanda);
    const pdfBlob = pdf.output('blob');
    
    // Cria arquivo temporário para compartilhar
    const pdfFile = new File([pdfBlob], `comanda-${comanda.numero}.pdf`, { 
      type: 'application/pdf' 
    });
    
    // Retorna URL do arquivo para compartilhamento
    return URL.createObjectURL(pdfFile);
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    throw new Error('Falha ao gerar PDF da comanda');
  }
}