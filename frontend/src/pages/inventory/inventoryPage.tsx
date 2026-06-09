import { useState } from 'react';
import {
  useStockLevels,
  useLowStockAlerts,
  useStockMovements,
} from '../../hooks/useInventory';
import DataTable from '../../components/shared/DataTable';
import StockBadge from '../../components/shared/StockBadge';
import AdjustStockModal from '../../components/inventory/AdjustStockModal';

const TABS = ['Stock Levels', 'Movements', 'Alerts'] as const;
type Tab = typeof TABS[number];

const MOVEMENT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  PURCHASE:     { label: 'Purchase',   color: 'text-green-700 bg-green-50'  },
  SALE:         { label: 'Sale',       color: 'text-blue-700  bg-blue-50'   },
  ADJUSTMENT:   { label: 'Adjustment', color: 'text-gray-700  bg-gray-100'  },
  TRANSFER_IN:  { label: 'Transfer In', color: 'text-teal-700 bg-teal-50'  },
  TRANSFER_OUT: { label: 'Transfer Out',color: 'text-amber-700 bg-amber-50' },
  RETURN:       { label: 'Return',     color: 'text-purple-700 bg-purple-50'},
  DAMAGE:       { label: 'Damage',     color: 'text-red-700   bg-red-50'    },
};

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Stock Levels');
  const [adjustProduct, setAdjustProduct] = useState<any>(null);
  const [movementsPage, setMovementsPage] = useState(1);

  const { data: stockLevels, isLoading: loadingLevels } = useStockLevels();
  const { data: alerts, isLoading: loadingAlerts } = useLowStockAlerts();
  const { data: movements, isLoading: loadingMovements } = useStockMovements({ page: movementsPage });

  const stockColumns = [
    {
      key: 'product',
      header: 'Product',
      render: (row: any) => (
        <div>
          <p className="font-medium text-gray-900 text-sm">{row.product.name}</p>
          <p className="text-xs text-gray-400">{row.product.sku}</p>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (row: any) => <span className="text-sm text-gray-600">{row.location.name}</span>,
    },
    {
      key: 'category',
      header: 'Category',
      render: (row: any) => <span className="text-sm text-gray-500">{row.product.category?.name ?? '—'}</span>,
    },
    {
      key: 'quantity',
      header: 'Quantity',
      render: (row: any) => (
        <StockBadge status={row.stockStatus} quantity={row.quantity} />
      ),
    },
    {
      key: 'value',
      header: 'Stock value',
      render: (row: any) => (
        <span className="text-sm font-medium text-gray-900">
          ₦{(row.quantity * Number(row.product.costPrice)).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row: any) => (
        <button
          onClick={() => setAdjustProduct({ id: row.product.id, name: row.product.name, sku: row.product.sku })}
          className="px-2.5 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg"
        >
          Adjust
        </button>
      ),
    },
  ];

  const movementColumns = [
    {
      key: 'product',
      header: 'Product',
      render: (row: any) => (
        <div>
          <p className="text-sm font-medium text-gray-900">{row.product.name}</p>
          <p className="text-xs text-gray-400">{row.product.sku}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row: any) => {
        const t = MOVEMENT_TYPE_LABELS[row.type] ?? { label: row.type, color: 'text-gray-700 bg-gray-100' };
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${t.color}`}>
            {t.label}
          </span>
        );
      },
    },
    {
      key: 'delta',
      header: 'Change',
      render: (row: any) => (
        <span className={`text-sm font-medium ${row.quantityDelta > 0 ? 'text-green-700' : 'text-red-700'}`}>
          {row.quantityDelta > 0 ? `+${row.quantityDelta}` : row.quantityDelta}
        </span>
      ),
    },
    {
      key: 'before_after',
      header: 'Before → After',
      render: (row: any) => (
        <span className="text-sm text-gray-500">
          {row.quantityBefore} → {row.quantityAfter}
        </span>
      ),
    },
    {
      key: 'performedBy',
      header: 'By',
      render: (row: any) => (
        <span className="text-sm text-gray-600">
          {row.performedBy.firstName} {row.performedBy.lastName}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (row: any) => (
        <span className="text-xs text-gray-400">
          {new Date(row.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </span>
      ),
    },
  ];

  const alertColumns = [
    {
      key: 'name',
      header: 'Product',
      render: (row: any) => (
        <div>
          <p className="text-sm font-medium text-gray-900">{row.name}</p>
          <p className="text-xs text-gray-400">{row.sku}</p>
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: (row: any) => <span className="text-sm text-gray-500">{row.category?.name ?? '—'}</span> },
    {
      key: 'totalStock',
      header: 'Stock',
      render: (row: any) => (
        <StockBadge
          status={row.totalStock === 0 ? 'out_of_stock' : 'low_stock'}
          quantity={row.totalStock}
          size="md"
        />
      ),
    },
    { key: 'reorderPoint', header: 'Reorder at', render: (row: any) => <span className="text-sm text-gray-500">{row.reorderPoint} units</span> },
    {
      key: 'actions',
      header: '',
      render: (row: any) => (
        <button
          onClick={() => setAdjustProduct({ id: row.id, name: row.name, sku: row.sku })}
          className="px-2.5 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg"
        >
          Restock
        </button>
      ),
    },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Inventory</h1>
          {alerts && alerts.length > 0 && (
            <p className="text-sm text-amber-600 mt-0.5">
              ⚠ {alerts.length} item{alerts.length > 1 ? 's' : ''} need attention
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
            {tab === 'Alerts' && alerts && alerts.length > 0 && (
              <span className="ml-1.5 bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full">
                {alerts.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {activeTab === 'Stock Levels' && (
          <DataTable
            columns={stockColumns}
            data={stockLevels ?? []}
            isLoading={loadingLevels}
            emptyMessage="No inventory records yet. Add products with stock to see them here."
            emptyIcon="📦"
          />
        )}

        {activeTab === 'Movements' && (
          <>
            <DataTable
              columns={movementColumns}
              data={movements?.data ?? []}
              isLoading={loadingMovements}
              emptyMessage="No stock movements recorded yet."
              emptyIcon="↕️"
            />
            {movements && movements.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                <p className="text-sm text-gray-500">Page {movements.page} of {movements.totalPages}</p>
                <div className="flex gap-2">
                  <button onClick={() => setMovementsPage((p) => p - 1)} disabled={movementsPage === 1} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">← Prev</button>
                  <button onClick={() => setMovementsPage((p) => p + 1)} disabled={movementsPage >= movements.totalPages} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">Next →</button>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'Alerts' && (
          <DataTable
            columns={alertColumns}
            data={alerts ?? []}
            isLoading={loadingAlerts}
            emptyMessage="All products are sufficiently stocked. Great job! ✅"
            emptyIcon="✅"
          />
        )}
      </div>

      <AdjustStockModal
        isOpen={!!adjustProduct}
        onClose={() => setAdjustProduct(null)}
        product={adjustProduct}
      />
    </div>
  );
}
