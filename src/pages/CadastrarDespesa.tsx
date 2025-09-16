import { ArrowLeft, Save, Receipt } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Despesa {
  id: number;
  descricao: string;
  valor: number;
  created_at: string;
}

import { formatCurrency } from "@/utils/formatters";

const CadastrarDespesa = () => {
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Carregar despesas do localStorage
  useEffect(() => {
    const despesasStorage = JSON.parse(localStorage.getItem('despesas') || '[]');
    setDespesas(despesasStorage);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!descricao.trim() || !valor) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    const novaDespesa: Despesa = {
      id: Date.now(),
      descricao: descricao.trim(),
      valor: parseFloat(valor),
      created_at: new Date().toISOString()
    };

    // Salvar no localStorage
    const despesasAtualizadas = [novaDespesa, ...despesas];
    localStorage.setItem('despesas', JSON.stringify(despesasAtualizadas));
    setDespesas(despesasAtualizadas);

    // Limpar formulário
    setDescricao("");
    setValor("");

    toast({
      title: "Sucesso",
      description: "Despesa registrada com sucesso!"
    });
  };

  // Filtrar despesas do mês atual
  const hoje = new Date();
  const despesasDoMes = despesas.filter(despesa => {
    const dataDespesa = new Date(despesa.created_at);
    return dataDespesa.getMonth() === hoje.getMonth() && 
           dataDespesa.getFullYear() === hoje.getFullYear();
  });
  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" className="mr-3" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Cadastrar Despesa</h1>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-4">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center">
            <Receipt className="mr-2 h-5 w-5" />
            Nova Despesa
          </h2>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="observacao">Descrição *</Label>
              <Textarea 
                id="observacao"
                placeholder="Descrição da despesa..."
                className="mt-1 min-h-20"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="valor">Valor (R$) *</Label>
              <Input 
                id="valor"
                type="number"
                step="0.01"
                placeholder="0.00"
                className="mt-1"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                required
              />
            </div>
          </div>
        </Card>

        {/* Botão de Ação */}
        <Button 
          type="submit"
          className="w-full h-12 bg-gradient-to-r from-warning to-warning/80 border-0"
        >
          <Save className="mr-2 h-5 w-5" />
          Registrar Despesa
        </Button>
      </form>

      {/* Histórico de Despesas do Mês Atual */}
      <Card className="mt-6 p-4">
        <h3 className="font-semibold text-foreground mb-3">
          Despesas do Mês Atual ({format(hoje, "MMMM/yyyy")})
        </h3>
        
        {despesasDoMes.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            <p>Nenhuma despesa registrada neste mês</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-4 p-3 bg-muted/10 rounded-lg font-medium text-muted-foreground text-sm">
              <span>Descrição</span>
              <span>Valor</span>
              <span>Data</span>
            </div>
            
            {despesasDoMes.map((despesa) => (
              <div key={despesa.id} className="grid grid-cols-3 gap-4 p-3 bg-muted/20 rounded-lg">
                <span className="font-medium text-foreground">{despesa.descricao}</span>
                <span className="font-bold text-destructive">{formatCurrency(despesa.valor)}</span>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(despesa.created_at), "dd/MM/yyyy")}
                </span>
              </div>
            ))}

            {/* Total do mês */}
            <div className="border-t pt-3 mt-4">
              <div className="flex justify-between items-center p-3 bg-destructive/10 rounded-lg">
                <span className="font-semibold text-foreground">Total do Mês:</span>
                <span className="font-bold text-lg text-destructive">
                  {formatCurrency(despesasDoMes.reduce((acc, despesa) => acc + despesa.valor, 0))}
                </span>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default CadastrarDespesa;