import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';

// Mock data interfaces
interface Material {
  id: number;
  nome: string;
  categoria: string;
  preco_compra: number;
  preco_venda: number;
}

interface Transacao {
  id: number;
  tipo: 'compra' | 'venda';
  material_id: number;
  peso: number;
  valor: number;
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
  comandas: Comanda[];
  addTransacao: (transacao: Omit<Transacao, 'id' | 'created_at'>) => void;
  addMaterial: (material: Omit<Material, 'id'>) => void;
  isOnline: boolean;
}

const MockDataContext = createContext<MockDataContextType | undefined>(undefined);

// Mock data
const mockMateriais: Material[] = [
  { id: 1, nome: 'Papel', categoria: 'Papel', preco_compra: 1.50, preco_venda: 2.00 },
  { id: 2, nome: 'Plástico PET', categoria: 'Plástico', preco_compra: 2.00, preco_venda: 2.50 },
  { id: 3, nome: 'Alumínio', categoria: 'Metal', preco_compra: 5.00, preco_venda: 6.00 },
  { id: 4, nome: 'Ferro', categoria: 'Metal', preco_compra: 1.20, preco_venda: 1.80 },
  { id: 5, nome: 'Papelão', categoria: 'Papel', preco_compra: 0.80, preco_venda: 1.20 },
];

const mockTransacoes: Transacao[] = [
  {
    id: 1,
    tipo: 'compra',
    material_id: 1,
    peso: 10.5,
    valor: 15.75,
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    tipo: 'venda',
    material_id: 1,
    peso: 8.0,
    valor: 16.00,
    created_at: new Date().toISOString(),
  },
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
  const [comandas, setComandas] = useState<Comanda[]>(mockComandas);
  const [isOnline] = useState(true);

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
        comandas,
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