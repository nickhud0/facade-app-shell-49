import { ArrowLeft, Plus, Package } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
// import { NetworkStatus } from "@/components/NetworkStatus";
import { formatCurrency } from "@/utils/formatters";
import { useDataService } from "@/hooks/useDataService";
import { Material, Transacao } from "@/services/localDbService";
import { LoadingSpinner, ErrorState, EmptyState, PageWrapper } from "@/components/ui/loading-states";

const Venda = () => {
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [peso, setPeso] = useState("");
  const [precoPersonalizado, setPrecoPersonalizado] = useState("");
  const [desconto, setDesconto] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const materiaisService = useDataService<Material>('materiais');
  const transacoesService = useDataService<Transacao>('transacoes');

  const { 
    data: materiais, 
    loading: loadingMateriais, 
    error: errorMateriais,
    isOnline,
    hasData,
    refresh: refreshMateriais
  } = materiaisService;

  const { createItem: createTransacao } = transacoesService;

  // Verificar se existe uma comanda de compra em andamento
  useEffect(() => {
    const comandaStorage = localStorage.getItem('comandaAtual');
    if (comandaStorage) {
      const comanda = JSON.parse(comandaStorage);
      if (comanda.tipo === "compra" && comanda.itens.length > 0) {
        toast({
          title: "Atenção",
          description: "Não é possível adicionar materiais de venda em uma comanda de compra!",
          variant: "destructive"
        });
        navigate("/comanda-atual");
        return;
      }
    }
  }, [navigate, toast]);

  const handleMaterialClick = (material: Material) => {
    setSelectedMaterial(material);
    setPeso("");
    setPrecoPersonalizado((material.preco_venda_kg || 0).toString());
    setDesconto("");
    setIsDialogOpen(true);
  };

  const handleAdicionar = async () => {
    if (!selectedMaterial || !peso) return;

    const pesoNum = parseFloat(peso) || 0;
    const descontoKg = parseFloat(desconto) || 0;
    const pesoLiquido = Math.max(0, pesoNum - descontoKg);
    const precoNum = parseFloat(precoPersonalizado) || 0;
    const total = pesoLiquido * Math.max(0, precoNum);

    // Criar transação para o banco de dados
    const success = await createTransacao({
      tipo: 'venda',
      material_id: selectedMaterial.id!,
      peso: pesoLiquido,
      valor_total: total,
      observacoes: desconto ? `Desconto: ${descontoKg}kg` : undefined,
      created_at: new Date().toISOString()
    });

    if (success) {
      // Criar item para a comanda local (compatibilidade)
      const novoItem = {
        id: Date.now(),
        material: selectedMaterial.nome,
        preco: precoNum,
        quantidade: pesoLiquido,
        total: total
      };

      // Atualizar comanda no localStorage (para manter compatibilidade)
      const comandaStorage = localStorage.getItem('comandaAtual');
      let comanda = { itens: [], tipo: "venda", total: 0 };
      
      if (comandaStorage) {
        comanda = JSON.parse(comandaStorage);
      }
      
      comanda.itens.push(novoItem);
      comanda.tipo = "venda";
      comanda.total = comanda.itens.reduce((acc: any, item: any) => acc + item.total, 0);
      
      localStorage.setItem('comandaAtual', JSON.stringify(comanda));
      
      setIsDialogOpen(false);
      navigate("/comanda-atual");
    }
  };

  const handleCancelar = () => {
    setIsDialogOpen(false);
    setSelectedMaterial(null);
  };

  const calcularSubtotal = () => {
    if (!selectedMaterial || !peso) return 0;
    const pesoNum = parseFloat(peso) || 0;
    const descontoKg = parseFloat(desconto) || 0;
    const pesoLiquido = Math.max(0, pesoNum - descontoKg);
    const precoNum = parseFloat(precoPersonalizado) || 0;
    return pesoLiquido * Math.max(0, precoNum);
  };

  // Função para determinar a cor de fundo do ícone baseada no índice
  const getIconColor = (index: number) => {
    const colors = [
      "bg-primary", "bg-success", "bg-warning", "bg-destructive",
      "bg-accent", "bg-secondary", "bg-primary-dark", "bg-success/80"
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" className="mr-3" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Vendas</h1>
        </div>
        {/* <NetworkStatus /> */}
      </div>

      {/* Lista de Materiais para Venda */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">
            Selecionar Material para Venda
          </h2>
          <Link to="/cadastrar-material">
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Novo Material
            </Button>
          </Link>
        </div>

        {loadingMateriais ? (
          <LoadingSpinner message="Carregando materiais..." />
        ) : errorMateriais ? (
          <ErrorState message={errorMateriais} onRetry={refreshMateriais} />
        ) : materiais.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Nenhum material cadastrado"
            description="Cadastre o primeiro material para começar as vendas"
            actionLabel="Cadastrar Primeiro Material"
            onAction={() => navigate("/cadastrar-material")}
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {materiais.map((material, index) => (
              <Card 
                key={material.id} 
                className="p-4 cursor-pointer bg-card border-white hover:shadow-md transition-shadow"
                onClick={() => handleMaterialClick(material)}
              >
                <div className="flex flex-col items-center space-y-3 text-center">
                  <div className={`w-16 h-16 rounded-full ${getIconColor(index)} flex items-center justify-center shadow-card`}>
                    <Package className="h-8 w-8 text-white" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-foreground text-sm leading-tight">
                      {material.nome}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {material.categoria || "Outros"}
                    </p>
                    <p className="font-bold text-success text-sm">
                      {formatCurrency(material.preco_venda_kg || 0)}/kg
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialog para seleção de peso e desconto */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Material - Venda</DialogTitle>
          </DialogHeader>
          
          {selectedMaterial && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <h3 className="font-semibold">{selectedMaterial.nome}</h3>
                <p className="text-sm text-muted-foreground">{selectedMaterial.categoria || "Outros"}</p>
                <p className="text-sm font-medium">{formatCurrency(selectedMaterial.preco_venda_kg || 0)}/kg</p>
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="peso">Peso (kg) *</Label>
                  <Input
                    id="peso"
                    type="number"
                    step="0.1"
                    placeholder="0.0"
                    value={peso}
                    onChange={(e) => setPeso(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="preco">Preço por kg (R$)</Label>
                  <Input
                    id="preco"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={precoPersonalizado}
                    onChange={(e) => setPrecoPersonalizado(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="desconto">Desconto por Kg</Label>
                  <Input
                    id="desconto"
                    type="number"
                    step="0.1"
                    placeholder="0.0"
                    value={desconto}
                    onChange={(e) => setDesconto(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div className="p-3 bg-success/10 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Subtotal:</span>
                    <span className="text-lg font-bold text-success">
                      {formatCurrency(calcularSubtotal())}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex space-x-2 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={handleCancelar}
                >
                  Cancelar
                </Button>
                <Button 
                  className="flex-1 bg-gradient-to-r from-success to-success/80"
                  onClick={handleAdicionar}
                  disabled={!peso}
                >
                  Adicionar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Venda;