import { syncService } from '../services/syncService';
import { offlineQueueService } from '../services/offlineQueue';
import { supabaseService } from '../services/supabaseService';
import { networkService } from '../services/networkService';

// Mock dos serviços
jest.mock('../services/offlineQueue');
jest.mock('../services/supabaseService');
jest.mock('../services/networkService');

const mockOfflineQueueService = offlineQueueService as jest.Mocked<typeof offlineQueueService>;
const mockSupabaseService = supabaseService as jest.Mocked<typeof supabaseService>;
const mockNetworkService = networkService as jest.Mocked<typeof networkService>;

describe('SyncService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processSyncQueue', () => {
    it('should process sync queue successfully when online', async () => {
      mockNetworkService.getConnectionStatus.mockReturnValue(true);
      mockSupabaseService.getConnectionStatus.mockReturnValue(true);
      mockOfflineQueueService.processQueue.mockResolvedValue({ success: 2, failed: 0 });

      const result = await syncService.processSyncQueue();

      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.errors).toEqual([]);
      expect(mockOfflineQueueService.processQueue).toHaveBeenCalled();
    });

    it('should return error when offline', async () => {
      mockNetworkService.getConnectionStatus.mockReturnValue(false);

      const result = await syncService.processSyncQueue();

      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.errors).toContain('No network connection');
    });

    it('should return error when Supabase not connected', async () => {
      mockNetworkService.getConnectionStatus.mockReturnValue(true);
      mockSupabaseService.getConnectionStatus.mockReturnValue(false);

      const result = await syncService.processSyncQueue();

      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.errors).toContain('Supabase not connected');
    });

    it('should handle partial sync failures', async () => {
      mockNetworkService.getConnectionStatus.mockReturnValue(true);
      mockSupabaseService.getConnectionStatus.mockReturnValue(true);
      mockOfflineQueueService.processQueue.mockResolvedValue({ success: 1, failed: 2 });

      const result = await syncService.processSyncQueue();

      expect(result.success).toBe(1);
      expect(result.failed).toBe(2);
      expect(result.errors).toContain('Some items failed to sync');
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      const mockStats = { pending: 3, failed: 1, total: 4 };
      mockOfflineQueueService.getQueueStats.mockReturnValue(mockStats);

      const stats = await syncService.getQueueStats();

      expect(stats).toEqual(mockStats);
      expect(mockOfflineQueueService.getQueueStats).toHaveBeenCalled();
    });
  });

  describe('isSyncInProgress', () => {
    it('should return false when no sync is running', () => {
      expect(syncService.isSyncInProgress()).toBe(false);
    });
  });
});