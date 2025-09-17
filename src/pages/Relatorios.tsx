import { ArrowLeft, Calendar as CalendarIcon, RefreshCw, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { formatCurrency, formatWeight, formatDate } from '@/utils/formatters';
import { SobrasPopup } from "@/components/SobrasPopup";
import { LoadingSpinner, ErrorState, PageWrapper, OfflineBanner } from "@/components/ui/loading-states";
import { useTransacoes } from "@/hooks/useStandardData";
import { networkService } from "@/services/networkService";


const Relatorios = () => {
  const navigate = useNavigate();
  const [dataInicio, setDataInicio] = useState<Date>();
  const [dataFim, setDataFim] = useState<Date>();
  const [isOnline, setIsOnline] = useState(networkService.getConnectionStatus());
  
  const { 
    transacoes, 
    loading, 
    error, 
    refreshTransacoes,
    hasData
  } = useTransacoes(1000);

  // Processar dados reais das transações
  const processarDados = (filtroTipo?: 'dia' | 'mes' | 'ano', inicio?: Date, fim?: Date) => {
    let transacoesFiltradas = transacoes;
    
    if (filtroTipo === 'dia') {
      const hoje = new Date();
      transacoesFiltradas = transacoes.filter(t => {
        const dataTransacao = new Date(t.created_at);
        return dataTransacao.toDateString() === hoje.toDateString();
      });
    } else if (filtroTipo === 'mes') {
      const agora = new Date();
      transacoesFiltradas = transacoes.filter(t => {
        const dataTransacao = new Date(t.created_at);
        return dataTransacao.getMonth() === agora.getMonth() && 
               dataTransacao.getFullYear() === agora.getFullYear();
      });
    } else if (filtroTipo === 'ano') {
      const agora = new Date();
      transacoesFiltradas = transacoes.filter(t => {
        const dataTransacao = new Date(t.created_at);
        return dataTransacao.getFullYear() === agora.getFullYear();
      });
    } else if (inicio && fim) {
      transacoesFiltradas = transacoes.filter(t => {
        const dataTransacao = new Date(t.created_at);
        return dataTransacao >= inicio && dataTransacao <= fim;
      });
    }

    const compras = transacoesFiltradas.filter(t => t.tipo === 'compra');
    const vendas = transacoesFiltradas.filter(t => t.tipo === 'venda');
    
    const totalCompras = compras.reduce((acc, t) => acc + t.valor_total, 0);
    const totalVendas = vendas.reduce((acc, t) => acc + t.valor_total, 0);
    const lucro = totalVendas - totalCompras;

    return {
      totalCompras,
      totalVendas,
      totalDespesas: 0, // TODO: Implementar quando houver despesas
      lucro,
      comprasPorMaterial:  compras.reduce((acc, t) => {
        const existing = acc.find(item => item.material === `Material ${t.material_id}`);
        if (existing) {
          existing.kg += t.peso;
          existing.valor += t.valor_total;
        } else {
          acc.push({ material: `Material ${t.material_id}`, kg: t.peso, valor: t.valor_total });
        }
        return acc;
      }, [] as any[]),
      vendasPorMaterial: vendas.reduce((acc, t) => {
        const existing = acc.find(item => item.material === `Material ${t.material_id}`);
        if (existing) {
          existing.kg += t.peso;
          existing.valor += t.valor_total;
        } else {
          acc.push({ material: `Material ${t.material_id}`, kg: t.peso, valor: t.valor_total });
        }
        return acc;
      }, [] as any[])
    };
  };

  const renderTotais = (dados: any) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <Card className="p-3 text-center bg-warning/10">
        <p className="text-xs font-medium text-muted-foreground mb-1">Total Compras</p>
        <p className="text-lg md:text-xl font-semibold text-foreground">{formatCurrency(dados.totalCompras)}</p>
      </Card>
      <Card className="p-3 text-center bg-success/10">
        <p className="text-xs font-medium text-muted-foreground mb-1">Total Vendas</p>
        <p className="text-lg md:text-xl font-semibold text-foreground">{formatCurrency(dados.totalVendas)}</p>
      </Card>
      <Card className="p-3 text-center bg-destructive/10">
        <p className="text-xs font-medium text-muted-foreground mb-1">Total Despesas</p>
        <p className="text-lg md:text-xl font-semibold text-foreground">{formatCurrency(dados.totalDespesas)}</p>
      </Card>
      <Card className="p-3 text-center bg-primary/10">
        <p className="text-xs font-medium text-muted-foreground mb-1">Lucro</p>
        <p className="text-lg md:text-xl font-semibold text-foreground">{formatCurrency(dados.lucro)}</p>
      </Card>
    </div>
  );

  const renderTabelas = (dados: any) => (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="p-4">
        <h3 className="font-semibold text-foreground mb-4">Compras por Material</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Material</TableHead>
              <TableHead className="text-center">Kg</TableHead>
              <TableHead className="text-right">R$</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dados.comprasPorMaterial.map((item, index) => (
              <TableRow key={index}>
                <TableCell>{item.material}</TableCell>
                 <TableCell className="text-center font-semibold">{formatWeight(item.kg).replace(' kg', '')}</TableCell>
                <TableCell className="text-right font-semibold text-success">{formatCurrency(item.valor)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold text-foreground mb-4">Vendas por Material</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Material</TableHead>
              <TableHead className="text-center">Kg</TableHead>
              <TableHead className="text-right">R$</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dados.vendasPorMaterial.map((item, index) => (
              <TableRow key={index}>
                <TableCell>{item.material}</TableCell>
                 <TableCell className="text-center font-semibold">{formatWeight(item.kg).replace(' kg', '')}</TableCell>
                <TableCell className="text-right font-semibold text-success">{formatCurrency(item.valor)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" className="mr-3" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={refreshTransacoes}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Banner Offline */}
      {!isOnline && <OfflineBanner />}

      <PageWrapper 
        loading={loading} 
        error={error} 
        onRetry={refreshTransacoes}
        loadingMessage="Carregando dados dos relatórios..."
      >

      <Tabs defaultValue="diario" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="diario">Diário</TabsTrigger>
          <TabsTrigger value="mensal">Mensal</TabsTrigger>
          <TabsTrigger value="anual">Anual</TabsTrigger>
          <TabsTrigger value="personalizado">Personalizado</TabsTrigger>
        </TabsList>

        <TabsContent value="diario" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Relatório Diário - {formatDate(new Date())}</h2>
            <SobrasPopup periodo="diario" />
          </div>
          {(() => {
            const dadosDiarios = processarDados('dia');
            return (
              <>
                {renderTotais(dadosDiarios)}
                {renderTabelas(dadosDiarios)}
              </>
            );
          })()}
        </TabsContent>

        <TabsContent value="mensal" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Relatório Mensal - {format(new Date(), "MM/yyyy")}</h2>
            <SobrasPopup periodo="mensal" />
          </div>
          {(() => {
            const dadosMensais = processarDados('mes');
            return (
              <>
                {renderTotais(dadosMensais)}
                {renderTabelas(dadosMensais)}
              </>
            );
          })()}
        </TabsContent>

        <TabsContent value="anual" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Relatório Anual - {format(new Date(), "yyyy")}</h2>
            <SobrasPopup periodo="anual" />
          </div>
          {(() => {
            const dadosAnuais = processarDados('ano');
            return (
              <>
                {renderTotais(dadosAnuais)}
                {renderTabelas(dadosAnuais)}
              </>
            );
          })()}
        </TabsContent>

        <TabsContent value="personalizado" className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium">Data Início</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[200px] justify-start text-left font-normal",
                      !dataInicio && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataInicio ? format(dataInicio, "dd/MM/yyyy") : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dataInicio}
                    onSelect={setDataInicio}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium">Data Fim</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[200px] justify-start text-left font-normal",
                      !dataFim && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataFim ? format(dataFim, "dd/MM/yyyy") : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dataFim}
                    onSelect={setDataFim}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {dataInicio && dataFim ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">
                  Relatório Personalizado - {format(dataInicio, "dd/MM/yyyy")} até {format(dataFim, "dd/MM/yyyy")}
                </h2>
                <SobrasPopup periodo="personalizado" dataInicio={dataInicio} dataFim={dataFim} />
              </div>
              {(() => {
                const dadosPersonalizados = processarDados(undefined, dataInicio, dataFim);
                const temDados = dadosPersonalizados.comprasPorMaterial.length > 0 || 
                                dadosPersonalizados.vendasPorMaterial.length > 0 || 
                                dadosPersonalizados.totalVendas > 0 || 
                                dadosPersonalizados.totalCompras > 0;
                
                if (!temDados) {
                  return (
                    <Card className="p-6 text-center">
                      <p className="text-muted-foreground">
                        Nenhuma transação encontrada para o período selecionado.
                      </p>
                    </Card>
                  );
                }
                
                return (
                  <>
                    {renderTotais(dadosPersonalizados)}
                    {renderTabelas(dadosPersonalizados)}
                  </>
                );
              })()}
            </>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Selecione as datas para gerar o relatório personalizado</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      </PageWrapper>
    </div>
  );
};

export default Relatorios;