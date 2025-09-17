import { ArrowLeft, RefreshCw, Package, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/utils/formatters";
import { NetworkStatus } from "@/components/NetworkStatus";
import { useEstoqueService } from "@/hooks/useEstoqueService";
import { LoadingSpinner, ErrorState, SummaryCard, PageWrapper, OfflineBanner } from "@/components/ui/loading-states";

const Estoque = () => {
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("todas");

  const {
    itens: itensEstoque,
    resumo: resumoEstoque,
    loading,
    error,
    isOnline,
    hasData,
    lastUpdate,
    refresh: refreshEstoque
  } = useEstoqueService();

  // Derivar categorias únicas
  const categorias = Array.from(new Set(
    itensEstoque.map(item => item.categoria).filter(Boolean)
  ));

  // Filtrar itens
  const itensFiltrados = itensEstoque.filter(item => {
    const matchBusca = item.material_nome.toLowerCase().includes(busca.toLowerCase());
    const matchCategoria = categoriaFiltro === "todas" || item.categoria === categoriaFiltro;
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
          <h1 className="text-2xl font-bold text-foreground">Estoque</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refreshEstoque}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <NetworkStatus />
        </div>
      </div>

      {/* Banner Offline */}
      {!isOnline && <OfflineBanner lastUpdate={lastUpdate} />}

      <PageWrapper 
        loading={loading} 
        error={error} 
        onRetry={refreshEstoque}
        loadingMessage="Carregando estoque..."
      >
        {/* Resumo Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <SummaryCard
            title="Total em Kg"
            value={resumoEstoque.totalKg.toFixed(1)}
            subtitle="quilogramas em estoque"
            variant="primary"
          />
          <SummaryCard
            title="Tipos de Material"
            value={resumoEstoque.totalTipos}
            subtitle="materiais diferentes"
            variant="accent"
          />
          <SummaryCard
            title="Valor Total"
            value={formatCurrency(resumoEstoque.valorTotal)}
            subtitle="valor estimado do estoque"
            variant="success"
          />
        </div>

        {/* Filtros */}
        <Card className="mb-6 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar material..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filtrar por categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as categorias</SelectItem>
                {categorias.map((categoria) => (
                  <SelectItem key={categoria} value={categoria || ""}>
                    {categoria || "Sem categoria"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Tabela de Materiais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="mr-2 h-5 w-5" />
              Materiais em Estoque
            </CardTitle>
          </CardHeader>
          <CardContent>
            {itensFiltrados.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {hasData ? "Nenhum material encontrado com os filtros aplicados" : "Nenhum material em estoque"}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Kg Disponível</TableHead>
                      <TableHead className="text-right">Preço Médio</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itensFiltrados.map((item) => (
                      <TableRow key={item.material_id}>
                        <TableCell className="font-medium">
                          {item.material_nome}
                        </TableCell>
                        <TableCell>
                          {item.categoria ? (
                            <Badge variant="secondary">{item.categoria}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {item.kg_disponivel.toFixed(1)} kg
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(item.valor_medio_compra)}/kg
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {formatCurrency(item.valor_total_estoque)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </PageWrapper>
    </div>
  );
};

export default Estoque;