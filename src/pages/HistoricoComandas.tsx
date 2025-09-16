import { ArrowLeft, Search, FileText, Calendar, ShoppingCart, ShoppingBag, CalendarIcon, Printer, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useComandasOffline } from "@/hooks/useComandasOffline";
import { formatarCodigoComanda } from "@/utils/comandaCode";
import { getSyncIcon, getSyncTooltip, getSyncIconColor } from "@/utils/syncStatus";

// Dados mock para histórico de comandas
const comandasMock = [
  {
    id: 1,
    numero: "COM-001",
    data: "2024-01-15",
    horario: "14:30",
    total: 45.50,
    itens: 5,
    status: "Finalizada",
    cliente: "Mesa 1",
    tipo: "venda",
    materiais: [
      { nome: "Hambúrguer Clássico", quantidade: 2, preco: 18.50 },
      { nome: "Batata Frita", quantidade: 1, preco: 8.50 }
    ]
  },
  {
    id: 2,
    numero: "COM-002",
    data: "2024-01-15",
    horario: "13:15",
    total: 78.90,
    itens: 7,
    status: "Finalizada",
    cliente: "Balcão",
    tipo: "venda",
    materiais: [
      { nome: "Pizza Margherita", quantidade: 1, preco: 35.90 },
      { nome: "Refrigerante", quantidade: 2, preco: 6.50 },
      { nome: "Sobremesa", quantidade: 4, preco: 7.50 }
    ]
  },
  {
    id: 3,
    numero: "COM-003",
    data: "2024-01-14",
    horario: "19:20",
    total: 123.40,
    itens: 12,
    status: "Cancelada",
    cliente: "Mesa 3",
    tipo: "venda",
    materiais: [
      { nome: "Combo Executivo", quantidade: 3, preco: 28.90 },
      { nome: "Bebida Premium", quantidade: 3, preco: 12.50 }
    ]
  },
  {
    id: 4,
    numero: "COM-004",
    data: "2024-01-14",
    horario: "18:45",
    total: 67.80,
    itens: 4,
    status: "Finalizada",
    cliente: "Delivery",
    tipo: "venda",
    materiais: [
      { nome: "Sanduíche Especial", quantidade: 2, preco: 22.90 },
      { nome: "Suco Natural", quantidade: 2, preco: 11.00 }
    ]
  },
  {
    id: 5,
    numero: "COMP-001",
    data: "2024-01-13",
    horario: "09:30",
    total: 250.00,
    itens: 15,
    status: "Finalizada",
    cliente: "Fornecedor ABC",
    tipo: "compra",
    materiais: [
      { nome: "Carne Bovina", quantidade: 5, preco: 35.00 },
      { nome: "Pão de Hambúrguer", quantidade: 50, preco: 0.80 },
      { nome: "Queijo Cheddar", quantidade: 2, preco: 25.00 }
    ]
  },
  {
    id: 6,
    numero: "COMP-002",
    data: "2024-01-12",
    horario: "14:15",
    total: 180.50,
    itens: 8,
    status: "Finalizada",
    cliente: "Distribuidora XYZ",
    tipo: "compra",
    materiais: [
      { nome: "Refrigerantes", quantidade: 24, preco: 4.50 },
      { nome: "Guardanapos", quantidade: 10, preco: 7.25 }
    ]
  }
];

