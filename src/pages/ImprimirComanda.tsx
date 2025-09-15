import { ArrowLeft, Download, Share, FileText } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useEffect, useState } from "react";
import { pdfService, ComandaParaPDF } from "@/services/print/pdfService";
import { toast } from "sonner";

const ImprimirComanda = () => {
  const navigate = useNavigate();
  const { comandaId } = useParams();
  const [comanda, setComanda] = useState<ComandaParaPDF | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadComanda = async () => {
      try {
        const comandaData = await pdfService.getComandaParaPDF(
          comandaId ? parseInt(comandaId) : undefined
        );
        setComanda(comandaData);
      } catch (error) {
        console.error('Erro ao carregar comanda:', error);
        toast.error('Erro ao carregar comanda');
      } finally {
        setLoading(false);
      }
    };

    loadComanda();
  }, [comandaId]);

  const handleDownloadPDF = async () => {
    try {
      const success = await pdfService.downloadComandaPDF(
        comandaId ? parseInt(comandaId) : undefined
      );
      
      if (success) {
        toast.success('PDF baixado com sucesso!');
      } else {
        toast.error('Erro ao gerar PDF');
      }
    } catch (error) {
      console.error('Erro ao baixar PDF:', error);
      toast.error('Erro ao baixar PDF');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando comanda...</p>
        </div>
      </div>
    );
  }

  if (!comanda) {
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
        <Button variant="outline" className="w-full h-12">
          <Share className="mr-2 h-5 w-5" />
          Compartilhar
        </Button>

        <Button variant="outline" className="w-full h-12">
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
              Use as opções acima para baixar o PDF, compartilhar ou imprimir a comanda.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ImprimirComanda;