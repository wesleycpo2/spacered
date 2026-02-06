/**
 * ADMIN DASHBOARD (MVP)
 */

import { useEffect, useMemo, useState } from 'react';

interface ProductItem {
  id: string;
  tiktokUrl: string;
  title: string;
  viralScore: number;
  status: string;
  views: bigint | number;
  likes: bigint | number;
  comments: bigint | number;
  shares: bigint | number;
  impressions?: number | null;
  postCount?: number | null;
  postChange?: number | null;
  ctr?: number | null;
  cvr?: number | null;
  cpa?: number | null;
  cost?: number | null;
  playSixRate?: number | null;
  urlTitle?: string | null;
  ecomCategory1?: string | null;
  ecomCategory2?: string | null;
  ecomCategory3?: string | null;
  lastScrapedAt: string | null;
  insights?: {
    growth48h: number;
    engagementLabel: string;
    saturationLabel: string;
    probability: number;
  };
}

interface TrendSignalItem {
  id: string;
  type: string;
  value: string;
  category: string | null;
  region: string | null;
  growthPercent: number;
  collectedAt: string;
}

export function AdminDashboardPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [signals, setSignals] = useState<TrendSignalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [telegramMessage, setTelegramMessage] = useState('');
  const [adminActionMessage, setAdminActionMessage] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
  const adminToken = import.meta.env.VITE_ADMIN_TOKEN || '';

  const headers = useMemo(() => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (adminToken) h['x-admin-token'] = adminToken;
    return h;
  }, [adminToken]);

  async function loadOverview() {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/admin/overview`, { headers });
      const data = await res.json();
      setProducts(data.products || []);
      setSignals(data.signals || []);
    } catch (err) {
      setTelegramMessage('Erro ao carregar overview.');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinTelegramChannel() {
    if (!adminToken) {
      setTelegramMessage('ADMIN token não configurado.');
      return;
    }
    setInviteLoading(true);
    setTelegramMessage('Gerando convite...');
    try {
      const res = await fetch(`${apiUrl}/admin/telegram/invite`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.message || `Falha ao gerar convite (${res.status})`);
      }
      const inviteLink = data.data?.inviteLink;
      if (inviteLink) {
        window.open(inviteLink, '_blank', 'noopener');
        setTelegramMessage('Convite gerado. Use o link para entrar no canal.');
      } else {
        setTelegramMessage('Convite não disponível.');
      }
    } catch (err) {
      setTelegramMessage(err instanceof Error ? err.message : 'Falha ao gerar convite.');
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleCollectNow() {
    if (!adminToken) {
      setAdminActionMessage('ADMIN token não configurado.');
      return;
    }

    setAdminActionMessage('Coletando dados...');
    try {
      const res = await fetch(`${apiUrl}/admin/collect-all`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ limit: 10 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.message || `Falha ao coletar (${res.status})`);
      }
      await loadOverview();
      setAdminActionMessage('Dados coletados.');
    } catch (err) {
      setAdminActionMessage(err instanceof Error ? err.message : 'Falha ao coletar.');
    }
  }

  async function handleSendAlerts() {
    if (!adminToken) {
      setAdminActionMessage('ADMIN token não configurado.');
      return;
    }

    setAdminActionMessage('Enviando alertas...');
    try {
      const res = await fetch(`${apiUrl}/admin/alerts/run`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.message || `Falha ao enviar (${res.status})`);
      }
      setAdminActionMessage('Alertas enviados.');
    } catch (err) {
      setAdminActionMessage(err instanceof Error ? err.message : 'Falha ao enviar alertas.');
    }
  }

  async function handleResetData() {
    if (!adminToken) {
      setAdminActionMessage('ADMIN token não configurado.');
      return;
    }

    setAdminActionMessage('Limpando dados...');
    try {
      const resetRes = await fetch(`${apiUrl}/admin/reset-data`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });
      const resetPayload = await resetRes.json().catch(() => ({}));
      if (!resetRes.ok) {
        throw new Error(resetPayload.error || resetPayload.message || `Falha ao limpar (${resetRes.status})`);
      }
      await loadOverview();
      setAdminActionMessage('Dados limpos.');
    } catch (err) {
      setAdminActionMessage(err instanceof Error ? err.message : 'Falha ao limpar dados.');
    }
  }


  useEffect(() => {
    if (apiUrl) {
      loadOverview();
    }
  }, [apiUrl]);

  return (
    <div
      style={{
        fontFamily: 'system-ui, sans-serif',
        padding: 24,
        color: '#0f172a',
        background: 'linear-gradient(180deg, #0b1220 0%, #0f172a 20%, #f8fafc 70%)',
        minHeight: '100vh',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <header style={{ marginBottom: 24, color: 'white' }}>
          <p style={{ letterSpacing: 2, textTransform: 'uppercase', fontSize: 12, color: '#94a3b8' }}>
            TikTok Trend Alert
          </p>
          <h1 style={{ marginBottom: 8, fontSize: 28 }}>Dashboard Admin</h1>
          <p style={{ color: '#cbd5f5', margin: 0 }}>
            Monitoramento em tempo real de tendências, sinais e testes.
          </p>
        </header>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
          <div style={{ background: '#0f172a', color: 'white', borderRadius: 14, padding: 16, border: '1px solid #1e293b' }}>
            <div style={{ color: '#94a3b8', fontSize: 12 }}>Produtos monitorados</div>
            <div style={{ fontSize: 26, fontWeight: 700 }}>{products.length}</div>
          </div>
          <div style={{ background: '#111827', color: 'white', borderRadius: 14, padding: 16, border: '1px solid #1f2937' }}>
            <div style={{ color: '#94a3b8', fontSize: 12 }}>Sinais recentes</div>
            <div style={{ fontSize: 26, fontWeight: 700 }}>{signals.length}</div>
          </div>
          <div style={{ background: '#0b1220', color: 'white', borderRadius: 14, padding: 16, border: '1px solid #1e293b' }}>
            <div style={{ color: '#94a3b8', fontSize: 12 }}>Telegram</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#38bdf8' }}>Canal privado</div>
          </div>
        </section>


        {loading ? (
          <p style={{ color: '#e2e8f0' }}>Carregando...</p>
        ) : (
          <>
          <section style={{ background: 'white', borderRadius: 14, padding: 16, border: '1px solid #e2e8f0', marginBottom: 18 }}>
              <h2 style={{ marginTop: 0 }}>Ações rápidas</h2>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  onClick={handleCollectNow}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 999,
                    border: '1px solid #cbd5e1',
                    background: '#0f172a',
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  ⛏ Coletar dados
                </button>
                <button
                  onClick={handleSendAlerts}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 999,
                    border: '1px solid #cbd5e1',
                    background: '#22c55e',
                    color: '#0b1220',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  📣 Enviar alertas
                </button>
                <button
                  onClick={handleResetData}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 999,
                    border: '1px solid #cbd5e1',
                    background: '#ef4444',
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  🧹 Limpar dados
                </button>
                {adminActionMessage && <span style={{ color: '#475569' }}>{adminActionMessage}</span>}
              </div>
            </section>

            <section style={{ background: 'white', borderRadius: 14, padding: 16, border: '1px solid #e2e8f0', marginBottom: 18 }}>
            <h2 style={{ marginTop: 0 }}>Telegram</h2>
            <p style={{ marginTop: 0, color: '#475569' }}>
              Os alertas são enviados no canal privado. Use o botão abaixo para entrar no canal.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                onClick={handleJoinTelegramChannel}
                disabled={inviteLoading}
                style={{
                  padding: '8px 16px',
                  borderRadius: 999,
                  border: '1px solid #cbd5e1',
                  background: inviteLoading ? '#e2e8f0' : '#22c55e',
                  color: inviteLoading ? '#64748b' : '#0b1220',
                  cursor: inviteLoading ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                }}
              >
                🔗 Entrar no canal
              </button>
              {telegramMessage && <span style={{ color: '#475569' }}>{telegramMessage}</span>}
            </div>
          </section>
          <section style={{ background: 'white', borderRadius: 14, padding: 16, border: '1px solid #e2e8f0', marginBottom: 18 }}>
            <h2 style={{ marginTop: 0 }}>Produtos (lista completa)</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', padding: 8 }}>Produto</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', padding: 8 }}>Score</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', padding: 8 }}>Views</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', padding: 8 }}>Status</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', padding: 8 }}>Link</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td style={{ padding: 8 }}>{p.title}</td>
                <td style={{ padding: 8 }}>{p.viralScore}</td>
                <td style={{ padding: 8 }}>{Number(p.views).toLocaleString()}</td>
                <td style={{ padding: 8 }}>{p.status}</td>
                <td style={{ padding: 8 }}>
                  <a href={p.tiktokUrl} target="_blank" rel="noreferrer">Abrir</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
          </section>
          <section style={{ background: 'white', borderRadius: 14, padding: 16, border: '1px solid #e2e8f0' }}>
            <h2 style={{ marginTop: 0 }}>Alertas recentes</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', padding: 8 }}>Tipo</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', padding: 8 }}>Valor</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', padding: 8 }}>Crescimento</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', padding: 8 }}>Região</th>
            </tr>
          </thead>
          <tbody>
            {signals.map((s) => (
              <tr key={s.id}>
                <td style={{ padding: 8 }}>{s.type}</td>
                <td style={{ padding: 8 }}>{s.value}</td>
                <td style={{ padding: 8 }}>{s.growthPercent.toFixed(1)}%</td>
                <td style={{ padding: 8 }}>{s.region || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
          </section>
        </>
      )}
      </div>
    </div>
  );
}
