import { ArrowLeft, Search, Edit, List, Plus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOfflineData } from "@/hooks/useOfflineData";
import { Material } from "@/services/database";
import { useToast } from "@/hooks/use-toast";
import { NetworkStatus } from "@/components/NetworkStatus";
import { toYMD } from "@/utils/formatters";

const TabelaPrecos = () => {
  const navigate = useNavigate();
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [novoPrecoVenda, setNovoPrecoVenda] = useState("");
  const [novoPrecoCompra, setNovoPrecoCompra] = useState("");
  const [busca, setBusca] = useState("");
  const [categoriaSelecionada, setCategoriaSelecionada] = useState("Todas");
  
  const { data: materiais, loading, updateItem } = useOfflineData<Material>('materiais');
  
  // Dados fictícios para demonstração
  const materiaisFicticios: Material[] = [
    {
      id: 1,
      nome: "Cobre Limpo",
      preco_compra_kg: 28.00,
      preco_venda_kg: 32.00,
      categoria: "Cobre",
      created_at: toYMD(new Date()),
      updated_at: toYMD(new Date())
    },
    {
      id: 2,
      nome: "Ferro Velho",
      preco_compra_kg: 0.80,
      preco_venda_kg: 1.20,
      categoria: "Metais Ferrosos", 
      created_at: toYMD(new Date()),
      updated_at: toYMD(new Date())
    },
    {
      id: 3,
      nome: "Alumínio",
      preco_compra_kg: 10.00,
      preco_venda_kg: 14.50,
      categoria: "Alumínio",
      created_at: toYMD(new Date()),
      updated_at: toYMD(new Date())
    },
    {
      id: 4,
      nome: "Aço Inox",
      preco_compra_kg: 23.75,
      preco_venda_kg: 28.20,
      categoria: "Metais Não-Ferrosos",
      created_at: toYMD(new Date()),
      updated_at: toYMD(new Date())
    },
    {
      id: 5,
      nome: "Bateria de Carro",
      preco_compra_kg: 2.80,
      preco_venda_kg: 4.20,
      categoria: "Sucata Eletrônica",
      created_at: toYMD(new Date()),
      updated_at: toYMD(new Date())
    }
  ];
  
  // Usar dados fictícios se não houver materiais reais
  const materiaisParaExibir = materiais.length > 0 ? materiais : materiaisFicticios;
  const { toast } = useToast();

  // Obter categorias únicas
  const categorias = ["Todas", ...Array.from(new Set(materiaisParaExibir.map(m => m.categoria || "Outros")))];

  const handleEditClick = (material: Material) => {
    setSelectedMaterial(material);
    setNovoPrecoVenda(material.preco_venda_kg.toString());
    setNovoPrecoCompra(material.preco_compra_kg.toString());
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedMaterial) return;
    
    const novoPrecoVendaNum = parseFloat(novoPrecoVenda) || 0;
    const novoPrecoCompraNum = parseFloat(novoPrecoCompra) || 0;
    
    if (novoPrecoVendaNum <= 0 || novoPrecoCompraNum <= 0) {
      toast({
        title: "Preços inválidos",
        description: "Os preços devem ser maiores que zero",
        variant: "destructive"
      });
      return;
    }

    const sucesso = await updateItem(selectedMaterial.id!, {
      preco_venda_kg: novoPrecoVendaNum,
      preco_compra_kg: novoPrecoCompraNum
    });

    if (sucesso) {
      toast({
        title: "Preços atualizados",
        description: `Preços do ${selectedMaterial.nome} atualizados com sucesso`
      });
      setIsEditDialogOpen(false);
      setSelectedMaterial(null);
    }
  };

  const handleCancelEdit = () => {
    setIsEditDialogOpen(false);
    setSelectedMaterial(null);
  };

  // Filtrar materiais
  const materiaisFiltrados = materiaisParaExibir.filter(material => {
    const matchBusca = material.nome.toLowerCase().includes(busca.toLowerCase());
    const categoria = material.categoria || "Outros";
    const matchCategoria = categoriaSelecionada === "Todas" || categoria === categoriaSelecionada;
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
          <h1 className="text-2xl font-bold text-foreground">Tabela de Preços</h1>
        </div>
        <NetworkStatus />
      </div>

      {/* Busca */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Buscar material..." 
          className="pl-10"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {/* Filtros por Categoria */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {categorias.map((categoria) => (
          <Button 
            key={categoria}
            variant={categoria === categoriaSelecionada ? "default" : "outline"} 
            size="sm"
            className="whitespace-nowrap"
            onClick={() => setCategoriaSelecionada(categoria)}
          >
            {categoria}
          </Button>
        ))}
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Carregando materiais...</p>
        </div>
      ) : materiaisParaExibir.length === 0 ? (
        <Card className="p-8 text-center">
          <List className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum material cadastrado</h3>
          <p className="text-muted-foreground mb-4">
            Cadastre materiais para gerenciar seus preços.
          </p>
          <Link to="/cadastrar-material">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar Primeiro Material
            </Button>
          </Link>
        </Card>
      ) : (
        <>
          {/* Lista de Produtos */}
          <div className="space-y-4 mb-6">
            {materiaisFiltrados.map((material) => (
              <Card key={material.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground mb-1 truncate">
                      {material.nome}
                    </h3>
                    <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                      {material.categoria || "Outros"}
                    </span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleEditClick(material)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="text-center sm:text-left">
                    <p className="text-xs text-muted-foreground mb-1">Preço Compra</p>
                    <p className="text-lg font-bold text-primary whitespace-nowrap">
                      R$ {material.preco_compra_kg.toFixed(2)}/kg
                    </p>
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-xs text-muted-foreground mb-1">Preço Venda</p>
                    <p className="text-lg font-bold text-success whitespace-nowrap">
                      R$ {material.preco_venda_kg.toFixed(2)}/kg
                    </p>
                  </div>
                </div>
              </Card>
            ))}

            {materiaisFiltrados.length === 0 && materiaisParaExibir.length > 0 && (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">
                  Nenhum material encontrado com os filtros aplicados.
                </p>
              </Card>
            )}
          </div>

          {/* Resumo */}
          <Card className="p-4 bg-gradient-to-r from-primary/5 to-accent/5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Total de Materiais</h3>
                <p className="text-2xl font-bold text-primary">{materiaisFiltrados.length}</p>
              </div>
              <div className="text-right">
                <Link to="/cadastrar-material">
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Material
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Dialog de Edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Preço do Material</DialogTitle>
          </DialogHeader>
          
          {selectedMaterial && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <h3 className="font-semibold">{selectedMaterial.nome}</h3>
                <p className="text-sm text-muted-foreground">{selectedMaterial.categoria || "Outros"}</p>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Preço compra: R$ {selectedMaterial.preco_compra_kg.toFixed(2)}/kg</p>
                  <p>Preço venda atual: R$ {selectedMaterial.preco_venda_kg.toFixed(2)}/kg</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="novoPrecoCompra">Novo Preço de Compra (R$/kg) *</Label>
                  <Input
                    id="novoPrecoCompra"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={novoPrecoCompra}
                    onChange={(e) => setNovoPrecoCompra(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="novoPrecoVenda">Novo Preço de Venda (R$/kg) *</Label>
                  <Input
                    id="novoPrecoVenda"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={novoPrecoVenda}
                    onChange={(e) => setNovoPrecoVenda(e.target.value)}
                    className="mt-1"
                  />
                </div>

                {novoPrecoCompra && novoPrecoVenda && parseFloat(novoPrecoCompra) > 0 && parseFloat(novoPrecoVenda) > 0 && (
                  <div className="p-3 bg-primary/10 rounded-lg space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Novo Preço Compra:</span>
                      <span className="text-lg font-bold text-primary">
                        R$ {parseFloat(novoPrecoCompra).toFixed(2)}/kg
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Novo Preço Venda:</span>
                      <span className="text-lg font-bold text-success">
                        R$ {parseFloat(novoPrecoVenda).toFixed(2)}/kg
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-border">
                      <span className="font-medium">Margem:</span>
                      <span className="text-lg font-bold text-accent">
                        {(((parseFloat(novoPrecoVenda) - parseFloat(novoPrecoCompra)) / parseFloat(novoPrecoCompra)) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex space-x-2 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={handleCancelEdit}
                >
                  Cancelar
                </Button>
                <Button 
                  className="flex-1"
                  onClick={handleSaveEdit}
                  disabled={!novoPrecoVenda || !novoPrecoCompra || parseFloat(novoPrecoVenda) <= 0 || parseFloat(novoPrecoCompra) <= 0}
                >
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TabelaPrecos;