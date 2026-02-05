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
    phone: string;
    email?: string | null;
    name: string | null;
  };
}

interface RegisterData {
  phone: string;
  password: string;
  name?: string;
  email?: string;
}

interface SetPasswordData {
  phone: string;
  password: string;
  name?: string;
  email?: string;
  paymentMethod?: string;
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

interface TelegramConfig {
  enabled: boolean;
  telegramChatId: string | null;
}

interface OverviewResponse {
  success: boolean;
  products: any[];
  signals: any[];
  aiReport: any | null;
  aiReports: any[];
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

  async login(phone: string, password: string): Promise<LoginResponse> {
    const data = await this.request<{ success: boolean; data: { user: LoginResponse['user']; tokens: { accessToken: string; refreshToken: string } } }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ phone, password }),
      }
    );

    const response: LoginResponse = {
      user: data.data.user,
      accessToken: data.data.tokens.accessToken,
      refreshToken: data.data.tokens.refreshToken,
    };

    // Salva tokens
    this.accessToken = response.accessToken;
    this.refreshToken = response.refreshToken;
    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);

    return response;
  }

  async register(data: RegisterData): Promise<LoginResponse> {
    const response = await this.request<{ success: boolean; data: { user: LoginResponse['user']; tokens: { accessToken: string; refreshToken: string } } }>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );

    const parsed: LoginResponse = {
      user: response.data.user,
      accessToken: response.data.tokens.accessToken,
      refreshToken: response.data.tokens.refreshToken,
    };

    // Salva tokens
    this.accessToken = parsed.accessToken;
    this.refreshToken = parsed.refreshToken;
    localStorage.setItem('accessToken', parsed.accessToken);
    localStorage.setItem('refreshToken', parsed.refreshToken);

    return parsed;
  }

  async setPassword(data: SetPasswordData): Promise<LoginResponse> {
    const response = await this.request<{ success: boolean; data: { user: LoginResponse['user']; tokens: { accessToken: string; refreshToken: string } } }>(
      '/auth/set-password',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );

    const parsed: LoginResponse = {
      user: response.data.user,
      accessToken: response.data.tokens.accessToken,
      refreshToken: response.data.tokens.refreshToken,
    };

    this.accessToken = parsed.accessToken;
    this.refreshToken = parsed.refreshToken;
    localStorage.setItem('accessToken', parsed.accessToken);
    localStorage.setItem('refreshToken', parsed.refreshToken);

    return parsed;
  }

  async renewToken(): Promise<boolean> {
    try {
      if (!this.refreshToken) return false;

      const data = await this.request<{ success: boolean; data: { accessToken: string; refreshToken: string } }>(
        '/auth/refresh',
        {
        method: 'POST',
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      }
      );

      this.accessToken = data.data.accessToken;
      this.refreshToken = data.data.refreshToken;
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
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

  async getTelegramConfig(): Promise<TelegramConfig> {
    const response = await this.request<{ success: boolean; data: TelegramConfig }>('/me/telegram');
    return response.data;
  }

  async connectTelegram(identifier: string): Promise<TelegramConfig> {
    const response = await this.request<{ success: boolean; data: TelegramConfig }>('/me/telegram/connect', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    });
    return response.data;
  }

  async disableTelegram(): Promise<TelegramConfig> {
    const response = await this.request<{ success: boolean; data: TelegramConfig }>('/me/telegram/disable', {
      method: 'POST',
    });
    return response.data;
  }

  async getOverview(): Promise<OverviewResponse> {
    const response = await this.request<OverviewResponse>('/me/overview');
    return response;
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }
}

export const api = new ApiService();
export type { LoginResponse, RegisterData, Subscription, Niche, TelegramConfig, OverviewResponse };
