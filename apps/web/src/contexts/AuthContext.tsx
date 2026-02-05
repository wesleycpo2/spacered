/**
 * AUTH CONTEXT
 * 
 * Gerencia estado de autenticação global
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, Subscription } from '../services/api';

interface User {
  id: string;
  phone: string;
  name: string | null;
}

interface AuthContextData {
  user: User | null;
  subscription: Subscription | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  register: (phone: string, password: string, name?: string, email?: string) => Promise<void>;
  logout: () => void;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verifica autenticação ao carregar
  useEffect(() => {
    async function loadUser() {
      if (api.isAuthenticated()) {
        try {
          const sub = await api.getSubscription();
          setSubscription(sub);
          // User info vem do token JWT, mas aqui simplificamos
          setUser({ id: '', phone: '', name: null });
        } catch {
          api.logout();
        }
      }
      setIsLoading(false);
    }
    loadUser();
  }, []);

  async function login(phone: string, password: string) {
    const response = await api.login(phone, password);
    setUser(response.user);
    
    // Carrega dados da assinatura
    const sub = await api.getSubscription();
    setSubscription(sub);
  }

  async function register(phone: string, password: string, name?: string, email?: string) {
    const response = await api.register({ phone, password, name, email });
    setUser(response.user);
    
    const sub = await api.getSubscription();
    setSubscription(sub);
  }

  function logout() {
    api.logout();
    setUser(null);
    setSubscription(null);
  }

  async function refreshSubscription() {
    if (api.isAuthenticated()) {
      const sub = await api.getSubscription();
      setSubscription(sub);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        subscription,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshSubscription,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
