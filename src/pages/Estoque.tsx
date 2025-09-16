import { ArrowLeft, Search, Package, Filter, RefreshCw, Plus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState, useEffect } from "react";
import { useEstoqueSupabase } from "@/hooks/useEstoqueSupabase";
import { NetworkStatus } from "@/components/NetworkStatus";
import { formatLastUpdate } from "@/utils/syncStatus";
import { formatCurrency, formatWeight } from "@/utils/formatters";
import { ResumoSkeleton, TableSkeleton } from "@/components/ui/skeleton";

const Estoque = () => {
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("Todos");
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<string>();
  const { itensEstoque, resumoEstoque, refreshData, hasData, loading, isOnline } = useEstoqueSupabase();

  // Atualizar dados quando a página for carregada
  useEffect(() => {
    refreshData();
    
    // Verificar última atualização do localStorage
    const lastUpdate = localStorage.getItem('estoque_last_update');
    if (lastUpdate) {
      setUltimaAtualizacao(lastUpdate);
    }
  }, [refreshData]);

  // Obter categorias únicas (dados fictícios para demo)
  const categorias = ["Todos", "Cobre", "Metais Ferrosos", "Alumínio", "Metais Não-Ferrosos", "Sucata Eletrônica"];

  // Dados fictícios para demonstração
  const itensFicticios = [
    {
      material_id: 1,
      material_nome: "Cobre Limpo",
      categoria: "Cobre",
      kg_comprado: 285.4,
      kg_vendido: 252.8,
      kg_disponivel: 32.6,
      valor_medio_compra: 28.00,
      valor_total_estoque: 912.80
    },
    {
      material_id: 2,
      material_nome: "Ferro Velho",
      categoria: "Metais Ferrosos",
      kg_comprado: 850.6,
      kg_vendido: 724.5,
      kg_disponivel: 126.1,
      valor_medio_compra: 0.80,
      valor_total_estoque: 100.88
    },
    {
      material_id: 3,
      material_nome: "Alumínio",
      categoria: "Alumínio",
      kg_comprado: 420.8,
      kg_vendido: 358.9,
      kg_disponivel: 61.9,
      valor_medio_compra: 10.00,
      valor_total_estoque: 619.00
    },
    {
      material_id: 4,
      material_nome: "Aço Inox",
      categoria: "Metais Não-Ferrosos",
      kg_comprado: 156.2,
      kg_vendido: 132.1,
      kg_disponivel: 24.1,
      valor_medio_compra: 23.75,
      valor_total_estoque: 572.38
    },
    {
      material_id: 5,
      material_nome: "Bateria de Carro",
      categoria: "Sucata Eletrônica",
      kg_comprado: 89.5,
      kg_vendido: 75.2,
      kg_disponivel: 14.3,
      valor_medio_compra: 2.80,
      valor_total_estoque: 40.04
    }
  ];

  // Filtrar itens (usar dados reais se disponíveis, senão dados fictícios)
  const dadosParaExibir = hasData ? itensEstoque : itensFicticios;
  const itensFiltrados = dadosParaExibir.filter(item => {
    const matchBusca = item.material_nome.toLowerCase().includes(busca.toLowerCase());
    const matchCategoria = categoriaFiltro === "Todos" || item.categoria === categoriaFiltro;
    return matchBusca && matchCategoria;
  });

  // Usar resumo real se disponível, senão calcular dos dados fictícios
  const resumoFinal = hasData ? resumoEstoque : {
    totalKg: itensFicticios.reduce((acc, item) => acc + item.kg_disponivel, 0),
    totalTipos: itensFicticios.length,
    valorTotal: itensFicticios.reduce((acc, item) => acc + item.valor_total_estoque, 0)
  };

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" className="mr-3" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Controle de Estoque</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={refreshData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <NetworkStatus />
        </div>
      </div>

      {/* Banner Offline */}
      {!isOnline && (
        <Card className="mb-4 p-3 bg-warning/10 border-warning/20">
          <div className="flex items-center gap-2 text-sm text-warning-foreground">
            <Package className="h-4 w-4" />
            <span>📡 Offline — dados de {formatLastUpdate(ultimaAtualizacao)}</span>
          </div>
        </Card>
      )}

      {/* Resumo */}
      {loading ? (
        <ResumoSkeleton />
      ) : (
        <Card className="mb-6 p-4 bg-gradient-to-r from-primary/10 to-accent/10">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{formatWeight(resumoFinal.totalKg).replace(' kg', '')} kg</p>
              <p className="text-sm text-muted-foreground">Total em Kg</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-accent">{resumoFinal.totalTipos}</p>
              <p className="text-sm text-muted-foreground">Tipos de Materiais</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-success">{formatCurrency(resumoFinal.valorTotal)}</p>
              <p className="text-sm text-muted-foreground">Valor Total</p>
            </div>
          </div>
        </Card>
      )}

      {/* Busca e Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar material por nome..." 
            className="pl-10"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        
        <div className="relative">
          <Filter className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
            <SelectTrigger className="pl-10">
              <SelectValue placeholder="Filtrar por categoria" />
            </SelectTrigger>
            <SelectContent>
              {categorias.map((categoria) => (
                <SelectItem key={categoria} value={categoria}>
                  {categoria === "Todos" ? "Todas as Categorias" : categoria}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela de Materiais */}
      <Card>
        {loading ? (
          <TableSkeleton rows={5} />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead className="text-center">Kg Disponível</TableHead>
                  <TableHead className="text-center">Preço Médio</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itensFiltrados.map((item) => (
                  <TableRow key={item.material_id}>
                    <TableCell className="font-medium">
                      <div>
                        <p className="font-semibold">{item.material_nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.categoria}
                        </p>
                        {(item as any).kg_comprado && (item as any).kg_vendido && (
                          <p className="text-xs text-muted-foreground">
                            Comprado: {formatWeight((item as any).kg_comprado)} • Vendido: {formatWeight((item as any).kg_vendido)}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      {formatWeight(Math.max(0, item.kg_disponivel))}
                    </TableCell>
                    <TableCell className="text-center font-semibold text-primary">
                      {formatCurrency(item.valor_medio_compra)}/kg
                    </TableCell>
                    <TableCell className="text-right font-semibold text-success">
                      {formatCurrency(Math.max(0, item.valor_total_estoque))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {itensFiltrados.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {hasData ? 'Nenhum material encontrado com os filtros aplicados' : 'Carregando dados do estoque...'}
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};

export default Estoque;