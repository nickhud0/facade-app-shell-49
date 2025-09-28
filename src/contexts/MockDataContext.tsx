import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';

// Mock data interfaces
interface Material {
  id: number;
  nome: string;
  categoria: string;
  preco_compra: number;
  preco_venda: number;
  unidade: string;
  created_at: string;
}

interface Transacao {
  id: number;
  tipo: 'compra' | 'venda';
  material_id: number;
  peso: number;
  valor_total: number;
  created_at: string;
}

interface Vale {
  id: number;
  nome_cliente: string;
  valor: number;
  status: 'pendente' | 'pago';
  created_at: string;
}

interface Despesa {
  id: number;
  descricao: string;
  valor: number;
  categoria: string;
  created_at: string;
}

interface Comanda {
  id: number;
  codigo: string;
  status: 'aberta' | 'fechada';
  valor_total: number;
  created_at: string;
}

interface MockDataContextType {
  materiais: Material[];
  transacoes: Transacao[];
  vales: Vale[];
  despesas: Despesa[];
  comandas: Comanda[];
  loading: boolean;
  addTransacao: (transacao: Omit<Transacao, 'id' | 'created_at'>) => void;
  addMaterial: (material: Omit<Material, 'id'>) => void;
  isOnline: boolean;
}

const MockDataContext = createContext<MockDataContextType | undefined>(undefined);

// Mock data
const mockMateriais: Material[] = [
  { id: 1, nome: 'Papel', categoria: 'Papel', preco_compra: 1.50, preco_venda: 2.00, unidade: 'kg', created_at: new Date().toISOString() },
  { id: 2, nome: 'Plástico PET', categoria: 'Plástico', preco_compra: 2.00, preco_venda: 2.50, unidade: 'kg', created_at: new Date().toISOString() },
  { id: 3, nome: 'Alumínio', categoria: 'Metal', preco_compra: 5.00, preco_venda: 6.00, unidade: 'kg', created_at: new Date().toISOString() },
  { id: 4, nome: 'Ferro', categoria: 'Metal', preco_compra: 1.20, preco_venda: 1.80, unidade: 'kg', created_at: new Date().toISOString() },
  { id: 5, nome: 'Papelão', categoria: 'Papel', preco_compra: 0.80, preco_venda: 1.20, unidade: 'kg', created_at: new Date().toISOString() },
];

const mockTransacoes: Transacao[] = [
  {
    id: 1,
    tipo: 'venda',
    material_id: 1,
    peso: 15.5,
    valor_total: 31.00,
    created_at: new Date().toISOString()
  },
  {
    id: 2, 
    tipo: 'compra',
    material_id: 2,
    peso: 25.2,
    valor_total: 50.40,
    created_at: new Date(Date.now() - 86400000).toISOString() // 1 day ago
  },
  {
    id: 3,
    tipo: 'venda',
    material_id: 1,
    peso: 8.7,
    valor_total: 17.40,
    created_at: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
  },
  {
    id: 4,
    tipo: 'venda',
    material_id: 3,
    peso: 12.3,
    valor_total: 24.60,
    created_at: new Date(Date.now() - 7200000).toISOString() // 2 hours ago
  },
  {
    id: 5,
    tipo: 'compra',
    material_id: 1,
    peso: 30.0,
    valor_total: 45.00,
    created_at: new Date(Date.now() - 10800000).toISOString() // 3 hours ago
  },
  {
    id: 6,
    tipo: 'venda',
    material_id: 2,
    peso: 18.9,
    valor_total: 37.80,
    created_at: new Date(Date.now() - 14400000).toISOString() // 4 hours ago
  }
];

const mockVales: Vale[] = [
  {
    id: 1,
    nome_cliente: 'João Silva',
    valor: 50.00,
    status: 'pendente',
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    nome_cliente: 'Maria Santos',
    valor: 75.50,
    status: 'pago',
    created_at: new Date(Date.now() - 86400000).toISOString()
  }
];

const mockDespesas: Despesa[] = [
  {
    id: 1,
    descricao: 'Combustível caminhão',
    valor: 200.00,
    categoria: 'Transporte',
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    descricao: 'Material de limpeza',
    valor: 45.50,
    categoria: 'Limpeza',
    created_at: new Date(Date.now() - 86400000).toISOString()
  }
];

const mockComandas: Comanda[] = [
  {
    id: 1,
    codigo: 'CMD001',
    status: 'fechada',
    valor_total: 125.50,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

export const MockDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [materiais, setMateriais] = useState<Material[]>(mockMateriais);
  const [transacoes, setTransacoes] = useState<Transacao[]>(mockTransacoes);
  const [vales, setVales] = useState<Vale[]>(mockVales);
  const [despesas, setDespesas] = useState<Despesa[]>(mockDespesas);
  const [comandas, setComandas] = useState<Comanda[]>(mockComandas);
  const [isOnline] = useState(true);
  const [loading] = useState(false);

  const addTransacao = (transacao: Omit<Transacao, 'id' | 'created_at'>) => {
    const newTransacao: Transacao = {
      ...transacao,
      id: Date.now(),
      created_at: new Date().toISOString(),
    };
    setTransacoes(prev => [newTransacao, ...prev]);
    toast.success(`${transacao.tipo === 'compra' ? 'Compra' : 'Venda'} registrada com sucesso!`);
  };

  const addMaterial = (material: Omit<Material, 'id'>) => {
    const newMaterial: Material = {
      ...material,
      id: Date.now(),
    };
    setMateriais(prev => [...prev, newMaterial]);
    toast.success('Material cadastrado com sucesso!');
  };

  return (
    <MockDataContext.Provider
      value={{
        materiais,
        transacoes,
        vales,
        despesas,
        comandas,
        loading,
        addTransacao,
        addMaterial,
        isOnline,
      }}
    >
      {children}
    </MockDataContext.Provider>
  );
};

export const useMockData = () => {
  const context = useContext(MockDataContext);
  if (context === undefined) {
    throw new Error('useMockData must be used within a MockDataProvider');
  }
  return context;
};