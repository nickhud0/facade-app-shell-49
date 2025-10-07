import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppInitializer } from "./components/AppInitializer";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Compra from "./pages/Compra";
import Venda from "./pages/Venda";
import ComandaAtual from "./pages/ComandaAtual";
import HistoricoComandas from "./pages/HistoricoComandas";
import Fechamento from "./pages/Fechamento";
import Relatorios from "./pages/Relatorios";
import Ultimos from "./pages/Ultimos";
import TabelaPrecos from "./pages/TabelaPrecos";
import Estoque from "./pages/Estoque";
import CadastrarMaterial from "./pages/CadastrarMaterial";
import CadastrarDespesa from "./pages/CadastrarDespesa";
import Vale from "./pages/Vale";
import Pendencias from "./pages/Pendencias";
import Configuracoes from "./pages/Configuracoes";
import ImprimirComanda from "./pages/ImprimirComanda";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInitializer>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/compra" element={<Compra />} />
            <Route path="/venda" element={<Venda />} />
            <Route path="/comanda-atual" element={<ComandaAtual />} />
            <Route path="/historico-comandas" element={<HistoricoComandas />} />
            <Route path="/fechamento" element={<Fechamento />} />
            <Route path="/relatorios" element={<Relatorios />} />
            <Route path="/ultimos" element={<Ultimos />} />
            <Route path="/tabela-precos" element={<TabelaPrecos />} />
            <Route path="/estoque" element={<Estoque />} />
            <Route path="/cadastrar-material" element={<CadastrarMaterial />} />
            <Route path="/cadastrar-despesa" element={<CadastrarDespesa />} />
            <Route path="/vale" element={<Vale />} />
            <Route path="/pendencias" element={<Pendencias />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
            <Route path="/imprimir-comanda" element={<ImprimirComanda />} />
            <Route path="/imprimir-comanda/:comandaId" element={<ImprimirComanda />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AppInitializer>
    </QueryClientProvider>
  );
};

export default App;