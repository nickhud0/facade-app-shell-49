import { databaseV2Service } from '../services/databaseV2';

// Mock do Capacitor para testes
jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => false
  }
}));

describe('DatabaseV2Service', () => {
  beforeEach(() => {
    // Limpar localStorage antes de cada teste
    localStorage.clear();
  });

  describe('Comanda operations', () => {
    it('should save and retrieve comanda with items', async () => {
      const comanda = {
        id: 1,
        numero: 'CMD001',
        prefixo_dispositivo: 'A',
        numero_local: 1,
        tipo: 'venda' as const,
        total: 100.50,
        status: 'finalizada' as const,
        cliente: 'Cliente Teste',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const itens = [
        {
          material_id: 1,
          material_nome: 'Material Teste',
          preco: 50.25,
          quantidade: 2,
          total: 100.50
        }
      ];

      await databaseV2Service.saveComanda(comanda, itens);
      const retrieved = await databaseV2Service.getComandaWithItens(1);

      expect(retrieved).toBeTruthy();
      expect(retrieved?.numero).toBe('CMD001');
      expect(retrieved?.itens).toHaveLength(1);
      expect(retrieved?.itens?.[0]?.material_nome).toBe('Material Teste');
    });

    it('should get recent comandas', async () => {
      const comandas = [
        {
          id: 1,
          numero: 'CMD001',
          prefixo_dispositivo: 'A',
          numero_local: 1,
          tipo: 'venda' as const,
          total: 100,
          status: 'finalizada' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 2,
          numero: 'CMD002',
          prefixo_dispositivo: 'A',
          numero_local: 2,
          tipo: 'compra' as const,
          total: 200,
          status: 'finalizada' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      for (const comanda of comandas) {
        await databaseV2Service.saveComanda(comanda, []);
      }

      const recentes = await databaseV2Service.getComandasRecentes(10);
      expect(recentes).toHaveLength(2);
    });
  });

  describe('Sync queue operations', () => {
    it('should add item to sync queue', async () => {
      const dados = { teste: 'valor' };
      
      await databaseV2Service.addToSyncQueue('criar_comanda', dados);
      
      const pending = await databaseV2Service.getPendingSyncItems();
      expect(pending).toHaveLength(1);
      expect(pending[0].tipo_acao).toBe('criar_comanda');
      expect(JSON.parse(pending[0].dados)).toEqual(dados);
    });

    it('should update sync item status', async () => {
      await databaseV2Service.addToSyncQueue('criar_material', { nome: 'Teste' });
      
      const pending = await databaseV2Service.getPendingSyncItems();
      const itemId = pending[0].id;
      
      await databaseV2Service.updateSyncItemStatus(itemId, 'synced');
      
      const afterUpdate = await databaseV2Service.getPendingSyncItems();
      expect(afterUpdate).toHaveLength(0);
    });

    it('should clear synced items', async () => {
      await databaseV2Service.addToSyncQueue('criar_comanda', { numero: 'CMD001' });
      await databaseV2Service.addToSyncQueue('criar_material', { nome: 'Material' });
      
      const pending = await databaseV2Service.getPendingSyncItems();
      await databaseV2Service.updateSyncItemStatus(pending[0].id, 'synced');
      
      await databaseV2Service.clearSyncedItems();
      
      const remaining = await databaseV2Service.getPendingSyncItems();
      expect(remaining).toHaveLength(1);
    });
  });
});