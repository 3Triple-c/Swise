import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, extractData, extractError } from '../lib/api';
import type { Product, PaginatedResult } from '../types';

// ── Query keys ────────────────────────────────────────────

export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (params: object) => [...productKeys.lists(), params] as const,
  detail: (id: string) => [...productKeys.all, 'detail', id] as const,
  stats: () => [...productKeys.all, 'stats'] as const,
};

// ── Types ─────────────────────────────────────────────────

interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface CreateProductPayload {
  name: string;
  sku?: string;
  barcode?: string;
  categoryId?: string;
  costPrice?: number;
  sellingPrice?: number;
  reorderPoint?: number;
  initialStock?: number;
  description?: string;
}

// ── Hooks ─────────────────────────────────────────────────

export function useProducts(params: QueryParams = {}) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: async () => {
      const res = await api.get('/products', { params });
      return extractData<PaginatedResult<Product>>(res);
    },
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: async () => {
      const res = await api.get(`/products/${id}`);
      return extractData<Product & { totalStock: number; stockStatus: string }>(res);
    },
    enabled: !!id,
  });
}

export function useProductStats() {
  return useQuery({
    queryKey: productKeys.stats(),
    queryFn: async () => {
      const res = await api.get('/products/stats');
      return extractData<{
        totalProducts: number;
        totalStockValue: number;
        lowStockCount: number;
        outOfStockCount: number;
      }>(res);
    },
    refetchInterval: 60_000, // refresh every minute
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateProductPayload) => {
      const res = await api.post('/products', data);
      return extractData<Product>(res);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.all }),
  });
}

export function useUpdateProduct(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<CreateProductPayload> & { isActive?: boolean }) => {
      const res = await api.patch(`/products/${id}`, data);
      return extractData<Product>(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.all });
      qc.invalidateQueries({ queryKey: productKeys.detail(id) });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/products/${id}`);
      return extractData(res);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.all }),
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/categories');
      return extractData<Array<{ id: string; name: string; productCount: number }>>(res);
    },
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const res = await api.post('/categories', data);
      return extractData(res);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}