const HistoricoComandas = () => {
  const navigate = useNavigate();
  const [termoBusca, setTermoBusca] = useState("");
  // Removido filtros avançados - busca unificada
  
  const {
    comandasCache,
    loadingCache,
    resultadosBusca,
    loadingBusca,
    isOnline,
    pendingSyncCount,
    buscarComandas,
    refreshCache,
    syncPendingComandas
  } = useComandasOffline();

  // Determinar quais comandas mostrar
  const comandasExibidas = termoBusca.trim() ? resultadosBusca : comandasCache;

  const handleBuscar = async () => {
    await buscarComandas(termoBusca);
  };

  const handleSyncPending = async () => {
    await syncPendingComandas();
  };

  useEffect(() => {
    buscarComandas("");
  }, [buscarComandas]);

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" className="mr-3" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Histórico de Comandas</h1>
        </div>
        
        <div className="flex items-center gap-2">
          {pendingSyncCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {pendingSyncCount} pendente{pendingSyncCount > 1 ? 's' : ''}
            </Badge>
          )}
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={isOnline ? handleSyncPending : refreshCache}
            disabled={loadingCache || loadingBusca}
          >
            <RefreshCw className={cn("h-4 w-4", (loadingCache || loadingBusca) && "animate-spin")} />
          </Button>
          
          {isOnline ? (
            <Wifi className="h-4 w-4 text-success" />
          ) : (
            <WifiOff className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Busca e Filtros */}
      <div className="space-y-4 mb-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder={isOnline ? "Buscar no histórico completo..." : "Buscar nas últimas 20 comandas..."} 
              className="pl-10"
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
            />
          </div>
          <Button 
            onClick={handleBuscar}
            disabled={loadingBusca}
            size="sm"
          >
            {loadingBusca ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>


        {!isOnline && (
          <Card className="p-3 bg-warning/10 border-warning/20">
            <div className="flex items-center gap-2 text-sm text-warning-foreground">
              <WifiOff className="h-4 w-4" />
              <span>Offline - Exibindo comandas em cache local</span>
            </div>
          </Card>
        )}

      </div>

      {/* Lista de Comandas */}
      <div className="space-y-2">
        {loadingCache || loadingBusca ? (
          <div className="flex justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : comandasExibidas.length === 0 ? (
          <Card className="p-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Nenhuma comanda encontrada</h3>
            <p className="text-sm text-muted-foreground">
              {termoBusca.trim() 
                ? "Tente ajustar o termo de busca ou conecte-se à internet para buscar no histórico completo"
                : "Ainda não há comandas finalizadas no sistema"
              }
            </p>
          </Card>
        ) : (
          comandasExibidas.map((comanda) => (
          <Dialog key={comanda.id}>
            <DialogTrigger asChild>
              <Card className="p-3 cursor-pointer hover:bg-accent/5 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {comanda.tipo === "venda" ? (
                      <ShoppingBag className="h-4 w-4 text-success mr-2" />
                    ) : (
                      <ShoppingCart className="h-4 w-4 text-primary mr-2" />
                    )}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground text-sm">
                          {formatarCodigoComanda(comanda)}
                        </h3>
                        {(() => {
                          const syncStatus = (comanda as any).sincronizado ? "synced" : "pending";
                          const SyncIcon = getSyncIcon(syncStatus);
                          return (
                            <span 
                              title={getSyncTooltip(syncStatus)}
                              className={getSyncIconColor(syncStatus)}
                            >
                              <SyncIcon className="h-3 w-3" />
                            </span>
                          );
                        })()}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {comanda.cliente}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                     <p className="font-bold text-foreground text-sm">
                       {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(comanda.total)}
                     </p>
                    <div className="flex items-center gap-1">
                      <span className="text-xs px-1 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {comanda.tipo}
                      </span>
                      <span className={`text-xs px-1 py-0.5 rounded-full ${
                        (comanda.status === 'finalizada' || (comanda as any).status === 'Finalizada')
                          ? 'bg-success/10 text-success' 
                          : (comanda.status === 'cancelada' || (comanda as any).status === 'Cancelada')
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-warning/10 text-warning'
                      }`}>
                        {comanda.status === 'finalizada' || (comanda as any).status === 'Finalizada' ? 'Finalizada' : 
                         comanda.status === 'cancelada' || (comanda as any).status === 'Cancelada' ? 'Cancelada' : 
                         comanda.status || 'Ativa'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
                  <span>
                    {comanda.created_at 
                      ? new Date(comanda.created_at).toLocaleDateString('pt-BR') + ' às ' + 
                        new Date(comanda.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                      : `${(comanda as any).data} às ${(comanda as any).horario}`
                    }
                  </span>
                  <span>{Array.isArray(comanda.itens) ? comanda.itens.length : (comanda as any).itens} itens</span>
                </div>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {comanda.tipo === "venda" ? (
                    <ShoppingBag className="h-5 w-5 text-success" />
                  ) : (
                    <ShoppingCart className="h-5 w-5 text-primary" />
                  )}
                  {formatarCodigoComanda(comanda)} - {comanda.tipo === "venda" ? "Venda" : "Compra"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Dispositivo:</p>
                    <p className="font-medium">{comanda.dispositivo || comanda.cliente}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status:</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      (comanda.status === 'finalizada' || (comanda as any).status === 'Finalizada')
                        ? 'bg-success/10 text-success' 
                        : (comanda.status === 'cancelada' || (comanda as any).status === 'Cancelada')
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-warning/10 text-warning'
                    }`}>
                      {comanda.status === 'finalizada' || (comanda as any).status === 'Finalizada' ? 'Finalizada' : 
                       comanda.status === 'cancelada' || (comanda as any).status === 'Cancelada' ? 'Cancelada' : 
                       comanda.status || 'Ativa'}
                    </span>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Data:</p>
                    <p className="font-medium">
                      {comanda.created_at 
                        ? new Date(comanda.created_at).toLocaleDateString('pt-BR')
                        : (comanda as any).data
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Horário:</p>
                    <p className="font-medium">
                      {comanda.created_at 
                        ? new Date(comanda.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                        : (comanda as any).horario
                      }
                    </p>
                  </div>
                </div>
                
                 <div>
                   <h4 className="font-semibold mb-2">Materiais/Produtos:</h4>
                   <Table>
                     <TableHeader>
                       <TableRow>
                         <TableHead className="text-xs">Item</TableHead>
                         <TableHead className="text-xs text-center">Qtd</TableHead>
                         <TableHead className="text-xs text-right">Preço</TableHead>
                         <TableHead className="text-xs text-right">Total</TableHead>
                       </TableRow>
                     </TableHeader>
                      <TableBody>
                        {(Array.isArray(comanda.itens) ? comanda.itens : (comanda as any).materiais || []).map((item: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell className="text-xs">{item.material || item.nome}</TableCell>
                            <TableCell className="text-xs text-center">{item.quantidade}</TableCell>
                             <TableCell className="text-xs text-right">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.preco)}</TableCell>
                             <TableCell className="text-xs text-right">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.quantidade * item.preco)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                   </Table>
                 </div>

                 {/* Observação */}
                 {(comanda.observacoes || (comanda as any).observacao) && (
                   <div>
                     <h4 className="font-semibold mb-2">Observação:</h4>
                     <p className="text-sm text-muted-foreground bg-accent/10 p-3 rounded-lg">
                       {comanda.observacoes || (comanda as any).observacao}
                     </p>
                   </div>
                 )}
                
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total:</span>
                    <span className="font-bold text-lg">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(comanda.total)}</span>
                  </div>
                </div>
                
                <div className="flex justify-end pt-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    asChild
                    className="gap-2"
                  >
                    <Link 
                      to={`/imprimir-comanda/${comanda.id}`}
                      state={{ comanda }}
                    >
                      <Printer className="h-4 w-4" />
                      Imprimir
                    </Link>
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          ))
        )}
      </div>

      {/* Resumo */}
      <Card className="mt-6 p-4 bg-gradient-to-r from-primary/5 to-primary/10">
        <h3 className="font-semibold text-foreground mb-3">Resumo</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-primary">{comandasExibidas.length}</p>
            <p className="text-sm text-muted-foreground">Comandas</p>
          </div>
          <div>
             <p className="text-2xl font-bold text-success">
               {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(comandasExibidas.reduce((acc, c) => acc + c.total, 0))}
             </p>
            <p className="text-sm text-muted-foreground">Total</p>
          </div>
          <div>
             <p className="text-2xl font-bold text-accent">
               {comandasExibidas.length > 0 
                 ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(comandasExibidas.reduce((acc, c) => acc + c.total, 0) / comandasExibidas.length)
                 : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(0)
               }
             </p>
            <p className="text-sm text-muted-foreground">Ticket Médio</p>
          </div>
        </div>
        
        {!isOnline && (
          <div className="mt-3 pt-3 border-t border-border/10">
            <p className="text-xs text-muted-foreground text-center">
              Dados baseados nas últimas 20 comandas em cache local
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default HistoricoComandas;