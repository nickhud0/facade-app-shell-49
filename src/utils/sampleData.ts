import { databaseService, Material, Transacao, Vale, Despesa, Pendencia } from '@/services/database';

export const sampleMateriais: Omit<Material, 'id'>[] = [
  {
    nome: "Latinha de Alumínio",
    preco_compra_kg: 5.50,
    preco_venda_kg: 7.00,
    categoria: "Alumínio",
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    nome: "Cobre Limpo",
    preco_compra_kg: 28.00,
    preco_venda_kg: 32.00,
    categoria: "Cobre",
    created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    nome: "Ferro Velho",
    preco_compra_kg: 0.80,
    preco_venda_kg: 1.20,
    categoria: "Metais Ferrosos",
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    nome: "Aço Inox",
    preco_compra_kg: 4.50,
    preco_venda_kg: 6.50,
    categoria: "Metais Não-Ferrosos",
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    nome: "Bateria de Carro",
    preco_compra_kg: 2.80,
    preco_venda_kg: 4.20,
    categoria: "Sucata Eletrônica",
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    nome: "Fio de Cobre",
    preco_compra_kg: 24.00,
    preco_venda_kg: 28.00,
    categoria: "Cobre",
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const sampleTransacoes: Omit<Transacao, 'id'>[] = [
  // Compras
  {
    tipo: 'compra',
    material_id: 1, // Latinha de Alumínio
    peso: 15.5,
    valor_total: 85.25,
    observacoes: "Compra inicial - lote de latinhas",
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    tipo: 'compra',
    material_id: 2, // Cobre Limpo
    peso: 8.2,
    valor_total: 229.60,
    observacoes: "Cobre de qualidade alta",
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    tipo: 'compra',
    material_id: 3, // Ferro Velho
    peso: 120.0,
    valor_total: 96.00,
    observacoes: "Lote grande de ferro",
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  
  // Vendas
  {
    tipo: 'venda',
    material_id: 1, // Latinha de Alumínio
    peso: 10.0,
    valor_total: 70.00,
    observacoes: "Venda para empresa recicladora",
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    tipo: 'venda',
    material_id: 3, // Ferro Velho
    peso: 80.0,
    valor_total: 96.00,
    observacoes: "Venda para siderúrgica",
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const sampleVales: Omit<Vale, 'id'>[] = [
  {
    valor: 150.00,
    descricao: "Vale para João Silva - compra de cobre",
    status: "pendente",
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    valor: 80.00,
    descricao: "Vale para Maria Santos - latinha de alumínio",
    status: "pago",
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const sampleDespesas: Omit<Despesa, 'id'>[] = [
  {
    descricao: "Combustível para caminhão",
    valor: 120.00,
    categoria: "Transporte",
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    descricao: "Balança nova",
    valor: 350.00,
    categoria: "Equipamentos",
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    descricao: "Manutenção da prensa",
    valor: 200.00,
    categoria: "Manutenção",
    created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const samplePendencias: Omit<Pendencia, 'id'>[] = [
  {
    descricao: "Limpeza do pátio de materiais",
    valor: 200.00,
    status: "pendente",
    prioridade: "alta",
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    descricao: "Comprar sacos para armazenamento",
    valor: 80.00,
    status: "pendente",
    prioridade: "media",
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const initializeSampleData = async (): Promise<void> => {
  try {
    console.log('🌱 Checking if sample data needs to be initialized...');
    
    // Verificar se já existem dados no cache
    const existingMateriais = await databaseService.getCachedMateriais();
    
    if (existingMateriais.length > 0) {
      console.log('✅ Sample data already exists, skipping initialization');
      return;
    }

    console.log('🌱 Initializing sample data...');

    // Criar materiais com IDs incrementais
    const materiaisComId: Material[] = sampleMateriais.map((material, index) => ({
      ...material,
      id: index + 1
    }));

    // Criar transações com IDs incrementais
    const transacoesComId: Transacao[] = sampleTransacoes.map((transacao, index) => ({
      ...transacao,
      id: index + 1
    }));

    // Criar vales com IDs incrementais
    const valesComId: Vale[] = sampleVales.map((vale, index) => ({
      ...vale,
      id: index + 1
    }));

    // Criar despesas com IDs incrementais
    const despesasComId: Despesa[] = sampleDespesas.map((despesa, index) => ({
      ...despesa,
      id: index + 1
    }));

    // Criar pendências com IDs incrementais
    const pendenciasComId: Pendencia[] = samplePendencias.map((pendencia, index) => ({
      ...pendencia,
      id: index + 1
    }));

    // Salvar no cache local
    await databaseService.cacheMateriais(materiaisComId);
    await databaseService.cacheTransacoes(transacoesComId);
    await databaseService.cacheVales(valesComId);
    await databaseService.cacheDespesas(despesasComId);
    await databaseService.cachePendencias(pendenciasComId);

    // Marcar que os dados de exemplo foram inicializados
    await databaseService.setConfig('sample_data_initialized', 'true');

    console.log('✅ Sample data initialized successfully');
    console.log(`- ${materiaisComId.length} materiais`);
    console.log(`- ${transacoesComId.length} transações`);
    console.log(`- ${valesComId.length} vales`);
    console.log(`- ${despesasComId.length} despesas`);
    console.log(`- ${pendenciasComId.length} pendências`);

  } catch (error) {
    console.error('❌ Error initializing sample data:', error);
  }
};

export const resetSampleData = async (): Promise<void> => {
  try {
    console.log('🔄 Resetting sample data...');
    
    // Limpar configuração
    await databaseService.setConfig('sample_data_initialized', 'false');
    
    // Reinicializar
    await initializeSampleData();
    
    console.log('✅ Sample data reset completed');
  } catch (error) {
    console.error('❌ Error resetting sample data:', error);
  }
};