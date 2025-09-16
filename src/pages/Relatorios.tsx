import { ArrowLeft, Calendar as CalendarIcon, RefreshCw } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState, useEffect } from "react";
import { logger } from '@/utils/logger';
import { notifyError } from '@/utils/errorHandler';
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useRelatorios, RelatorioPeriodo } from "@/hooks/useRelatorios";


const Relatorios = () => {
  const navigate = useNavigate();
  const [dataInicio, setDataInicio] = useState<Date>();
  const [dataFim, setDataFim] = useState<Date>();
  const { 
    relatorioDiario, 
    relatorioMensal, 
    relatorioAnual, 
    relatorioPersonalizado, 
    refreshData,
    hasData 
  } = useRelatorios();

  useEffect(() => {
    logger.debug('🔄 Carregando dados dos relatórios...');
    logger.debug('📊 hasData:', hasData, 'relatorioDiario:', relatorioDiario);
    refreshData();
  }, [hasData]);

  const renderTotais = (dados: RelatorioPeriodo) => {
    logger.debug('📈 Renderizando totais:', dados);
    return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <Card className="p-3 text-center bg-warning-light">
        <p className="text-xs font-medium text-muted-foreground mb-1">Total Compras</p>
        <p className="text-lg md:text-xl font-semibold text-black">R$ {dados.totalCompras.toFixed(2)}</p>
      </Card>
      <Card className="p-3 text-center bg-success-light">
        <p className="text-xs font-medium text-muted-foreground mb-1">Total Vendas</p>
        <p className="text-lg md:text-xl font-semibold text-black">R$ {dados.totalVendas.toFixed(2)}</p>
      </Card>
      <Card className="p-3 text-center bg-destructive-light">
        <p className="text-xs font-medium text-muted-foreground mb-1">Total Despesas</p>
        <p className="text-lg md:text-xl font-semibold text-black">R$ {dados.totalDespesas.toFixed(2)}</p>
      </Card>
      <Card className="p-3 text-center bg-success-light">
        <p className="text-xs font-medium text-muted-foreground mb-1">Lucro</p>
        <p className="text-lg md:text-xl font-semibold text-black">R$ {dados.lucro.toFixed(2)}</p>
      </Card>
    </div>
     );
  };

  const renderTabelas = (dados: RelatorioPeriodo) => (
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
                <TableCell className="text-center font-semibold">{item.kg.toFixed(1)}</TableCell>
                <TableCell className="text-right font-semibold text-success">{item.valor.toFixed(2)}</TableCell>
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
                <TableCell className="text-center font-semibold">{item.kg.toFixed(1)}</TableCell>
                <TableCell className="text-right font-semibold text-success">{item.valor.toFixed(2)}</TableCell>
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
        <Button 
          variant="outline" 
          size="sm"
          onClick={refreshData}
          className="ml-auto"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <Tabs defaultValue="diario" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="diario">Diário</TabsTrigger>
          <TabsTrigger value="mensal">Mensal</TabsTrigger>
          <TabsTrigger value="anual">Anual</TabsTrigger>
          <TabsTrigger value="personalizado">Personalizado</TabsTrigger>
        </TabsList>

        <TabsContent value="diario" className="space-y-6">
          <h2 className="text-lg font-semibold text-foreground">Relatório Diário - {format(new Date(), "dd/MM/yyyy")}</h2>
          {renderTotais({
            totalCompras: 2450.80,
            totalVendas: 3120.50,
            totalDespesas: 380.00,
            lucro: 289.70,
            comprasPorMaterial: [
              { material: "Cobre Limpo", kg: 45.2, valor: 1260.60 },
              { material: "Ferro Velho", kg: 120.8, valor: 362.40 },
              { material: "Alumínio", kg: 78.5, valor: 827.80 }
            ],
            vendasPorMaterial: [
              { material: "Cobre Limpo", kg: 38.5, valor: 1232.00 },
              { material: "Ferro Velho", kg: 95.2, valor: 476.00 },
              { material: "Alumínio", kg: 62.8, valor: 1412.50 }
            ]
          })}
          {renderTabelas({
            totalCompras: 2450.80,
            totalVendas: 3120.50,
            totalDespesas: 380.00,
            lucro: 289.70,
            comprasPorMaterial: [
              { material: "Cobre Limpo", kg: 45.2, valor: 1260.60 },
              { material: "Ferro Velho", kg: 120.8, valor: 362.40 },
              { material: "Alumínio", kg: 78.5, valor: 827.80 }
            ],
            vendasPorMaterial: [
              { material: "Cobre Limpo", kg: 38.5, valor: 1232.00 },
              { material: "Ferro Velho", kg: 95.2, valor: 476.00 },
              { material: "Alumínio", kg: 62.8, valor: 1412.50 }
            ]
          })}
        </TabsContent>

        <TabsContent value="mensal" className="space-y-6">
          <h2 className="text-lg font-semibold text-foreground">Relatório Mensal - {format(new Date(), "MMMM/yyyy")}</h2>
          {renderTotais({
            totalCompras: 18450.30,
            totalVendas: 22180.75,
            totalDespesas: 2840.50,
            lucro: 889.95,
            comprasPorMaterial: [
              { material: "Cobre Limpo", kg: 285.4, valor: 7985.20 },
              { material: "Ferro Velho", kg: 850.6, valor: 2551.80 },
              { material: "Alumínio", kg: 420.8, valor: 4205.50 },
              { material: "Aço Inox", kg: 156.2, valor: 3707.80 }
            ],
            vendasPorMaterial: [
              { material: "Cobre Limpo", kg: 252.8, valor: 8089.60 },
              { material: "Ferro Velho", kg: 724.5, valor: 3622.50 },
              { material: "Alumínio", kg: 358.9, valor: 6439.20 },
              { material: "Aço Inox", kg: 132.1, valor: 4029.45 }
            ]
          })}
          {renderTabelas({
            totalCompras: 18450.30,
            totalVendas: 22180.75,
            totalDespesas: 2840.50,
            lucro: 889.95,
            comprasPorMaterial: [
              { material: "Cobre Limpo", kg: 285.4, valor: 7985.20 },
              { material: "Ferro Velho", kg: 850.6, valor: 2551.80 },
              { material: "Alumínio", kg: 420.8, valor: 4205.50 },
              { material: "Aço Inox", kg: 156.2, valor: 3707.80 }
            ],
            vendasPorMaterial: [
              { material: "Cobre Limpo", kg: 252.8, valor: 8089.60 },
              { material: "Ferro Velho", kg: 724.5, valor: 3622.50 },
              { material: "Alumínio", kg: 358.9, valor: 6439.20 },
              { material: "Aço Inox", kg: 132.1, valor: 4029.45 }
            ]
          })}
        </TabsContent>

        <TabsContent value="anual" className="space-y-6">
          <h2 className="text-lg font-semibold text-foreground">Relatório Anual - {format(new Date(), "yyyy")}</h2>
          {renderTotais({
            totalCompras: 185420.80,
            totalVendas: 248650.90,
            totalDespesas: 28940.30,
            lucro: 34289.80,
            comprasPorMaterial: [
              { material: "Cobre Limpo", kg: 2854.6, valor: 79928.80 },
              { material: "Ferro Velho", kg: 8506.2, valor: 25518.60 },
              { material: "Alumínio", kg: 4208.9, valor: 42089.50 },
              { material: "Aço Inox", kg: 1562.4, valor: 37884.90 }
            ],
            vendasPorMaterial: [
              { material: "Cobre Limpo", kg: 2528.4, valor: 80908.80 },
              { material: "Ferro Velho", kg: 7245.8, valor: 36229.00 },
              { material: "Alumínio", kg: 3589.6, valor: 64392.80 },
              { material: "Aço Inox", kg: 1321.2, valor: 67120.30 }
            ]
          })}
          {renderTabelas({
            totalCompras: 185420.80,
            totalVendas: 248650.90,
            totalDespesas: 28940.30,
            lucro: 34289.80,
            comprasPorMaterial: [
              { material: "Cobre Limpo", kg: 2854.6, valor: 79928.80 },
              { material: "Ferro Velho", kg: 8506.2, valor: 25518.60 },
              { material: "Alumínio", kg: 4208.9, valor: 42089.50 },
              { material: "Aço Inox", kg: 1562.4, valor: 37884.90 }
            ],
            vendasPorMaterial: [
              { material: "Cobre Limpo", kg: 2528.4, valor: 80908.80 },
              { material: "Ferro Velho", kg: 7245.8, valor: 36229.00 },
              { material: "Alumínio", kg: 3589.6, valor: 64392.80 },
              { material: "Aço Inox", kg: 1321.2, valor: 67120.30 }
            ]
          })}
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
              <h2 className="text-lg font-semibold text-foreground">
                Relatório Personalizado - {format(dataInicio, "dd/MM/yyyy")} até {format(dataFim, "dd/MM/yyyy")}
              </h2>
              {(() => {
                const dadosPersonalizados = relatorioPersonalizado(dataInicio, dataFim);
                const temDados = dadosPersonalizados.comprasPorMaterial.length > 0 || 
                                dadosPersonalizados.vendasPorMaterial.length > 0 || 
                                dadosPersonalizados.totalDespesas > 0;
                
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
    </div>
  );
};

export default Relatorios;