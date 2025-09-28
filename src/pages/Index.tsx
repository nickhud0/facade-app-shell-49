import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ShoppingCart, 
  TrendingUp, 
  History, 
  Package, 
  FileText, 
  Settings, 
  Calculator,
  Printer,
  Package2,
  Clock
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { useMockData } from '@/contexts/MockDataContext';

const menuItems = [
  { title: 'Compra', path: '/compra', icon: ShoppingCart, color: 'text-primary' },
  { title: 'Venda', path: '/venda', icon: TrendingUp, color: 'text-success' },
  { title: 'Histórico', path: '/historico', icon: History, color: 'text-accent' },
  { title: 'Últimos', path: '/ultimos', icon: Clock, color: 'text-warning' },
  { title: 'Estoque', path: '/estoque', icon: Package, color: 'text-primary' },
  { title: 'Relatórios', path: '/relatorios', icon: FileText, color: 'text-destructive' },
  { title: 'Vale', path: '/vale', icon: Calculator, color: 'text-accent' },
  { title: 'Tabela de Preços', path: '/tabela-precos', icon: Package2, color: 'text-primary' },
  { title: 'Fechamento', path: '/fechamento', icon: Calculator, color: 'text-success' },
  { title: 'Configurações', path: '/configuracoes', icon: Settings, color: 'text-muted-foreground' },
];

export default function Index() {
  const navigate = useNavigate();
  const { isOnline } = useMockData();

  return (
    <div className="min-h-screen bg-background">
      <Navigation title="Reciclagem Perequê" showBack={false} />
      
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Sistema de Reciclagem
          </h1>
          <p className="text-muted-foreground text-sm">
            Gestão completa de materiais recicláveis
          </p>
          <div className="flex items-center justify-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-success' : 'bg-warning'}`} />
            <span className="text-xs text-muted-foreground">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Print Last Command Button */}
        <Card>
          <CardContent className="p-4">
            <Button 
              className="w-full h-12 text-base font-semibold"
              onClick={() => navigate('/comanda-atual')}
            >
              <Printer className="mr-2 h-5 w-5" />
              Imprimir Última Comanda
            </Button>
          </CardContent>
        </Card>

        {/* Menu Grid */}
        <div className="grid grid-cols-2 gap-4">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <Card 
                key={item.title}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(item.path)}
              >
                <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
                  <div className={`p-3 rounded-full bg-muted ${item.color}`}>
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <span className="font-medium text-sm leading-tight">
                    {item.title}
                  </span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}