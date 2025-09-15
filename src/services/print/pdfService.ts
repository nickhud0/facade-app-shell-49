import jsPDF from 'jspdf';
import { databaseV2Service } from '../databaseV2';
import { supabaseService } from '../supabase';
import { networkService } from '../networkService';
import { formatarCodigoComanda } from '@/utils/comandaCode';

export interface ComandaParaPDF {
  numero: string;
  data: string;
  horario: string;
  tipo: 'venda' | 'compra';
  itens: Array<{
    produto: string;
    quantidade: number;
    precoUnitario: number;
    total: number;
  }>;
  total: number;
}

export const pdfService = {
  // Função para agrupar materiais iguais
  agruparMateriais(itens: any[]) {
    const materiaisAgrupados = new Map();
    
    itens.forEach(item => {
      const nomeMaterial = item.material_nome || item.material || item.produto || 'Item';
      const preco = item.preco || item.precoUnitario || 0;
      const quantidade = item.quantidade || 1;
      
      if (materiaisAgrupados.has(nomeMaterial)) {
        const itemExistente = materiaisAgrupados.get(nomeMaterial);
        itemExistente.quantidade += quantidade;
        itemExistente.total = itemExistente.quantidade * itemExistente.precoUnitario;
      } else {
        materiaisAgrupados.set(nomeMaterial, {
          produto: nomeMaterial,
          quantidade: quantidade,
          precoUnitario: preco,
          total: quantidade * preco
        });
      }
    });
    
    return Array.from(materiaisAgrupados.values());
  },

  async getComandaParaPDF(comandaId?: number): Promise<ComandaParaPDF | null> {
    try {
      let comanda;
      
      if (comandaId) {
        // Buscar comanda específica
        comanda = await databaseV2Service.getComandaWithItens(comandaId);
      } else {
        // Buscar última comanda finalizada
        const comandas = await databaseV2Service.getComandasRecentes(1);
        comanda = comandas.length > 0 ? comandas[0] : null;
      }

      if (!comanda) {
        // Se não encontrou localmente e está online, tentar buscar do servidor
        if (networkService.getConnectionStatus()) {
          const { data } = await supabaseService.client
            .from('comandas')
            .select(`
              *,
              comanda_itens (*)
            `)
            .eq('status', 'finalizada')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          if (data) {
            comanda = {
              ...data,
              itens: data.comanda_itens || []
            };
          }
        }
      }

      if (!comanda) return null;

      // Converter para formato do PDF
      const comandaDate = new Date(comanda.created_at || new Date());
      
      // Garantir formato brasileiro DD/MM/YYYY HH:MM
      const formatDate = (date: Date) => {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      };
      
      const formatTime = (date: Date) => {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
      };
      
      // Agrupar materiais iguais antes de retornar
      const itensAgrupados = this.agruparMateriais(comanda.itens || []);
      
      return {
        numero: formatarCodigoComanda(comanda),
        data: formatDate(comandaDate),
        horario: formatTime(comandaDate),
        tipo: comanda.tipo || 'venda',
        itens: itensAgrupados,
        total: comanda.total || 0
      };
    } catch (error) {
      console.error('Erro ao buscar comanda para PDF:', error);
      return null;
    }
  },

  generateComandaPDF(comandaData: ComandaParaPDF): jsPDF {
    // Calcular altura dinâmica baseada no conteúdo
    const lineHeight = 3;
    const nItens = (comandaData.itens || []).length;
    
    // Estimar linhas necessárias
    const headerLines = 4; // Cabeçalho da empresa (ajustado)
    const metaLines = 4; // Dados da comanda
    const separatorLines = 3; // Separadores
    const footerLines = 3; // Rodapé
    const perItemLines = 3; // Média de linhas por item (nome + quantidade/preço)
    const totalLines = 1; // Linha do total
    
    const estimatedLines = headerLines + metaLines + separatorLines + footerLines + totalLines + (perItemLines * nItens);
    const pageHeight = Math.max(80, 10 + (estimatedLines * lineHeight) + 15); // Margem extra
    
    // Configurar PDF para papel 58mm com altura dinâmica
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [58, pageHeight]
    });

    // Configurar fonte para melhor qualidade
    pdf.setFont('courier', 'normal');
    
    let currentY = 5;
    const pageWidth = 58;
    const margin = 2;
    const contentWidth = pageWidth - (margin * 2);

    // Função para adicionar texto centralizado
    const addCenteredText = (text: string, fontSize: number = 8) => {
      pdf.setFontSize(fontSize);
      const textWidth = pdf.getTextWidth(text);
      const x = (pageWidth - textWidth) / 2;
      pdf.text(text, x, currentY);
      currentY += lineHeight;
    };

    // Função para adicionar texto justificado
    const addJustifiedText = (left: string, right: string, fontSize: number = 8) => {
      pdf.setFontSize(fontSize);
      const rightWidth = pdf.getTextWidth(right);
      pdf.text(left, margin, currentY);
      pdf.text(right, pageWidth - margin - rightWidth, currentY);
      currentY += lineHeight;
    };

    // Função para adicionar linha separadora
    const addSeparator = () => {
      currentY += 1;
      pdf.text(''.padEnd(Math.floor(contentWidth / 1.2), '-'), margin, currentY);
      currentY += lineHeight;
    };

    // Cabeçalho
    addCenteredText('Reciclagem Pereque', 9);
    addCenteredText('Ubatuba, Pereque Mirim', 7);
    addCenteredText('Av Marginal, 2504', 7);
    addCenteredText('12 99162-0321', 7);
    addCenteredText('CNPJ/PIX', 7);
    addCenteredText('45.492.161/0001-88', 7);
    
    addSeparator();

    // Dados da comanda
    addJustifiedText('Comanda:', comandaData.numero);
    addJustifiedText('Data:', comandaData.data);
    addJustifiedText('Horario:', comandaData.horario);
    addJustifiedText('Tipo:', comandaData.tipo.toUpperCase());
    
    addSeparator();

    // Itens
    comandaData.itens.forEach(item => {
      // Nome do produto (pode quebrar linha se muito longo)
      pdf.setFontSize(8);
      const produtoLines = pdf.splitTextToSize(item.produto, contentWidth);
      produtoLines.forEach((line: string) => {
        pdf.text(line, margin, currentY);
        currentY += lineHeight;
      });
      
      // Quantidade x Preço = Total
      const itemLine = `${item.quantidade}x R$ ${item.precoUnitario.toFixed(2)}`;
      const totalText = `R$ ${item.total.toFixed(2)}`;
      addJustifiedText(itemLine, totalText);
      currentY += 1; // Espaço extra entre itens
    });

    addSeparator();

    // Total
    addJustifiedText('TOTAL:', `R$ ${comandaData.total.toFixed(2)}`, 10);
    
    addSeparator();

    // Rodapé
    currentY += 2;
    addCenteredText('Obrigado');
    addCenteredText('DEUS SEJA LOUVADO!!!');
    addCenteredText('Versao 1.0', 7);

    return pdf;
  },

  async downloadComandaPDF(comandaId?: number): Promise<boolean> {
    try {
      const comandaData = await this.getComandaParaPDF(comandaId);
      
      if (!comandaData) {
        throw new Error('Comanda não encontrada');
      }

      const pdf = this.generateComandaPDF(comandaData);
      
      // Baixar o PDF
      pdf.save(`comanda-${comandaData.numero}.pdf`);
      
      return true;
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      return false;
    }
  }
};