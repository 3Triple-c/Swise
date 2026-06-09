import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, extractData } from '../lib/api';
import type { StockMovement, InventoryItem, PaginatedResult } from '../types';

export const inventoryKeys = {
  all: ['inventory'] as const,
  levels: () => [...inventoryKeys.all, 'levels'] as const,
  alerts: () => [...inventoryKeys.all, 'alerts'] as const,
  movements: (params: object) => [...inventoryKeys.all, 'movements', params] as const,
  productStock: (id: string) => [...inventoryKeys.all, 'product', id] as const,
  locations: () => [...inventoryKeys.all, 'locations'] as const,
};

export function useStockLevels() {
  return useQuery({
    queryKey: inventoryKeys.levels(),
    queryFn: async () => {
      const res = await api.get('/inventory');
      return extractData<Array<InventoryItem & { stockStatus: string }>>(res);
    },
  });
}

export function useLowStockAlerts() {
  return useQuery({
    queryKey: inventoryKeys.alerts(),
    queryFn: async () => {
      const res = await api.get('/inventory/alerts');
      return extractData<any[]>(res);
    },
    refetchInterval: 30_000,
  });
}

export function useStockMovements(params: { page?: number; productId?: string; type?: string } = {}) {
  return useQuery({
    queryKey: inventoryKeys.movements(params),
    queryFn: async () => {
      const res = await api.get('/inventory/movements', { params });
      return extractData<PaginatedResult<StockMovement>>(res);
    },
  });
}

export function useProductStock(productId: string) {
  return useQuery({
    queryKey: inventoryKeys.productStock(productId),
    queryFn: async () => {
      const res = await api.get(`/inventory/product/${productId}`);
      return extractData<any>(res);
    },
    enabled: !!productId,
  });
}

export function useLocations() {
  return useQuery({
    queryKey: inventoryKeys.locations(),
    queryFn: async () => {
      const res = await api.get('/inventory/locations');
      return extractData<any[]>(res);
    },
  });
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      productId: string;
      locationId: string;
      quantityDelta: number;
      type: string;
      notes?: string;
      batchNumber?: string;
      expiryDate?: string;
    }) => {
      const res = await api.post('/inventory/adjust', data);
      return extractData(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.all });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useTransferStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      productId: string;
      fromLocationId: string;
      toLocationId: string;
      quantity: number;
      notes?: string;
    }) => {
      const res = await api.post('/inventory/transfer', data);
      return extractData(res);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: inventoryKeys.all }),
  });
}
