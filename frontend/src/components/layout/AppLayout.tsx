import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useLogout } from '../../hooks/useAuth';

const navItems = [
  { to: '/dashboard',  label: 'Dashboard',  icon: '▦' },
  { to: '/products',   label: 'Products',   icon: '⊞' },
  { to: '/inventory',  label: 'Inventory',  icon: '◫' },
  { to: '/purchases',  label: 'Purchases',  icon: '◎' },
  { to: '/sales',      label: 'Sales',      icon: '◈' },
  { to: '/suppliers',  label: 'Suppliers',  icon: '⬡' },
  { to: '/reports',    label: 'Reports',    icon: '◷' },
  { to: '/settings',   label: 'Settings',   icon: '⚙' },
];

export default function AppLayout() {
  const { user, organisation } = useAuthStore();
  const logout = useLogout();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSettled: () => navigate('/login'),
    });
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">

        {/* Brand */}
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-gray-200">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xs">SW</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">StockWise</p>
            <p className="text-xs text-gray-400 truncate">{organisation?.name}</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <span className="text-base w-4 text-center">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-gray-200">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <span className="text-blue-700 text-xs font-medium">
                {user?.firstName[0]}{user?.lastName[0]}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-900 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-400 truncate capitalize">{user?.role.toLowerCase()}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-gray-600 text-xs shrink-0"
              title="Sign out"
            >
              ⏏
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
