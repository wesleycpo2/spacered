/**
 * APP COMPONENT
 * 
 * Componente raiz com rotas
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LandingPage } from './pages/LandingPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { LoginPage } from './pages/LoginPage';
import { SetPasswordPage } from './pages/SetPasswordPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { DashboardPage } from './pages/DashboardPage';

function PrivateRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div style={{ padding: 20 }}>Carregando...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/" />;
}

function PublicRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div style={{ padding: 20 }}>Carregando...</div>;
  }

  return !isAuthenticated ? children : <Navigate to="/dashboard" />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <PublicRoute>
            <LandingPage />
          </PublicRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <DashboardPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/checkout"
        element={
          <PublicRoute>
            <CheckoutPage />
          </PublicRoute>
        }
      />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/set-password"
        element={
          <PublicRoute>
            <SetPasswordPage />
          </PublicRoute>
        }
      />
      <Route
        path="/admin"
        element={<AdminDashboardPage />}
      />
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
