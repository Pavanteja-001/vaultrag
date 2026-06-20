import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';
import ErrorBoundary from './components/shared/ErrorBoundary';

// Views
import LoginView from './components/auth/LoginView';
import ChatView from './components/chat/ChatView';
import UploadCenterView from './components/upload/UploadCenterView';
import ScopeTrackerView from './components/scope/ScopeTrackerView';
import InsightsView from './components/insights/InsightsView';
import ToDoBoardView from './components/todos/ToDoBoardView';
import AuditLogView from './components/audit/AuditLogView';
import RoleManagementView from './components/admin/RoleManagementView';

// Loading skeleton shown while checking auth session
const AuthLoading = () => (
  <div className="min-h-screen bg-base-900 flex items-center justify-center">
    <div className="text-center">
      <div className="w-10 h-10 border-2 border-neon-blue/30 border-t-neon-blue rounded-full animate-spin mx-auto mb-4" />
      <p className="text-gray-500 text-sm font-mono-code">Waking up server...</p>
    </div>
  </div>
);

// Protected route — UX guard only. Real enforcement is server-side RBAC.
const ProtectedRoute = ({ children, minRole = 1 }) => {
  const { user, loading } = useAuth();
  if (loading) return <AuthLoading />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role < minRole) return <Navigate to="/chat" replace />;
  return <AppLayout>{children}</AppLayout>;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();
  if (loading) return <AuthLoading />;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/chat" replace /> : <LoginView />} />

      <Route path="/chat" element={
        <ProtectedRoute minRole={1}><ChatView /></ProtectedRoute>
      } />
      <Route path="/todos" element={
        <ProtectedRoute minRole={1}><ToDoBoardView /></ProtectedRoute>
      } />
      <Route path="/insights" element={
        <ProtectedRoute minRole={2}><InsightsView /></ProtectedRoute>
      } />
      <Route path="/pm/scope" element={
        <ProtectedRoute minRole={2}><ScopeTrackerView /></ProtectedRoute>
      } />
      <Route path="/pm/upload" element={
        <ProtectedRoute minRole={3}><UploadCenterView /></ProtectedRoute>
      } />
      <Route path="/admin/audit" element={
        <ProtectedRoute minRole={3}><AuditLogView /></ProtectedRoute>
      } />
      <Route path="/admin/roles" element={
        <ProtectedRoute minRole={3}><RoleManagementView /></ProtectedRoute>
      } />

      <Route path="/" element={<Navigate to={user ? '/chat' : '/login'} replace />} />
      <Route path="*" element={<Navigate to={user ? '/chat' : '/login'} replace />} />
    </Routes>
  );
};

function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#18181B',
              color: '#FFFFFF',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              fontSize: '13px',
              fontFamily: 'Inter, sans-serif',
            },
            error: { style: { borderColor: 'rgba(255,0,60,0.4)' } },
            success: { style: { borderColor: 'rgba(0,255,135,0.4)' } },
          }}
        />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
