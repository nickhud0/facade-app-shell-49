import { ArrowLeft, Clock, FileText, ShoppingCart, Package } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// Dados mock para últimos lançamentos de materiais
const ultimosLancamentos = [
  {
    id: 1,
    tipo: "Venda",
    material: "Latinha de Alumínio",
    peso: 2.5,
    valor: 12.50,
    horario: "15:42",
    icon: Package,
    color: "success"
  },
  {
    id: 2,
    tipo: "Compra",
    material: "Cobre",
    peso: 1.8,
    valor: -36.00,
    horario: "15:20",
    icon: Package,
    color: "primary"
  },
  {
    id: 3,
    tipo: "Venda",
    material: "Ferro",
    peso: 5.2,
    valor: 15.60,
    horario: "14:55",
    icon: Package,
    color: "success"
  },
  {
    id: 4,
    tipo: "Compra",
    material: "Alumínio",
    peso: 3.1,
    valor: -24.80,
    horario: "14:30",
    icon: Package,
    color: "primary"
  },
  {
    id: 5,
    tipo: "Venda",
    material: "Latinha de Refrigerante",
    peso: 1.9,
    valor: 9.50,
    horario: "14:10",
    icon: Package,
    color: "success"
  },
  {
    id: 6,
    tipo: "Compra",
    material: "Bronze",
    peso: 0.8,
    valor: -12.00,
    horario: "13:45",
    icon: Package,
    color: "primary"
  },
  {
    id: 7,
    tipo: "Venda",
    material: "Aço Inoxidável",
    peso: 2.3,
    valor: 18.40,
    horario: "13:20",
    icon: Package,
    color: "success"
  },
  {
    id: 8,
    tipo: "Compra",
    material: "Cobre Vermelho",
    peso: 1.5,
    valor: -30.00,
    horario: "12:58",
    icon: Package,
    color: "primary"
  },
  {
    id: 9,
    tipo: "Venda",
    material: "Ferro Fundido",
    peso: 4.7,
    valor: 14.10,
    horario: "12:35",
    icon: Package,
    color: "success"
  },
  {
    id: 10,
    tipo: "Compra",
    material: "Latão",
    peso: 1.2,
    valor: -18.00,
    horario: "12:15",
    icon: Package,
    color: "primary"
  },
  {
    id: 11,
    tipo: "Venda",
    material: "Sucata de Ferro",
    peso: 8.5,
    valor: 25.50,
    horario: "11:50",
    icon: Package,
    color: "success"
  },
  {
    id: 12,
    tipo: "Compra",
    material: "Chumbo",
    peso: 2.0,
    valor: -20.00,
    horario: "11:25",
    icon: Package,
    color: "primary"
  },
  {
    id: 13,
    tipo: "Venda",
    material: "Alumínio Puro",
    peso: 3.8,
    valor: 30.40,
    horario: "11:00",
    icon: Package,
    color: "success"
  },
  {
    id: 14,
    tipo: "Compra",
    material: "Ferro Galvanizado",
    peso: 6.2,
    valor: -31.00,
    horario: "10:40",
    icon: Package,
    color: "primary"
  },
  {
    id: 15,
    tipo: "Venda",
    material: "Cobre de Motor",
    peso: 2.7,
    valor: 54.00,
    horario: "10:15",
    icon: Package,
    color: "success"
  }
];

const Ultimos = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" className="mr-3" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        <h1 className="text-2xl font-bold text-foreground">Últimos Lançamentos</h1>
      </div>

      {/* Resumo do Período */}
      <Card className="mb-6 p-4 bg-gradient-to-r from-accent/10 to-primary/10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Atividade de Hoje</h2>
            <p className="text-sm text-muted-foreground">Últimas movimentações</p>
          </div>
          <Clock className="h-8 w-8 text-accent" />
        </div>
      </Card>

      {/* Lista de Lançamentos */}
      <div className="space-y-2">
        {ultimosLancamentos.slice(0, 10).map((lancamento) => {
          const IconComponent = lancamento.icon;
          return (
            <Card key={lancamento.id} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`p-1.5 rounded-full bg-${lancamento.color}/10 mr-3`}>
                    <IconComponent className={`h-3 w-3 text-${lancamento.color}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full bg-${lancamento.color}/10 text-${lancamento.color} font-medium`}>
                        {lancamento.tipo}
                      </span>
                      <h3 className="font-semibold text-foreground text-sm">
                        {lancamento.material}
                      </h3>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{lancamento.peso} kg</span>
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {lancamento.horario}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p className={`font-bold text-sm ${
                    lancamento.valor > 0 ? 'text-success' : 'text-destructive'
                  }`}>
                    {lancamento.valor > 0 ? '+' : ''}R$ {Math.abs(lancamento.valor).toFixed(2)}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Ultimos;