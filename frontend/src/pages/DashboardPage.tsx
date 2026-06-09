import { useAuthStore } from '../stores/authStore';
import { useProductStats } from '../hooks/useProducts';
import { useLowStockAlerts } from '../hooks/useInventory';
import { Link } from 'react-router-dom';
import StockBadge from '../components/shared/StockBadge';

function StatCard({ label, value, sub, color, icon }: {
  label: string; value: string | number; sub?: string; color: string; icon: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-gray-500">{label}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <p className={`text-2xl font-semibold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { user, organisation } = useAuthStore();
  const { data: stats, isLoading: loadingStats } = useProductStats();
  const { data: alerts } = useLowStockAlerts();

  const fmt = (n?: number) => n !== undefined ? n.toLocaleString() : '—';
  const fmtCurrency = (n?: number) =>
    n !== undefined ? `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 0 })}` : '—';

  return (
    <div className="p-6">
      <div className="mb-7">
        <h1 className="text-2xl font-semibold text-gray-900">
          Good {getGreeting()}, {user?.firstName} 👋
        </h1>
        <p className="text-gray-400 mt-1 text-sm">{organisation?.name} — here's your inventory snapshot</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total products"
          value={loadingStats ? '…' : fmt(stats?.totalProducts)}
          icon="📦"
          color="text-gray-900"
        />
        <StatCard
          label="Stock value"
          value={loadingStats ? '…' : fmtCurrency(stats?.totalStockValue)}
          sub="at cost price"
          icon="💰"
          color="text-green-700"
        />
        <StatCard
          label="Low stock items"
          value={loadingStats ? '…' : fmt(stats?.lowStockCount)}
          sub={stats?.lowStockCount ? 'Need reordering' : 'All good'}
          icon="⚠️"
          color={stats?.lowStockCount ? 'text-amber-600' : 'text-gray-900'}
        />
        <StatCard
          label="Out of stock"
          value={loadingStats ? '…' : fmt(stats?.outOfStockCount)}
          sub={stats?.outOfStockCount ? 'Immediate action needed' : 'All good'}
          icon="🚨"
          color={stats?.outOfStockCount ? 'text-red-600' : 'text-gray-900'}
        />
      </div>

      {/* Alerts panel */}
      {alerts && alerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-amber-800">
              ⚠️ {alerts.length} item{alerts.length > 1 ? 's' : ''} need attention
            </h2>
            <Link to="/inventory" className="text-xs text-amber-700 hover:underline font-medium">
              View all alerts →
            </Link>
          </div>
          <div className="space-y-2">
            {alerts.slice(0, 5).map((item: any) => (
              <div key={item.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-100">
                <div>
                  <span className="text-sm font-medium text-gray-900">{item.name}</span>
                  <span className="text-xs text-gray-400 ml-2">{item.sku}</span>
                </div>
                <StockBadge
                  status={item.totalStock === 0 ? 'out_of_stock' : 'low_stock'}
                  quantity={item.totalStock}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { to: '/products',  icon: '📦', title: 'Products',  desc: 'Add or manage your product catalog'  },
          { to: '/inventory', icon: '📊', title: 'Inventory', desc: 'View stock levels and adjust quantities' },
          { to: '/purchases', icon: '🛒', title: 'Purchases', desc: 'Create and receive purchase orders — Phase 3'  },
        ].map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className="bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition-all group"
          >
            <div className="text-2xl mb-3">{card.icon}</div>
            <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-700">{card.title}</h3>
            <p className="text-xs text-gray-400 mt-1">{card.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
