import { ArrowLeft, AlertCircle, Plus, CreditCard, Edit } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { getSyncIcon, getSyncTooltip, getSyncIconColor } from "@/utils/syncStatus";

import { formatCurrency } from "@/utils/formatters";

// Dados mock para pendências
const pendenciasIniciais = [
  {
    id: 1,
    tipo: "Devemos",
    cliente: "Fornecedor ABC",
    valor: 1250.80,
    observacao: "Vencimento de boleto",
    status: "Pendente"
  },
  {
    id: 2,
    tipo: "Devem",
    cliente: "João Silva",
    valor: 450.00,
    observacao: "Pagamento de produto",
    status: "Pendente"
  },
  {
    id: 3,
    tipo: "Devemos",
    cliente: "Conta de Luz",
    valor: 485.50,
    observacao: "Conta de energia elétrica",
    status: "Pago"
  }
];

const Pendencias = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pendencias, setPendencias] = useState(pendenciasIniciais);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPendencia, setEditingPendencia] = useState<{
    id: number;
    valor: string;
    observacao: string;
  } | null>(null);
  const [novaPendencia, setNovaPendencia] = useState({
    tipo: "",
    cliente: "",
    novoCliente: "",
    valor: "",
    observacao: ""
  });
  
  const clientesExistentes = ["João Silva", "Maria Santos", "Pedro Oliveira", "Ana Costa"];
  
  const resumoPendencias = {
    total: pendencias.filter(p => p.status === 'Pendente').length,
    valorTotal: pendencias
      .filter(p => p.status === 'Pendente')
      .reduce((acc, p) => acc + p.valor, 0)
  };
  
  const handleCadastrarPendencia = () => {
    const clienteFinal = novaPendencia.novoCliente || novaPendencia.cliente;
    
    if (!novaPendencia.tipo || !clienteFinal || !novaPendencia.valor) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }
    
    const nova = {
      id: Date.now(),
      tipo: novaPendencia.tipo,
      cliente: clienteFinal,
      valor: parseFloat(novaPendencia.valor),
      observacao: novaPendencia.observacao,
      status: "Pendente"
    };
    
    setPendencias([...pendencias, nova]);
    setNovaPendencia({
      tipo: "",
      cliente: "",
      novoCliente: "",
      valor: "",
      observacao: ""
    });
    setIsSheetOpen(false);
    
    toast({
      title: "Pendência cadastrada",
      description: "Nova pendência foi adicionada com sucesso"
    });
  };
  
  const handleEditarPendencia = (pendencia: any) => {
    setEditingPendencia({
      id: pendencia.id,
      valor: pendencia.valor.toString(),
      observacao: pendencia.observacao
    });
    setIsEditDialogOpen(true);
  };

  const handleSalvarEdicao = () => {
    if (!editingPendencia) return;
    
    if (!editingPendencia.valor) {
      toast({
        title: "Erro",
        description: "O valor deve ser preenchido",
        variant: "destructive"
      });
      return;
    }

    setPendencias(pendencias.map(p => 
      p.id === editingPendencia.id 
        ? { ...p, valor: parseFloat(editingPendencia.valor), observacao: editingPendencia.observacao }
        : p
    ));
    
    setIsEditDialogOpen(false);
    setEditingPendencia(null);
    
    toast({
      title: "Pendência atualizada",
      description: "As informações foram atualizadas com sucesso"
    });
  };

  const handlePagarPendencia = (id: number) => {
    setPendencias(pendencias.map(p => 
      p.id === id ? { ...p, status: "Pago" } : p
    ));
    
    toast({
      title: "Pendência quitada",
      description: "Pendência foi marcada como paga"
    });
  };
  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" className="mr-3" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        <h1 className="text-2xl font-bold text-foreground">Pendências</h1>
      </div>

      {/* Resumo */}
      <Card className="mb-6 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Resumo</h2>
          <AlertCircle className="h-6 w-6 text-warning" />
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-primary">{resumoPendencias.total}</p>
            <p className="text-sm text-muted-foreground">Total Pendente</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(resumoPendencias.valorTotal)}</p>
            <p className="text-sm text-muted-foreground">Valor Pendente</p>
          </div>
        </div>
      </Card>

      {/* Botão Cadastrar */}
      <div className="mb-6">
        <Dialog open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Cadastrar Nova Pendência
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Cadastrar Pendência</DialogTitle>
              <DialogDescription>
                Adicione uma nova pendência financeira
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="tipo">Tipo de Pendência</Label>
                <Select value={novaPendencia.tipo} onValueChange={(value) => setNovaPendencia({...novaPendencia, tipo: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Devemos">Nós devemos</SelectItem>
                    <SelectItem value="Devem">Cliente deve</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="cliente">Cliente Existente</Label>
                <Select value={novaPendencia.cliente} onValueChange={(value) => setNovaPendencia({...novaPendencia, cliente: value, novoCliente: ""})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientesExistentes.map((cliente) => (
                      <SelectItem key={cliente} value={cliente}>{cliente}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="novoCliente">Ou cadastre um novo cliente</Label>
                <Input
                  id="novoCliente"
                  value={novaPendencia.novoCliente}
                  onChange={(e) => setNovaPendencia({...novaPendencia, novoCliente: e.target.value, cliente: ""})}
                  placeholder="Nome do novo cliente"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="valor">Valor</Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  value={novaPendencia.valor}
                  onChange={(e) => setNovaPendencia({...novaPendencia, valor: e.target.value})}
                  placeholder="0,00"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="observacao">Observação</Label>
                <Textarea
                  id="observacao"
                  value={novaPendencia.observacao}
                  onChange={(e) => setNovaPendencia({...novaPendencia, observacao: e.target.value})}
                  placeholder="Descrição da pendência..."
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button onClick={handleCadastrarPendencia}>Cadastrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Pendências */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Registros de Pendências</h3>
        
        {pendencias.map((pendencia) => (
          <Card key={pendencia.id} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={pendencia.tipo === "Devemos" ? "destructive" : "default"}>
                    {pendencia.tipo}
                  </Badge>
                  <Badge variant={pendencia.status === "Pendente" ? "secondary" : "outline"}>
                    {pendencia.status}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-foreground">
                    {pendencia.cliente}
                  </h4>
                  {(() => {
                    const syncStatus = (pendencia as any).sincronizado ? "synced" : "pending";
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
                
                {pendencia.observacao && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {pendencia.observacao}
                  </p>
                )}
              </div>

              <div className="text-right">
                 <p className="font-bold text-lg text-primary">
                   {formatCurrency(pendencia.valor)}
                 </p>
              </div>
            </div>

            <div className="pt-3 border-t flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => handleEditarPendencia(pendencia)}
              >
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </Button>
              
              {pendencia.status === 'Pendente' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="default" size="sm" className="flex-1">
                      <CreditCard className="mr-2 h-4 w-4" />
                      Pagar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar Pagamento</AlertDialogTitle>
                       <AlertDialogDescription>
                         Tem certeza que deseja marcar como paga a pendência de {formatCurrency(pendencia.valor)} de {pendencia.cliente}?
                         Esta ação não pode ser desfeita.
                       </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handlePagarPendencia(pendencia.id)}>
                        Confirmar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Dialog de Edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Pendência</DialogTitle>
            <DialogDescription>
              Altere o valor e a observação da pendência
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="editValor">Valor</Label>
              <Input
                id="editValor"
                type="number"
                step="0.01"
                value={editingPendencia?.valor || ""}
                onChange={(e) => setEditingPendencia(prev => 
                  prev ? { ...prev, valor: e.target.value } : null
                )}
                placeholder="0,00"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="editObservacao">Observação</Label>
              <Textarea
                id="editObservacao"
                value={editingPendencia?.observacao || ""}
                onChange={(e) => setEditingPendencia(prev => 
                  prev ? { ...prev, observacao: e.target.value } : null
                )}
                placeholder="Descrição da pendência..."
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSalvarEdicao}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Pendencias;