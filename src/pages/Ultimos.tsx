import { ArrowLeft, Clock, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LoadingSpinner, ErrorState, PageWrapper, EmptyState } from "@/components/ui/loading-states";
import { useTransacoes } from "@/hooks/useStandardData";
import { formatCurrency, formatDate } from "@/utils/formatters";

const Ultimos = () => {
  const navigate = useNavigate();
  const { transacoes, loading, error, refreshTransacoes } = useTransacoes(15);

  const formatarTransacao = (transacao: any) => ({
    id: transacao.id,
    tipo: transacao.tipo === 'venda' ? 'Venda' : 'Compra',
    material: `Material ${transacao.material_id}`,
    peso: transacao.peso,
    valor: transacao.tipo === 'venda' ? transacao.valor_total : -transacao.valor_total,
    horario: new Date(transacao.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    icon: Package,
    color: transacao.tipo === 'venda' ? 'success' : 'primary'
  });

  const ultimosLancamentos = transacoes.map(formatarTransacao);

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
            <h2 className="text-lg font-semibold text-foreground">Atividade Recente</h2>
            <p className="text-sm text-muted-foreground">Últimas {ultimosLancamentos.length} movimentações</p>
          </div>
          <Clock className="h-8 w-8 text-accent" />
        </div>
      </Card>

      <PageWrapper 
        loading={loading} 
        error={error} 
        onRetry={refreshTransacoes}
        loadingMessage="Carregando últimos lançamentos..."
      >
        {ultimosLancamentos.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Nenhum lançamento encontrado"
            description="Ainda não há transações registradas no sistema"
          />
        ) : (
          /* Lista de Lançamentos */
          <div className="space-y-2">
            {ultimosLancamentos.map((lancamento) => {
              const IconComponent = lancamento.icon;
              return (
                <Card key={lancamento.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`p-1.5 rounded-full ${lancamento.color === 'success' ? 'bg-success/10' : 'bg-primary/10'} mr-3`}>
                        <IconComponent className={`h-3 w-3 ${lancamento.color === 'success' ? 'text-success' : 'text-primary'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${lancamento.color === 'success' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'} font-medium`}>
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
                        {lancamento.valor > 0 ? '+' : ''}{formatCurrency(Math.abs(lancamento.valor))}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </PageWrapper>
    </div>
  );
};

export default Ultimos;