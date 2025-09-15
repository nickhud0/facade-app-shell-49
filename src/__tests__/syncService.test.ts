import { syncService } from '../services/syncService';
import { databaseV2Service } from '../services/databaseV2';
import { supabaseService } from '../services/supabase';

// Mock dos serviços
jest.mock('../services/databaseV2');
jest.mock('../services/supabase');

const mockDatabaseV2Service = databaseV2Service as jest.Mocked<typeof databaseV2Service>;
const mockSupabaseService = supabaseService as jest.Mocked<typeof supabaseService>;

describe('SyncService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processSyncQueue', () => {
    it('should process pending sync items successfully', async () => {
      const mockItems = [
        {
          id: 1,
          tipo_acao: 'criar_comanda',
          dados: JSON.stringify({ numero: 'CMD001', tipo: 'venda' }),
          tentativas: 0,
          status: 'pending' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      mockDatabaseV2Service.getPendingSyncItems.mockResolvedValue(mockItems);
      mockDatabaseV2Service.updateSyncItemStatus.mockResolvedValue();
      mockDatabaseV2Service.clearSyncedItems.mockResolvedValue();
      
      // Mock do cliente Supabase
      mockSupabaseService.client = {
        from: jest.fn().mockReturnValue({
          insert: jest.fn().mockResolvedValue({ error: null })
        })
      } as any;

      const result = await syncService.processSyncQueue();

      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
      expect(mockDatabaseV2Service.updateSyncItemStatus).toHaveBeenCalledWith(1, 'synced');
    });

    it('should handle sync failures with retry logic', async () => {
      const mockItems = [
        {
          id: 1,
          tipo_acao: 'criar_comanda',
          dados: JSON.stringify({ numero: 'CMD001' }),
          tentativas: 0,
          status: 'pending' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      mockDatabaseV2Service.getPendingSyncItems.mockResolvedValue(mockItems);
      mockDatabaseV2Service.updateSyncItemStatus.mockResolvedValue();
      
      // Mock falha na sincronização
      mockSupabaseService.client = {
        from: jest.fn().mockReturnValue({
          insert: jest.fn().mockResolvedValue({ error: { message: 'Connection failed' } })
        })
      } as any;

      const result = await syncService.processSyncQueue();

      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(mockDatabaseV2Service.updateSyncItemStatus).toHaveBeenCalledWith(1, 'failed');
    });

    it('should skip items that exceed max retries', async () => {
      const mockItems = [
        {
          id: 1,
          tipo_acao: 'criar_comanda',
          dados: JSON.stringify({ numero: 'CMD001' }),
          tentativas: 6, // Excede o máximo de 5
          status: 'pending' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      mockDatabaseV2Service.getPendingSyncItems.mockResolvedValue(mockItems);
      mockDatabaseV2Service.clearSyncedItems.mockResolvedValue();

      const result = await syncService.processSyncQueue();

      expect(result.errors).toContain('Max retries exceeded for item 1');
      expect(mockDatabaseV2Service.updateSyncItemStatus).not.toHaveBeenCalled();
    });
  });

  describe('backoff logic', () => {
    it('should calculate next sync attempt correctly', async () => {
      const item = {
        tentativas: 2,
        updated_at: new Date('2023-01-01T10:00:00Z').toISOString()
      };

      const nextAttempt = await syncService.getNextSyncAttempt(item);
      const expectedDelay = 1000 * Math.pow(2, 2); // 4 segundos
      const expectedTime = new Date('2023-01-01T10:00:00Z').getTime() + expectedDelay;

      expect(nextAttempt.getTime()).toBe(expectedTime);
    });
  });

  describe('isSyncInProgress', () => {
    it('should return false when no sync is running', () => {
      expect(syncService.isSyncInProgress()).toBe(false);
    });
  });
});