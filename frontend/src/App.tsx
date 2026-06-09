import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/DashboardPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public auth routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected app routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              {/* Phase 2+ routes go here */}
              <Route path="/products"  element={<div className="p-6 text-gray-500">Products — Phase 2</div>} />
              <Route path="/inventory" element={<div className="p-6 text-gray-500">Inventory — Phase 2</div>} />
              <Route path="/purchases" element={<div className="p-6 text-gray-500">Purchases — Phase 3</div>} />
              <Route path="/sales"     element={<div className="p-6 text-gray-500">Sales — Phase 3</div>} />
              <Route path="/suppliers" element={<div className="p-6 text-gray-500">Suppliers — Phase 3</div>} />
              <Route path="/reports"   element={<div className="p-6 text-gray-500">Reports — Phase 4</div>} />
              <Route path="/settings"  element={<div className="p-6 text-gray-500">Settings — Phase 6</div>} />
            </Route>
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
