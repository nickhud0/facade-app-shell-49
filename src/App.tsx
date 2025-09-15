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
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<div className="p-8"><h1 className="text-2xl">App funcionando!</h1></div>} />
          <Route path="*" element={<div className="p-8"><h1 className="text-2xl">Página não encontrada</h1></div>} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;