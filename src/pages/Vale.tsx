import { ArrowLeft, CreditCard, Plus, Search, User, UserPlus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { getSyncIcon, getSyncTooltip, getSyncIconColor } from "@/utils/syncStatus";

// Dados mock para vales
const vales = [
  {
    id: 1,
    cliente: "João Silva",
    valor: 45.50,
    data: "2024-01-15",
    status: "Pendente"
  },
  {
    id: 2,
    cliente: "Maria Santos",
    valor: 78.90,
    data: "2024-01-14",
    status: "Quitado"
  },
  {
    id: 3,
    cliente: "Pedro Costa",
    valor: 120.00,
    data: "2024-01-13",
    status: "Pendente"
  },
  {
    id: 4,
    cliente: "Ana Oliveira",
    valor: 35.80,
    data: "2024-01-12",
    status: "Quitado"
  }
];

// Lista de pessoas cadastradas (mock)
const pessoasCadastradas = [
  "João Silva",
  "Maria Santos", 
  "Pedro Costa",
  "Ana Oliveira"
];

const resumoVales = {
  totalPendente: vales.filter(v => v.status === 'Pendente').reduce((acc, v) => acc + v.valor, 0),
  quantidadePendentes: vales.filter(v => v.status === 'Pendente').length
};

import { formatCurrency } from "@/utils/formatters";

const Vale = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [novoCliente, setNovoCliente] = useState("");
  const [clienteSelecionado, setClienteSelecionado] = useState("");
  const [valor, setValor] = useState("");
  const [modoSelecao, setModoSelecao] = useState<"novo" | "existente">("existente");
  const { toast } = useToast();

  const handleSubmit = () => {
    const cliente = modoSelecao === "novo" ? novoCliente : clienteSelecionado;
    
    if (!cliente || !valor) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    // Aqui você pode adicionar a lógica para salvar o vale
    toast({
      title: "Vale cadastrado",
      description: `Vale de ${formatCurrency(parseFloat(valor))} para ${cliente} foi registrado`,
    });

    // Reset form
    setNovoCliente("");
    setClienteSelecionado("");
    setValor("");
    setIsOpen(false);
  };
  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" className="mr-3" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        <h1 className="text-2xl font-bold text-foreground">Controle de Vales</h1>
      </div>

      {/* Resumo */}
      <Card className="mb-6 p-4 bg-gradient-to-r from-accent/10 to-primary/10">
        <h2 className="text-lg font-semibold text-foreground mb-4">Resumo dos Vales</h2>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-warning">{formatCurrency(resumoVales.totalPendente)}</p>
            <p className="text-sm text-muted-foreground">Total Pendente</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary">{resumoVales.quantidadePendentes}</p>
            <p className="text-sm text-muted-foreground">Pessoas</p>
          </div>
        </div>
      </Card>

      {/* Busca */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Buscar por cliente..." 
          className="pl-10"
        />
      </div>

      {/* Botão Novo Vale */}
      <Card className="mb-6 p-4 bg-gradient-to-r from-accent to-accent/80 border-0">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full h-12 text-accent-foreground hover:bg-white/10"
            >
              <Plus className="mr-2 h-5 w-5" />
              Cadastrar Novo Vale
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Vale</DialogTitle>
              <DialogDescription>
                Registre um novo vale para alguém
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label>Tipo de Pessoa</Label>
                <div className="flex gap-2">
                  <Button
                    variant={modoSelecao === "existente" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setModoSelecao("existente")}
                  >
                    Existente
                  </Button>
                  <Button
                    variant={modoSelecao === "novo" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setModoSelecao("novo")}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Novo
                  </Button>
                </div>
              </div>

              {modoSelecao === "novo" ? (
                <div className="space-y-2">
                  <Label htmlFor="novo-cliente">Nome da Pessoa</Label>
                  <Input
                    id="novo-cliente"
                    placeholder="Digite o nome da pessoa"
                    value={novoCliente}
                    onChange={(e) => setNovoCliente(e.target.value)}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Selecionar Pessoa</Label>
                  <Select value={clienteSelecionado} onValueChange={setClienteSelecionado}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha uma pessoa" />
                    </SelectTrigger>
                    <SelectContent>
                      {pessoasCadastradas.map((pessoa) => (
                        <SelectItem key={pessoa} value={pessoa}>
                          {pessoa}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="valor">Valor do Vale</Label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-sm text-muted-foreground">R$</span>
                  <Input
                    id="valor"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    className="pl-10"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit}>
                Cadastrar Vale
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>

      {/* Lista de Vales */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Vales Registrados</h3>
        
        {vales.map((vale) => (
          <Card key={vale.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <User className="h-5 w-5 text-accent mr-3" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-foreground">
                      {vale.cliente}
                    </h4>
                    {(() => {
                      const syncStatus = (vale as any).sincronizado ? "synced" : "pending";
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
                  <p className="text-sm text-muted-foreground">
                    Registrado em {vale.data}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {vale.status === 'Pendente' && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="h-7 px-2 text-xs"
                      >
                        <CreditCard className="mr-1 h-3 w-3" />
                        Quitar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Quitação</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja quitar o vale de {formatCurrency(vale.valor)} do cliente {vale.cliente}?
                          Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => {
                          toast({
                            title: "Vale quitado",
                            description: `Vale de ${formatCurrency(vale.valor)} de ${vale.cliente} foi quitado com sucesso`,
                          });
                        }}>
                          Confirmar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                
                <div className="text-right">
                  <p className="font-bold text-lg text-foreground">
                    {formatCurrency(vale.valor)}
                  </p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    vale.status === 'Quitado' 
                      ? 'bg-success/10 text-success' 
                      : 'bg-warning/10 text-warning'
                  }`}>
                    {vale.status}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

    </div>
  );
};

export default Vale;