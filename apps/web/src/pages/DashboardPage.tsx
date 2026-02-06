/**
 * DASHBOARD PAGE
 * 
 * Página principal com status da assinatura e seleção de nichos
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api, Niche } from '../services/api';

interface ProductItem {
  id: string;
  tiktokUrl: string;
  title: string;
  viralScore: number;
  status: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
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
  thumbnail?: string | null;
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

export function DashboardPage() {
  const { user, subscription, logout, refreshSubscription } = useAuth();
  const navigate = useNavigate();

  const [allNiches, setAllNiches] = useState<Niche[]>([]);
  const [userNiches, setUserNiches] = useState<Niche[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [signals, setSignals] = useState<TrendSignalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [telegramMessage, setTelegramMessage] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setIsLoading(true);
      await refreshSubscription();
      const [niches, myNiches, overview] = await Promise.all([
        api.getNiches(),
        api.getUserNiches(),
        api.getOverview(),
      ]);
      setAllNiches(niches);
      setUserNiches(myNiches);
      setProducts(overview.products || []);
      setSignals(overview.signals || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleToggleNiche(niche: Niche) {
    const isSubscribed = userNiches.some((n) => n.id === niche.id);

    try {
      if (isSubscribed) {
        await api.removeNiche(niche.id);
        setUserNiches((prev) => prev.filter((n) => n.id !== niche.id));
      } else {
        // Verifica limite
        if (subscription && userNiches.length >= subscription.maxNiches) {
          alert(`Limite de ${subscription.maxNiches} nichos atingido`);
          return;
        }
        await api.addNiche(niche.id);
        setUserNiches((prev) => [...prev, niche]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar nicho');
    }
  }

  function handleLogout() {
    logout();
    navigate('/');
  }

  async function handleJoinTelegramChannel() {
    setInviteLoading(true);
    setTelegramMessage('Gerando convite...');
    try {
      const { inviteLink } = await api.getTelegramInvite();
      window.open(inviteLink, '_blank', 'noopener');
      setTelegramMessage('Convite gerado. Use o link para entrar no canal.');
    } catch (err) {
      setTelegramMessage(err instanceof Error ? err.message : 'Falha ao gerar convite.');
    } finally {
      setInviteLoading(false);
    }
  }

  if (isLoading) {
    return <div style={{ padding: 20 }}>Carregando...</div>;
  }

  const statusColors = {
    ACTIVE: '#22c55e',
    PENDING: '#f59e0b',
    CANCELED: '#ef4444',
    EXPIRED: '#6b7280',
  };

  const planLabels = {
    BASE: 'Plano Base',
    PREMIUM: 'Plano Premium',
  };

  const isPremium = subscription?.planType === 'PREMIUM';
  const isActive = subscription?.status === 'ACTIVE';

  return (
    <div
      style={{
        fontFamily: 'system-ui, sans-serif',
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0b1220 0%, #0f172a 20%, #f8fafc 70%)',
      }}
    >
      <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto', color: '#0f172a' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, color: 'white' }}>
        <div>
          <p style={{ letterSpacing: 2, textTransform: 'uppercase', fontSize: 12, color: '#94a3b8', margin: 0 }}>
            TikTok Trend Alert
          </p>
          <h1 style={{ margin: '6px 0 4px', fontSize: 28 }}>Dashboard do Cliente</h1>
          <p style={{ margin: 0, color: '#cbd5f5' }}>
            {user?.phone ? `Conta: ${user.phone}` : 'Conta ativa'}
          </p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            padding: '8px 16px',
            cursor: 'pointer',
            borderRadius: 999,
            border: '1px solid #cbd5e1',
            background: 'white',
            fontWeight: 600,
          }}
        >
          Sair
        </button>
      </header>

      {error && (
        <div style={{ padding: 15, backgroundColor: '#fee', color: 'red', marginBottom: 20 }}>
          {error}
        </div>
      )}

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
          <div style={{ fontSize: 14, fontWeight: 600, color: '#38bdf8' }}>
            Canal privado
          </div>
        </div>
      </section>

      {/* STATUS DA ASSINATURA */}
      <section style={{ marginBottom: 24, padding: 20, border: '1px solid #e2e8f0', borderRadius: 14, background: 'white' }}>
        <h2>Status da Assinatura</h2>
        
        {subscription ? (
          <div>
            <p>
              <strong>Celular:</strong> {user?.phone}
            </p>
            <p>
              <strong>Plano:</strong>{' '}
              <span style={{ 
                padding: '4px 8px', 
                backgroundColor: isPremium ? '#0070f3' : '#10b981',
                color: 'white',
                borderRadius: 4,
              }}>
                {planLabels[subscription.planType]}
              </span>
            </p>
            <p>
              <strong>Status:</strong>{' '}
              <span style={{ 
                color: statusColors[subscription.status],
                fontWeight: 'bold',
              }}>
                {subscription.status}
              </span>
            </p>
            <p>
              <strong>Alertas por dia:</strong> {subscription.maxAlertsPerDay}
            </p>
            <p>
              <strong>Nichos permitidos:</strong> {userNiches.length} / {subscription.maxNiches}
            </p>

            {subscription.status !== 'ACTIVE' && (
              <div style={{ 
                marginTop: 15, 
                padding: 15, 
                backgroundColor: '#fff3cd',
                border: '1px solid #ffc107',
              }}>
                ⚠️ Sua assinatura não está ativa. Ative para receber alertas.
              </div>
            )}
          </div>
        ) : (
          <p>Carregando dados da assinatura...</p>
        )}
      </section>

      {/* TELEGRAM */}
      <section style={{ marginBottom: 24, padding: 20, border: '1px solid #e2e8f0', borderRadius: 14, background: 'white' }}>
        <h2>Telegram</h2>
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

      <section style={{ background: 'white', borderRadius: 14, padding: 16, border: '1px solid #e2e8f0', marginBottom: 24 }}>
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

      <section style={{ background: 'white', borderRadius: 14, padding: 16, border: '1px solid #e2e8f0', marginBottom: 24 }}>
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

      {/* SELEÇÃO DE NICHOS */}
      <section style={{ padding: 20, border: '1px solid #e2e8f0', borderRadius: 14, background: 'white' }}>
        <h2>Seus Nichos</h2>
        
        {!isPremium && (
          <div style={{ 
            padding: 15, 
            backgroundColor: '#e0f2fe',
            marginBottom: 20,
            border: '1px solid #0ea5e9',
          }}>
            ℹ️ <strong>Plano BASE:</strong> Você recebe alertas de todos os produtos virais.
            <br />
            Faça upgrade para PREMIUM e filtre apenas nichos específicos.
          </div>
        )}

        {isPremium && !isActive && (
          <div style={{ 
            padding: 15, 
            backgroundColor: '#fee',
            marginBottom: 20,
            border: '1px solid #ef4444',
          }}>
            ❌ Assinatura inativa. Ative sua conta para gerenciar nichos.
          </div>
        )}

        {isPremium && isActive && (
          <>
            <p style={{ marginBottom: 15 }}>
              Selecione os nichos que deseja monitorar ({userNiches.length}/{subscription?.maxNiches}):
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 15 }}>
              {allNiches.map((niche) => {
                const isSubscribed = userNiches.some((n) => n.id === niche.id);
                return (
                  <div
                    key={niche.id}
                    style={{
                      padding: 15,
                      border: `2px solid ${isSubscribed ? '#0070f3' : '#ddd'}`,
                      backgroundColor: isSubscribed ? '#f0f9ff' : 'white',
                      cursor: 'pointer',
                    }}
                    onClick={() => handleToggleNiche(niche)}
                  >
                    <h3 style={{ margin: '0 0 8px 0', fontSize: 16 }}>
                      {isSubscribed ? '✓ ' : ''}
                      {niche.name}
                    </h3>
                    {niche.description && (
                      <p style={{ margin: 0, fontSize: 14, color: '#666' }}>
                        {niche.description}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {allNiches.length === 0 && (
              <p style={{ color: '#666' }}>Nenhum nicho disponível no momento.</p>
            )}
          </>
        )}

        {!isPremium && (
          <p style={{ color: '#666', marginTop: 15 }}>
            Faça upgrade para Premium para selecionar nichos específicos.
          </p>
        )}
      </section>
      </div>
    </div>
  );
}
