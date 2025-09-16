import { ArrowLeft, Download, Share, FileText, Printer } from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useEffect, useState } from "react";
import { pdfService, ComandaParaPDF } from "@/services/print/pdfService";
import { thermalPrinterService } from "@/services/thermalPrinterService";
import { useComandasOffline } from "@/hooks/useComandasOffline";
import { Comanda } from "@/services/database";
import { toast } from "sonner";
import { formatarCodigoComanda } from "@/utils/comandaCode";

// Função para agrupar materiais iguais
const agruparMateriais = (itens: any[]) => {
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
};

// Função para converter comanda para formato PDF
const convertComandaToPDF = (comandaData: Comanda): ComandaParaPDF => {
  const comandaDate = new Date(comandaData.created_at || new Date());
  
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
  
  // Agrupar materiais iguais antes de criar o PDF
  const itensAgrupados = agruparMateriais(comandaData.itens || []);
  
  return {
    numero: formatarCodigoComanda(comandaData),
    data: formatDate(comandaDate),
    horario: formatTime(comandaDate),
    tipo: comandaData.tipo || 'venda',
    itens: itensAgrupados,
    total: comandaData.total || 0
  };
};

const ImprimirComanda = () => {
  const navigate = useNavigate();
  const { comandaId } = useParams();
  const location = useLocation();
  const { comandasCache, buscarComandaPorNumero, isOnline } = useComandasOffline();
  
  // Pegar comanda do state (passada do histórico) ou null
  const comandaInicial = location.state?.comanda ? 
    convertComandaToPDF(location.state.comanda) : null;
  
  const [comanda, setComanda] = useState<ComandaParaPDF | null>(comandaInicial);
  const [carregando, setCarregando] = useState(!comandaInicial);

  useEffect(() => {
    // Só busca do banco se não veio dados do state
    if (!comandaInicial) {
      const loadComanda = async () => {
        setCarregando(true);
        try {
          let comandaData: Comanda | null = null;

          if (comandaId) {
            // Buscar comanda específica por ID
            comandaData = comandasCache.find(c => c.id === parseInt(comandaId)) || null;
            
            // Se não encontrou no cache, tentar buscar por número
            if (!comandaData) {
              const numeroComanda = `COM-${String(comandaId).padStart(3, '0')}`;
              comandaData = await buscarComandaPorNumero(numeroComanda);
            }
          } else {
            // Buscar a última comanda finalizada
            const comandasFinalizadas = comandasCache
              .filter(c => c.status === 'finalizada')
              .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
            comandaData = comandasFinalizadas.length > 0 ? comandasFinalizadas[0] : null;
          }

          if (comandaData) {
            setComanda(convertComandaToPDF(comandaData));
          } else {
            setComanda(null);
          }
        } catch (error) {
          console.error('Erro ao carregar comanda:', error);
          toast.error('Erro ao carregar comanda');
          setComanda(null);
        } finally {
          setCarregando(false);
        }
      };

      // Carregar imediatamente se há dados ou se é uma comanda específica
      if (comandasCache.length > 0 || comandaId) {
        loadComanda();
      } else {
        setCarregando(false);
      }
    }
  }, [comandaId, comandasCache, buscarComandaPorNumero, comandaInicial]);

  const handleDownloadPDF = async () => {
    try {
      if (!comanda) {
        toast.error('Nenhuma comanda para gerar PDF');
        return;
      }

      const pdf = pdfService.generateComandaPDF(comanda);
      pdf.save(`comanda-${comanda.numero}.pdf`);
      
      toast.success('PDF baixado com sucesso!');
    } catch (error) {
      console.error('Erro ao baixar PDF:', error);
      toast.error('Erro ao baixar PDF');
    }
  };

  const handleWhatsAppShare = () => {
    if (!comanda) {
      toast.error('Nenhuma comanda para compartilhar');
      return;
    }

    const message = `*Comanda ${comanda.numero}*\n` +
      `Data: ${comanda.data} - ${comanda.horario}\n` +
      `Tipo: ${comanda.tipo.toUpperCase()}\n\n` +
      `*Itens:*\n` +
      comanda.itens.map(item => 
        `${item.produto}\n${item.quantidade}x R$ ${item.precoUnitario.toFixed(2)} = R$ ${item.total.toFixed(2)}`
      ).join('\n\n') +
      `\n\n*TOTAL: R$ ${comanda.total.toFixed(2)}*\n\n` +
      `_Reciclagem Pereque_\n` +
      `Ubatuba, Pereque Mirim, Av Marginal, 2504\n` +
      `12 99162-0321`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
  };

  const handlePrint = async () => {
    if (!comanda) {
      toast.error('Nenhuma comanda para imprimir');
      return;
    }

    try {
      toast.loading('Conectando à impressora...', { id: 'printer' });
      
      const success = await thermalPrinterService.printComanda(comanda);
      
      if (success) {
        toast.success('Comanda impressa com sucesso!', { id: 'printer' });
      } else {
        toast.error('Erro ao imprimir comanda', { id: 'printer' });
      }
    } catch (error) {
      console.error('Erro ao imprimir:', error);
      toast.error('Erro ao conectar com a impressora', { id: 'printer' });
    }
  };

  // Mostrar loading se ainda carregando
  if (!comanda && carregando) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" className="mr-3" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Carregando comanda...</h1>
        </div>
        
        <Card className="p-6 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
          <h3 className="text-lg font-semibold mb-2">Carregando dados da comanda</h3>
          <p className="text-muted-foreground">
            Aguarde enquanto buscamos os dados...
          </p>
        </Card>
      </div>
    );
  }

  // Mostrar erro se não encontrou depois de carregar
  if (!comanda && !carregando) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" className="mr-3" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Comanda não encontrada</h1>
        </div>
        
        <Card className="p-6 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhuma comanda encontrada</h3>
          <p className="text-muted-foreground">
            Não foi possível encontrar a comanda solicitada.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" className="mr-3" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Visualizar Comanda</h1>
      </div>

      {/* Preview da Comanda */}
      <Card className="mb-6 p-6 bg-white text-black max-w-sm mx-auto" style={{ fontFamily: 'monospace' }}>
        {/* Cabeçalho */}
        <div className="text-center mb-4">
          <h2 className="text-lg font-bold">Reciclagem Pereque</h2>
          <p className="text-sm">Ubatuba, Pereque Mirim, Av Marginal, 2504</p>
          <p className="text-sm">12 99162-0321</p>
          <p className="text-sm">CNPJ/PIX - 45.492.161/0001-88</p>
        </div>

        <Separator className="my-4 border-dashed border-black" />

        {/* Dados da Comanda */}
        <div className="space-y-1 text-sm mb-4">
          <div className="flex justify-between">
            <span>Comanda:</span>
            <span className="font-bold">{comanda.numero}</span>
          </div>
          <div className="flex justify-between">
            <span>Data:</span>
            <span>{comanda.data}</span>
          </div>
          <div className="flex justify-between">
            <span>Horário:</span>
            <span>{comanda.horario}</span>
          </div>
          <div className="flex justify-between">
            <span>Tipo:</span>
            <span className="uppercase">{comanda.tipo}</span>
          </div>
        </div>

        <Separator className="my-4 border-dashed border-black" />

        {/* Itens */}
        <div className="space-y-2 mb-4">
          {comanda.itens.map((item, index) => (
            <div key={index} className="text-sm">
              <div className="flex justify-between">
                <span>{item.produto}</span>
              </div>
              <div className="flex justify-between ml-2">
                <span>{item.quantidade}x R$ {item.precoUnitario.toFixed(2)}</span>
                <span className="font-bold">R$ {item.total.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

        <Separator className="my-4 border-dashed border-black" />

        {/* Total */}
        <div className="space-y-1 text-sm">
          <div className="flex justify-between font-bold text-base">
            <span>TOTAL:</span>
            <span>R$ {comanda.total.toFixed(2)}</span>
          </div>
        </div>

        <Separator className="my-4 border-dashed border-black" />

        {/* Rodapé */}
        <div className="text-center text-xs">
          <p>Obrigado</p>
          <p className="font-bold">DEUS SEJA LOUVADO!!!</p>
          <p className="mt-2">Versao 1.0</p>
        </div>
      </Card>

      {/* Ações */}
      <div className="space-y-3 max-w-sm mx-auto">
        <Button 
          variant="outline" 
          className="w-full h-12"
          onClick={handleWhatsAppShare}
        >
          <Share className="mr-2 h-5 w-5" />
          Compartilhar WhatsApp
        </Button>

        <Button 
          variant="outline" 
          className="w-full h-12"
          onClick={handlePrint}
        >
          <Printer className="mr-2 h-5 w-5" />
          Imprimir
        </Button>

        <Button 
          className="w-full h-12 bg-gradient-to-r from-primary to-primary/90"
          onClick={handleDownloadPDF}
        >
          <Download className="mr-2 h-5 w-5" />
          Baixar PDF
        </Button>
      </div>

      {/* Informações */}
      <Card className="mt-6 p-4 bg-gradient-to-r from-accent/5 to-primary/5">
        <div className="flex items-start">
          <FileText className="h-5 w-5 text-accent mr-3 mt-0.5" />
          <div>
            <h3 className="font-semibold text-foreground mb-2">
              {comandaId ? 'Comanda Selecionada' : 'Última Comanda'}
            </h3>
            <p className="text-sm text-muted-foreground">
              Status: {isOnline ? 'Online' : 'Offline'} • 
              Use as opções acima para baixar o PDF, compartilhar ou imprimir a comanda.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ImprimirComanda;