import { useState } from 'react';
import { useProducts, useDeleteProduct, useCategories } from '../../hooks/useProducts';
import DataTable from '../../components/shared/DataTable';
import StockBadge from '../../components/shared/StockBadge';
import ProductFormModal from '../../components/products/ProductFormModal';
import AdjustStockModal from '../../components/inventory/AdjustStockModal';

const STATUS_FILTERS = [
  { value: '', label: 'All products' },
  { value: 'active', label: 'Active' },
  { value: 'low_stock', label: 'Low stock' },
  { value: 'out_of_stock', label: 'Out of stock' },
  { value: 'inactive', label: 'Inactive' },
];

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [adjustProduct, setAdjustProduct] = useState<any>(null);

  const { data, isLoading } = useProducts({ search, status, categoryId, page, limit: 20 });
  const { data: categories } = useCategories();
  const deleteProduct = useDeleteProduct();

  const columns = [
    {
      key: 'name',
      header: 'Product',
      render: (row: any) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
            {row.imageUrl
              ? <img src={row.imageUrl} alt={row.name} className="w-8 h-8 rounded-lg object-cover" />
              : <span className="text-gray-400 text-sm">📦</span>
            }
          </div>
          <div>
            <p className="font-medium text-gray-900 text-sm">{row.name}</p>
            <p className="text-xs text-gray-400">{row.sku}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (row: any) => (
        <span className="text-sm text-gray-500">{row.category?.name ?? '—'}</span>
      ),
    },
    {
      key: 'sellingPrice',
      header: 'Price',
      render: (row: any) => (
        <span className="text-sm font-medium text-gray-900">
          ₦{Number(row.sellingPrice).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'totalStock',
      header: 'Stock',
      render: (row: any) => (
        <StockBadge status={row.stockStatus} quantity={row.totalStock} />
      ),
    },
    {
      key: 'reorderPoint',
      header: 'Reorder at',
      render: (row: any) => (
        <span className="text-sm text-gray-500">{row.reorderPoint} units</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row: any) => (
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={() => setAdjustProduct(row)}
            className="px-2.5 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            Adjust stock
          </button>
          <button
            onClick={() => setEditProduct(row)}
            className="px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => {
              if (confirm(`Deactivate "${row.name}"?`)) deleteProduct.mutate(row.id);
            }}
            className="px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Products</h1>
          <p className="text-gray-500 mt-0.5 text-sm">
            {data?.total ?? 0} products total
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <span>+</span> Add product
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by name, SKU, barcode…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 min-w-48 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        <select
          value={categoryId}
          onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">All categories</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          isLoading={isLoading}
          emptyMessage="No products yet. Add your first product to get started."
        />

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Page {data.page} of {data.totalPages} ({data.total} total)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= data.totalPages}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <ProductFormModal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
      />
      <ProductFormModal
        isOpen={!!editProduct}
        onClose={() => setEditProduct(null)}
        product={editProduct}
      />
      <AdjustStockModal
        isOpen={!!adjustProduct}
        onClose={() => setAdjustProduct(null)}
        product={adjustProduct}
      />
    </div>
  );
}
