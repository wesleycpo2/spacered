/**
 * API SERVICE
 * 
 * Cliente HTTP para comunicação com backend
 */

const rawApiUrl = import.meta.env.VITE_API_URL?.trim();
const normalizedApiUrl = rawApiUrl
  ? (rawApiUrl.startsWith('http')
      ? rawApiUrl
      : `https://${rawApiUrl.replace(/^\/+/, '')}`)
  : 'http://localhost:3333';
const API_URL = normalizedApiUrl.replace(/\/+$/, '');

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}

interface RegisterData {
  email: string;
  password: string;
  name?: string;
}

interface Subscription {
  id: string;
  status: 'ACTIVE' | 'CANCELED' | 'EXPIRED' | 'PENDING';
  planType: 'BASE' | 'PREMIUM';
  maxAlertsPerDay: number;
  maxNiches: number;
}

interface Niche {
  id: string;
  name: string;
  description: string | null;
}

class ApiService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    // Recupera tokens do localStorage
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // Adiciona token se disponível
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Token expirado - tenta renovar
    if (response.status === 401 && this.refreshToken) {
      const renewed = await this.renewToken();
      if (renewed) {
        // Tenta novamente com novo token
        headers['Authorization'] = `Bearer ${this.accessToken}`;
        const retryResponse = await fetch(url, {
          ...options,
          headers,
        });
        return this.handleResponse(retryResponse);
      }
    }

    return this.handleResponse(response);
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    return response.json();
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const data = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    // Salva tokens
    this.accessToken = data.accessToken;
    this.refreshToken = data.refreshToken;
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);

    return data;
  }

  async register(data: RegisterData): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    // Salva tokens
    this.accessToken = response.accessToken;
    this.refreshToken = response.refreshToken;
    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);

    return response;
  }

  async renewToken(): Promise<boolean> {
    try {
      if (!this.refreshToken) return false;

      const data = await this.request<{ accessToken: string }>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      this.accessToken = data.accessToken;
      localStorage.setItem('accessToken', data.accessToken);
      return true;
    } catch {
      this.logout();
      return false;
    }
  }

  logout(): void {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  async getSubscription(): Promise<Subscription> {
    return this.request<Subscription>('/subscription/status');
  }

  async getNiches(): Promise<Niche[]> {
    return this.request<Niche[]>('/niches');
  }

  async getUserNiches(): Promise<Niche[]> {
    return this.request<Niche[]>('/niches/me');
  }

  async addNiche(nicheId: string): Promise<void> {
    await this.request(`/niches/${nicheId}/subscribe`, {
      method: 'POST',
    });
  }

  async removeNiche(nicheId: string): Promise<void> {
    await this.request(`/niches/${nicheId}/unsubscribe`, {
      method: 'DELETE',
    });
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }
}

export const api = new ApiService();
export type { LoginResponse, RegisterData, Subscription, Niche };
