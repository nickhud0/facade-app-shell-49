import { ArrowLeft, Plus, Trash2, Save, Edit, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getDeviceName } from "@/utils/deviceInfo";
import { useOfflineData } from "@/hooks/useOfflineData";
import { useComandasOffline } from "@/hooks/useComandasOffline";
import { Transacao } from "@/services/database";
import { useToast } from "@/hooks/use-toast";

const ComandaAtual = () => {
  // Agrupar estados relacionados para reduzir re-renders
  const [comandaState, setComandaState] = useState({
    itens: [],
    itemEditando: null,
    dialogOpen: false,
    tipo: "",
    observacao: ""
  });
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createItem } = useOfflineData<Transacao>('transacoes');
  const { criarComanda } = useComandasOffline();

  // Carregar comanda do localStorage ao inicializar
  useEffect(() => {
    const comandaStorage = localStorage.getItem('comandaAtual');
    if (comandaStorage) {
      const comanda = JSON.parse(comandaStorage);
      setComandaState(prev => ({
        ...prev,
        itens: comanda.itens || [],
        tipo: comanda.tipo || "",
        observacao: comanda.observacao || ""
      }));
    }
  }, []);

  // Salvar comanda no localStorage sempre que houver mudança
  useEffect(() => {
    if (comandaState.itens.length > 0 || comandaState.tipo) {
      const comanda = {
        itens: comandaState.itens,
        tipo: comandaState.tipo,
        total: totalComanda,
        observacao: comandaState.observacao
      };
      localStorage.setItem('comandaAtual', JSON.stringify(comanda));
    }
  }, [comandaState.itens, comandaState.tipo, comandaState.observacao]);

  const totalComanda = comandaState.itens.reduce((acc, item) => acc + item.total, 0);

  const handleEditItem = (item) => {
    setComandaState(prev => ({
      ...prev,
      itemEditando: { ...item },
      dialogOpen: true
    }));
  };

  const handleSaveEdit = () => {
    if (!comandaState.itemEditando) return;
    
    const novoTotal = comandaState.itemEditando.preco * comandaState.itemEditando.quantidade;
    const itemAtualizado = { ...comandaState.itemEditando, total: novoTotal };
    
    setComandaState(prev => ({
      ...prev,
      itens: prev.itens.map(item => 
        item.id === prev.itemEditando.id ? itemAtualizado : item
      ),
      dialogOpen: false,
      itemEditando: null
    }));
  };

  const handleDeleteItem = (id) => {
    setComandaState(prev => ({
      ...prev,
      itens: prev.itens.filter(item => item.id !== id)
    }));
  };

  const handleCloseDialog = () => {
    setComandaState(prev => ({
      ...prev,
      dialogOpen: false,
      itemEditando: null
    }));
  };

  const handleAdicionarItem = () => {
    if (comandaState.tipo === "venda") {
      navigate("/venda");
    } else {
      navigate("/compra");
    }
  };

  // Função para obter material_id baseado no nome
  const getMaterialIdByName = (nomeMaterial: string): number => {
    const materialMap: { [key: string]: number } = {
      "Alumínio Lata": 1,
      "Alumínio Perfil": 2, 
      "Cobre": 3,
      "Latão": 4,
      "Ferro": 5,
      "Inox": 6,
      "Bronze": 7,
      "Chumbo": 8
    };
    return materialMap[nomeMaterial] || 1;
  };

  const handleFinalizarComanda = async () => {
    console.log('🚀 Finalizando comanda com', comandaState.itens.length, 'itens');
    
    // Salvar cada item da comanda como transação individual
    for (const item of comandaState.itens) {
      const materialId = getMaterialIdByName(item.material);
      
      const transacao: Omit<Transacao, 'id'> = {
        tipo: comandaState.tipo as 'compra' | 'venda',
        material_id: materialId,
        peso: item.quantidade,
        valor_total: item.total,
        observacoes: comandaState.observacao || undefined,
        created_at: new Date().toISOString()
      };

      console.log('💾 Salvando transação:', transacao);
      await createItem(transacao);
    }
    
    // Criar comanda usando o sistema offline-first
    const agora = new Date();
    const comandaParaSalvar = {
      numero: `${comandaState.tipo === "venda" ? "V" : "C"}${String(Date.now()).slice(-6)}`,
      tipo: comandaState.tipo as 'compra' | 'venda',
      total: totalComanda,
      status: 'finalizada' as const,
      cliente: comandaState.tipo === 'venda' ? 'Cliente' : 'Fornecedor',
      dispositivo: getDeviceName(),
      observacoes: comandaState.observacao || '',
      itens: comandaState.itens.map((item, index) => ({
        id: index + 1,
        material: item.material,
        quantidade: item.quantidade,
        preco: item.preco,
        total: item.total
      })),
      created_at: agora.toISOString(),
      updated_at: agora.toISOString()
    };

    console.log('💾 Salvando comanda completa:', comandaParaSalvar);
    
    // Usar o sistema de comandas offline-first
    const success = await criarComanda(comandaParaSalvar);
    
    if (!success) {
      toast({
        title: "Erro",
        description: "Erro ao salvar a comanda",
        variant: "destructive"
      });
      return;
    }

    // Resetar estado da comanda atual para vazio
    setComandaState({
      itens: [],
      itemEditando: null,
      dialogOpen: false,
      tipo: "",
      observacao: ""
    });
    localStorage.removeItem('comandaAtual');
    
    toast({
      title: "Sucesso",
      description: `${comandaState.tipo === 'venda' ? 'Venda' : 'Compra'} finalizada com sucesso!`
    });
    
    navigate("/");
  };

  const handleCancelarComanda = () => {
    // Resetar estado da comanda atual para vazio
    setComandaState({
      itens: [],
      itemEditando: null,
      dialogOpen: false,
      tipo: "",
      observacao: ""
    });
    localStorage.removeItem('comandaAtual');
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" className="mr-3" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        <h1 className="text-2xl font-bold text-foreground">Comanda Atual</h1>
      </div>

      {/* Info da Comanda */}
      <Card className="mb-6 p-4 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Comanda #{comandaState.tipo === "venda" ? "V" : "C"}001
            </h2>
            <p className="text-sm text-muted-foreground">
              {comandaState.tipo === "venda" ? "Venda" : "Compra"} • Iniciada às 14:35
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-3xl font-bold text-success">
              R$ {totalComanda.toFixed(2)}
            </p>
          </div>
        </div>
      </Card>

      {/* Itens da Comanda */}
      <div className="space-y-2 mb-4">
        {comandaState.itens.map((item) => (
          <Card key={item.id} className="p-3 shadow-md">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <h3 className="font-semibold text-foreground text-base">
                  {item.material}
                </h3>
                <p className="text-xs text-muted-foreground">
                  R$ {item.preco.toFixed(2)} por kg
                </p>
                <p className="text-sm font-medium text-foreground">
                  Quantidade: {item.quantidade} kg
                </p>
              </div>
              <div className="flex space-x-3">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-primary hover:bg-primary/10 h-9 w-9 p-0"
                  onClick={() => handleEditItem(item)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-destructive hover:bg-destructive/10 h-9 w-9 p-0"
                  onClick={() => handleDeleteItem(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex justify-end">
              <p className="font-bold text-lg text-foreground">
                R$ {item.total.toFixed(2)}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {/* Botões para Adicionar Item */}
      {comandaState.itens.length === 0 ? (
        // Quando a comanda está vazia, mostrar dois botões para escolher tipo
        <Card className="mb-4 p-3 bg-gradient-to-r from-accent to-accent/80 border-0 shadow-md">
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="ghost" 
              className="h-10 text-accent-foreground hover:bg-white/10"
              onClick={() => navigate("/compra")}
            >
              <Plus className="mr-2 h-4 w-4" />
              Compra
            </Button>
            <Button 
              variant="ghost" 
              className="h-10 text-accent-foreground hover:bg-white/10"
              onClick={() => navigate("/venda")}
            >
              <Plus className="mr-2 h-4 w-4" />
              Venda
            </Button>
          </div>
        </Card>
      ) : (
        // Quando já tem itens, mostrar botão específico do tipo da comanda
        <Card className="mb-4 p-3 bg-gradient-to-r from-accent to-accent/80 border-0 shadow-md">
          <Button 
            variant="ghost" 
            className="w-full h-10 text-accent-foreground hover:bg-white/10"
            onClick={handleAdicionarItem}
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar {comandaState.tipo === "venda" ? "Material para Venda" : "Material para Compra"}
          </Button>
        </Card>
      )}

      {/* Resumo e Ações */}
      <Card className="p-4 shadow-lg">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-lg">Subtotal:</span>
            <span className="text-lg font-semibold">R$ {totalComanda.toFixed(2)}</span>
          </div>
          
          <Separator />
          
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold">Total:</span>
            <span className="text-xl font-bold text-success">R$ {totalComanda.toFixed(2)}</span>
          </div>
          
          {/* Campo de Observação */}
          <div className="pt-2">
            <Label htmlFor="observacao" className="text-sm font-medium">
              Observação (Opcional)
            </Label>
            <Textarea
              id="observacao"
              placeholder="Adicione uma observação para esta comanda..."
              value={comandaState.observacao}
              onChange={(e) => setComandaState(prev => ({ ...prev, observacao: e.target.value }))}
              className="mt-1 min-h-[80px] resize-none"
            />
          </div>

          <div className="space-y-2 pt-4">
            <Button 
              className="w-full h-12 bg-gradient-to-r from-success to-success/80 border-0 shadow-md"
              onClick={handleFinalizarComanda}
            >
              <Save className="mr-2 h-5 w-5" />
              Finalizar Comanda
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full h-12 text-destructive border-destructive hover:bg-destructive/10"
              onClick={handleCancelarComanda}
            >
              <X className="mr-2 h-5 w-5" />
              Cancelar Comanda
            </Button>
          </div>
        </div>
      </Card>

      {/* Dialog para Editar Item */}
      <Dialog open={comandaState.dialogOpen} onOpenChange={(open) => setComandaState(prev => ({ ...prev, dialogOpen: open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Material</DialogTitle>
          </DialogHeader>
          
          {comandaState.itemEditando && (
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="material">Material</Label>
                <Input
                  id="material"
                  value={comandaState.itemEditando.material}
                  onChange={(e) => setComandaState(prev => ({ 
                    ...prev, 
                    itemEditando: { ...prev.itemEditando, material: e.target.value }
                  }))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="preco">Preço por kg (R$)</Label>
                <Input
                  id="preco"
                  type="number"
                  step="0.01"
                  value={comandaState.itemEditando.preco}
                  onChange={(e) => setComandaState(prev => ({ 
                    ...prev, 
                    itemEditando: { ...prev.itemEditando, preco: parseFloat(e.target.value) || 0 }
                  }))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="quantidade">Quantidade (kg)</Label>
                <Input
                  id="quantidade"
                  type="number"
                  step="0.1"
                  value={comandaState.itemEditando.quantidade}
                  onChange={(e) => setComandaState(prev => ({ 
                    ...prev, 
                    itemEditando: { ...prev.itemEditando, quantidade: parseFloat(e.target.value) || 0 }
                  }))}
                  className="mt-1"
                />
              </div>

              <div className="p-3 bg-accent/10 rounded-lg">
                <p className="text-sm font-medium">
                  Total: R$ {(comandaState.itemEditando.preco * comandaState.itemEditando.quantidade).toFixed(2)}
                </p>
              </div>

              <div className="flex space-x-2 pt-4">
                <Button 
                  onClick={handleSaveEdit}
                  className="flex-1 bg-gradient-to-r from-success to-success/80"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Salvar
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleCloseDialog}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ComandaAtual;