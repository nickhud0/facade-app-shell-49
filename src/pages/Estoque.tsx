import { ArrowLeft, Search, Package, Filter, RefreshCw, Plus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState, useEffect } from "react";
import { NetworkStatus } from "@/components/NetworkStatus";
import { formatLastUpdate } from "@/utils/syncStatus";
import { formatCurrency, formatWeight } from "@/utils/formatters";
import { useEstoque } from "@/hooks/useStandardData";
import { LoadingSpinner, ErrorState, OfflineBanner, SummaryCard, PageWrapper } from "@/components/ui/loading-states";

const Estoque = () => {
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("Todos");
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<string>();
  
  const { 
    itensEstoque, 
    resumoEstoque, 
    loading, 
    error, 
    isOnline, 
    hasData, 
    refreshEstoque 
  } = useEstoque();

  // Verificar última atualização do localStorage
  useEffect(() => {
    const lastUpdate = localStorage.getItem('estoque_last_update');
    if (lastUpdate) {
      setUltimaAtualizacao(formatLastUpdate(lastUpdate));
    }
  }, []);

  // Obter categorias únicas dos dados reais
  const categorias = ["Todos", ...Array.from(new Set(
    itensEstoque
      .map(item => item.categoria)
      .filter(Boolean)
  ))];

  // Filtrar itens
  const itensFiltrados = itensEstoque.filter(item => {
    const matchBusca = item.material_nome.toLowerCase().includes(busca.toLowerCase());
    const matchCategoria = categoriaFiltro === "Todos" || item.categoria === categoriaFiltro;
    return matchBusca && matchCategoria;
  });

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
            onClick={refreshEstoque}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <NetworkStatus />
        </div>
      </div>

      {/* Banner Offline */}
      {!isOnline && <OfflineBanner lastUpdate={ultimaAtualizacao} />}

      <PageWrapper 
        loading={loading} 
        error={error} 
        onRetry={refreshEstoque}
        loadingMessage="Carregando dados do estoque..."
      >
        {/* Resumo */}
        <Card className="mb-6 p-4 bg-gradient-to-r from-primary/10 to-accent/10">
          <div className="grid grid-cols-3 gap-4">
            <SummaryCard
              title="Total em Kg"
              value={formatWeight(resumoEstoque.totalKg).replace(' kg', '')}
              subtitle="kg"
              variant="primary"
            />
            <SummaryCard
              title="Tipos de Materiais"
              value={resumoEstoque.totalTipos}
              subtitle="tipos"
              variant="accent"
            />
            <SummaryCard
              title="Valor Total"
              value={formatCurrency(resumoEstoque.valorTotal)}
              subtitle="em estoque"
              variant="success"
            />
          </div>
        </Card>

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
                        {item.categoria || "Outros"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Comprado: {formatWeight(item.kg_comprado)} • Vendido: {formatWeight(item.kg_vendido)}
                      </p>
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
          
          {itensFiltrados.length === 0 && hasData && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum material encontrado com os filtros aplicados
            </div>
          )}
        </Card>
      </PageWrapper>
    </div>
  );
};

export default Estoque;