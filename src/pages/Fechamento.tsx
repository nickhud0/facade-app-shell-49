import { ArrowLeft, Calculator, DollarSign, FileText, Calendar, ChevronDown } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useState } from "react";
import { NetworkStatus } from "@/components/NetworkStatus";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { useFechamentoService } from "@/hooks/useFechamentoService";
import { LoadingSpinner, ErrorState, SummaryCard, PageWrapper } from "@/components/ui/loading-states";

// Mock histórico - em produção viria do servidor
const historicoFechamentos = [
  {
    id: 1,
    data: "28/02/2025",
    receitas: 1850.30,
    compras: 750.00,
    despesas: 120.00,
    lucro: 980.30,
    observacoes: "Vendas normais para o período"
  },
  {
    id: 2,
    data: "27/02/2025",
    receitas: 2200.80,
    compras: 900.00,
    despesas: 180.00,
    lucro: 1120.80,
    observacoes: "Fim de semana com movimento intenso"
  },
  {
    id: 3,
    data: "26/02/2025",
    receitas: 1680.50,
    compras: 650.00,
    despesas: 95.00,
    lucro: 935.50,
    observacoes: ""
  }
];

const Fechamento = () => {
  const navigate = useNavigate();
  const [observacoes, setObservacoes] = useState("");
  
  const { 
    dados: dadosAtual, 
    loading, 
    error, 
    hasData,
    refresh: refreshFechamento 
  } = useFechamentoService();

  const handleRealizarFechamento = async () => {
    // TODO: Implementar lógica de fechamento
    console.log('Realizando fechamento com observações:', observacoes);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" className="mr-3" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Fechamento</h1>
        </div>
        <NetworkStatus />
      </div>

      <PageWrapper 
        loading={loading} 
        error={error} 
        onRetry={refreshFechamento}
        loadingMessage="Carregando dados de fechamento..."
      >
        {/* Período Atual */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Período Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-6">
              Último fechamento: {dadosAtual.ultimoFechamento}
            </p>

            {/* Valores Consolidados */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 rounded-lg bg-success/10">
                  <span className="font-medium">Receitas (Vendas)</span>
                  <span className="font-bold text-lg text-success">
                    {formatCurrency(dadosAtual.receitas)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-3 rounded-lg bg-destructive/10">
                  <span className="font-medium">Compras</span>
                  <span className="font-bold text-lg text-destructive">
                    {formatCurrency(dadosAtual.compras)}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 rounded-lg bg-destructive/10">
                  <span className="font-medium">Despesas</span>
                  <span className="font-bold text-lg text-destructive">
                    {formatCurrency(dadosAtual.despesas)}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 rounded-lg bg-primary/10">
                  <span className="font-medium">Lucro Atual</span>
                  <span className="font-bold text-lg text-primary">
                    {formatCurrency(dadosAtual.lucroAtual)}
                  </span>
                </div>
              </div>
            </div>

            {/* Observações */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Observações (opcional)
              </label>
              <Textarea
                placeholder="Digite suas observações sobre este período..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="min-h-20"
              />
            </div>

            {/* Botão Realizar Fechamento */}
            <Button 
              className="w-full h-12"
              onClick={handleRealizarFechamento}
            >
              <Calculator className="mr-2 h-5 w-5" />
              Realizar Fechamento
            </Button>
          </CardContent>
        </Card>

        {/* Histórico de Fechamentos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Histórico de Fechamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {historicoFechamentos.map((fechamento) => (
                <AccordionItem 
                  key={fechamento.id} 
                  value={`item-${fechamento.id}`}
                  className="border-b"
                >
                  <AccordionTrigger className="flex justify-between items-center py-4 hover:no-underline">
                    <div className="flex justify-between items-center w-full mr-4">
                      <div className="flex flex-col items-start">
                        <span className="font-medium text-base">{formatDate(fechamento.data)}</span>
                        <span className="text-sm text-muted-foreground">
                          Lucro: {formatCurrency(fechamento.lucro)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-success font-medium">
                          {formatCurrency(fechamento.receitas)}
                        </span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="space-y-3 animate-fade-in">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Receitas:</span>
                            <span className="text-sm font-medium text-success">
                              {formatCurrency(fechamento.receitas)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Compras:</span>
                            <span className="text-sm font-medium text-destructive">
                              {formatCurrency(fechamento.compras)}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Despesas:</span>
                            <span className="text-sm font-medium text-destructive">
                              {formatCurrency(fechamento.despesas)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Lucro:</span>
                            <span className="text-sm font-semibold text-primary">
                              {formatCurrency(fechamento.lucro)}
                            </span>
                          </div>
                        </div>
                      </div>
                      {fechamento.observacoes && (
                        <>
                          <Separator className="my-3" />
                          <div>
                            <span className="text-sm text-muted-foreground block mb-1">Observações:</span>
                            <p className="text-sm">{fechamento.observacoes}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </PageWrapper>
    </div>
  );
};

export default Fechamento;