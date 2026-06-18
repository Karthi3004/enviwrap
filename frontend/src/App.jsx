import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppShell from './components/layout/AppShell';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import FarmsListPage from './pages/farms/FarmsListPage';
import FarmEnrolPage from './pages/farms/FarmEnrolPage';
import FarmDetailPage from './pages/farms/FarmDetailPage';
import BaselinePage from './pages/baseline/BaselinePage';
import SOCPage from './pages/soc/SOCPage';
import MonitoringPage from './pages/monitoring/MonitoringPage';
import VerificationPage from './pages/verification/VerificationPage';
import QAQCPage from './pages/dashboard/QAQCPage';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-gray-400 text-sm">Loading Enviwrap dMRV...</p>
      </div>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="qaqc" element={<QAQCPage />} />
            <Route path="farms" element={<FarmsListPage />} />
            <Route path="farms/new" element={<FarmEnrolPage />} />
            <Route path="farms/:id" element={<FarmDetailPage />} />
            <Route path="farms/:farmId/baseline" element={<BaselinePage />} />
            <Route path="farms/:farmId/soc" element={<SOCPage />} />
            <Route path="farms/:farmId/monitoring" element={<MonitoringPage />} />
            <Route path="verification" element={<VerificationPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
