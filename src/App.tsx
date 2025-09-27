import React from "react";
import { Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Index from "@/pages/Index";
import Relatorios from "@/pages/Relatorios";
import ComandaAtual from "@/pages/ComandaAtual";
import Compra from "@/pages/Compra";
import Venda from "@/pages/Venda";
import Vale from "@/pages/Vale";
import Configuracoes from "@/pages/Configuracoes";
import HistoricoComandas from "@/pages/HistoricoComandas";
import TabelaPrecos from "@/pages/TabelaPrecos";
import Estoque from "@/pages/Estoque";
import Fechamento from "@/pages/Fechamento";
import NotFound from "@/pages/NotFound";
import { MockDataProvider } from "@/contexts/MockDataContext";

export default function App() {
  return (
    <MockDataProvider>
      <div className="min-h-screen bg-background">
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/relatorios" element={<Relatorios />} />
          <Route path="/comanda-atual" element={<ComandaAtual />} />
          <Route path="/compra" element={<Compra />} />
          <Route path="/venda" element={<Venda />} />
          <Route path="/vale" element={<Vale />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
          <Route path="/historico" element={<HistoricoComandas />} />
          <Route path="/tabela-precos" element={<TabelaPrecos />} />
          <Route path="/estoque" element={<Estoque />} />
          <Route path="/fechamento" element={<Fechamento />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster />
      </div>
    </MockDataProvider>
  );
}