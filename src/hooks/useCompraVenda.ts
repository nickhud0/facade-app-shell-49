import { useState, useEffect, useCallback } from 'react';
import { databaseService, Material } from '@/services/database';
import { supabaseService } from '@/services/supabase';
import { networkService } from '@/services/networkService';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';
import { toYMD } from '@/utils/formatters';

export interface UseCompraVendaReturn {
  materiais: Material[];
  loading: boolean;
  isOnline: boolean;
  addMaterial: (material: Omit<Material, 'id'>) => Promise<boolean>;
  refreshMateriais: () => Promise<void>;
}

export function useCompraVenda(): UseCompraVendaReturn {
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const { toast } = useToast();

  // Query específica para Compra/Venda: listar todos os materiais ordenados por nome
  const loadMateriais = useCallback(async () => {
    try {
      // Sempre usar cache local primeiro (para performance)
      const cachedMateriais = await databaseService.getCachedMateriais();
      setMateriais(cachedMateriais);
      
      return cachedMateriais;
    } catch (error) {
      console.error('Error loading materiais:', error);
      return [];
    }
  }, []);

  // Sincronizar materiais do servidor
  const syncFromServer = useCallback(async () => {
    if (!supabaseService.getConnectionStatus() || !isOnline) return;

    try {
      // Buscar todos os materiais do Supabase ordenados por nome
      const client = supabaseService.client;
      if (!client) return;

      const { data, error } = await client
        .from('material')
        .select('id, nome_material, categoria_material, preco_compra, preco_venda')
        .order('nome_material');

      if (error) throw error;

      // Transformar para formato local
      const materiaisFormatados: Material[] = (data || []).map(item => ({
        id: item.id,
        nome: item.nome_material,
        categoria: item.categoria_material,
        preco_compra_kg: item.preco_compra,
        preco_venda_kg: item.preco_venda,
        created_at: toYMD(new Date()),
        updated_at: new Date().toISOString()
      }));

      // Atualizar cache local
      await databaseService.cacheMateriais(materiaisFormatados);
      setMateriais(materiaisFormatados);

      toast({
        title: "Materiais sincronizados",
        description: `${materiaisFormatados.length} materiais atualizados`,
      });
    } catch (error) {
      console.error('Error syncing materiais:', error);
      toast({
        title: "Erro na sincronização",
        description: "Falha ao sincronizar materiais do servidor",
        variant: "destructive"
      });
    }
  }, [isOnline, toast]);

  // Refresh dos materiais
  const refreshMateriais = useCallback(async () => {
    setLoading(true);
    
    if (isOnline && supabaseService.getConnectionStatus()) {
      await syncFromServer();
    } else {
      await loadMateriais();
    }
    
    setLoading(false);
  }, [isOnline, syncFromServer, loadMateriais]);

  // Adicionar novo material (offline-first)
  const addMaterial = useCallback(async (material: Omit<Material, 'id'>): Promise<boolean> => {
    try {
      // Adicionar ao cache local primeiro
      await databaseService.addMaterialToCache(material);
      
      // Adicionar à fila de sincronização
      await databaseService.addToSyncQueue('criar_material', {
        nome_material: material.nome,
        categoria_material: material.categoria,
        preco_compra: material.preco_compra_kg,
        preco_venda: material.preco_venda_kg
      });
      
      // Se online, tentar sincronizar imediatamente
      if (isOnline && supabaseService.getConnectionStatus()) {
        const syncResult = await supabaseService.processSyncQueue();
        if (syncResult.success > 0) {
          await syncFromServer(); // Atualizar com dados do servidor
        }
      }
      
      // Recarregar lista local
      await loadMateriais();
      
      toast({
        title: "Material cadastrado",
        description: isOnline ? "Material salvo no servidor" : "Será sincronizado quando conectar",
      });
      
      return true;
    } catch (error) {
      console.error('Error creating material:', error);
      toast({
        title: "Erro",
        description: "Erro ao cadastrar material",
        variant: "destructive"
      });
      return false;
    }
  }, [isOnline, syncFromServer, loadMateriais, toast]);

  // Monitor de status da rede
  useEffect(() => {
    const handleNetworkChange = (status: { connected: boolean }) => {
      const wasOffline = !isOnline;
      setIsOnline(status.connected);
      
      // Se voltou online, sincronizar automaticamente
      if (status.connected && wasOffline && supabaseService.getConnectionStatus()) {
        logger.debug('Auto-syncing materials after coming back online...');
        syncFromServer().catch(err => 
          console.error('Error auto-syncing materials:', err)
        );
      }
    };

    networkService.addStatusListener(handleNetworkChange);
    setIsOnline(networkService.getConnectionStatus());

    return () => {
      networkService.removeStatusListener(handleNetworkChange);
    };
  }, [isOnline, syncFromServer]);

  // Carregar dados iniciais
  useEffect(() => {
    refreshMateriais();
  }, []);

  return {
    materiais,
    loading,
    isOnline,
    addMaterial,
    refreshMateriais
  };
}