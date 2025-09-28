import React from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calculator, TrendingUp, DollarSign } from 'lucide-react';
import { useMockData } from '@/contexts/MockDataContext';
import { toast } from 'sonner';

export default function Fechamento() {
  const { transacoes } = useMockData();

  // Calcular totais do dia
  const hoje = new Date().toDateString();
  const transacoesHoje = transacoes.filter(t => 
    new Date(t.created_at).toDateString() === hoje
  );

  const totalCompras = transacoesHoje
    .filter(t => t.tipo === 'compra')
    .reduce((acc, t) => acc + t.valor_total, 0);

  const totalVendas = transacoesHoje
    .filter(t => t.tipo === 'venda')
    .reduce((acc, t) => acc + t.valor_total, 0);

  const lucro = totalVendas - totalCompras;

  const handleRealizarFechamento = () => {
    // Simular fechamento
    const fechamento = {
      id: Date.now(),
      data: new Date().toISOString(),
      totalCompras,
      totalVendas,
      lucro,
      transacoes: transacoesHoje.length
    };

    const fechamentos = JSON.parse(localStorage.getItem('fechamentos') || '[]');
    fechamentos.unshift(fechamento);
    localStorage.setItem('fechamentos', JSON.stringify(fechamentos));

    toast.success('Fechamento realizado com sucesso!');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation title="Fechamento do Dia" />
      
      <div className="p-4 space-y-6">
        {/* Resumo do Período */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Período Atual - {new Date().toLocaleDateString('pt-BR')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-600">
                  R$ {totalVendas.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">Receitas</p>
              </div>
              
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <DollarSign className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-600">
                  R$ {totalCompras.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">Compras</p>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <Calculator className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-purple-600">
                  R$ {lucro.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">Lucro</p>
              </div>
            </div>

            <div className="pt-4">
              <p className="text-center text-muted-foreground mb-4">
                Total de transações: {transacoesHoje.length}
              </p>
              
              <Button 
                onClick={handleRealizarFechamento}
                className="w-full"
                disabled={transacoesHoje.length === 0}
              >
                Realizar Fechamento
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}