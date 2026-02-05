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

interface AiReportItem {
  id: string;
  summary: string;
  createdAt: string;
}

export function DashboardPage() {
  const { user, subscription, logout, refreshSubscription } = useAuth();
  const navigate = useNavigate();

  const [allNiches, setAllNiches] = useState<Niche[]>([]);
  const [userNiches, setUserNiches] = useState<Niche[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [signals, setSignals] = useState<TrendSignalItem[]>([]);
  const [latestReport, setLatestReport] = useState<AiReportItem | null>(null);
  const [aiReports, setAiReports] = useState<AiReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [telegramIdentifier, setTelegramIdentifier] = useState('');
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [telegramMessage, setTelegramMessage] = useState('');
  const [alertsEnabled, setAlertsEnabled] = useState(false);

  const telegramBotUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || '';

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
      try {
        const telegramConfig = await api.getTelegramConfig();
        setTelegramEnabled(Boolean(telegramConfig.enabled));
        setTelegramIdentifier(telegramConfig.telegramChatId || '');
      } catch {
        // ignore telegram config errors
      }
      setAllNiches(niches);
      setUserNiches(myNiches);
      setProducts(overview.products || []);
      setSignals(overview.signals || []);
      setLatestReport(overview.aiReport || null);
      setAiReports(overview.aiReports || []);
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

  async function handleTelegramPlay() {
    setTelegramMessage('Conectando Telegram...');
    try {
      const data = await api.connectTelegram(telegramIdentifier);
      setTelegramEnabled(Boolean(data.enabled));
      setTelegramIdentifier(data.telegramChatId || telegramIdentifier);
      setTelegramMessage('Telegram conectado.');
    } catch (err) {
      setTelegramMessage(err instanceof Error ? err.message : 'Falha ao conectar Telegram.');
    }
  }

  function handleAlertsPlay() {
    if (!telegramEnabled) return;
    setAlertsEnabled(true);
    setTelegramMessage('Alertas liberados.');
  }

  async function handleTelegramStop() {
    setTelegramMessage('Desativando Telegram...');
    try {
      const data = await api.disableTelegram();
      setTelegramEnabled(Boolean(data.enabled));
      setAlertsEnabled(false);
      setTelegramMessage('Telegram desativado.');
    } catch (err) {
      setTelegramMessage(err instanceof Error ? err.message : 'Falha ao desativar Telegram.');
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
          <div style={{ color: '#94a3b8', fontSize: 12 }}>Relatórios de IA</div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{aiReports.length}</div>
        </div>
        <div style={{ background: '#0b1220', color: 'white', borderRadius: 14, padding: 16, border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8', fontSize: 12 }}>Telegram</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: telegramEnabled ? '#38bdf8' : '#94a3b8' }}>
            {telegramEnabled ? 'Conectado' : 'Pendente'}
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
          Envie <strong>/start</strong> para o bot, depois informe seu @username e clique em <strong>Verificar</strong>.
        </p>
        {telegramBotUsername && (
          <p style={{ marginTop: 0 }}>
            Bot: <a href={`https://t.me/${telegramBotUsername.replace('@', '')}`} target="_blank" rel="noreferrer">@{telegramBotUsername.replace('@', '')}</a>
          </p>
        )}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            placeholder="Seu @username ou chat_id"
            value={telegramIdentifier}
            onChange={(e) => setTelegramIdentifier(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', minWidth: 260 }}
          />
          <button
            onClick={handleTelegramPlay}
            disabled={!telegramIdentifier || telegramEnabled}
            style={{
              padding: '8px 16px',
              borderRadius: 999,
              border: '1px solid #cbd5e1',
              background: telegramEnabled ? '#e2e8f0' : '#22c55e',
              color: telegramEnabled ? '#64748b' : '#0b1220',
              cursor: telegramEnabled ? 'not-allowed' : 'pointer',
              fontWeight: 600,
            }}
          >
            ✅ Verificar
          </button>
          <button
            onClick={handleAlertsPlay}
            disabled={!telegramEnabled || alertsEnabled}
            style={{
              padding: '8px 16px',
              borderRadius: 999,
              border: '1px solid #cbd5e1',
              background: !telegramEnabled || alertsEnabled ? '#e2e8f0' : '#22c55e',
              color: !telegramEnabled || alertsEnabled ? '#64748b' : '#0b1220',
              cursor: !telegramEnabled || alertsEnabled ? 'not-allowed' : 'pointer',
              fontWeight: 600,
            }}
          >
            ▶ Play
          </button>
          <button
            onClick={handleTelegramStop}
            disabled={!telegramEnabled}
            style={{
              padding: '8px 16px',
              borderRadius: 999,
              border: '1px solid #cbd5e1',
              background: !telegramEnabled ? '#e2e8f0' : '#ef4444',
              color: !telegramEnabled ? '#64748b' : '#fff',
              cursor: !telegramEnabled ? 'not-allowed' : 'pointer',
              fontWeight: 600,
            }}
          >
            ⏹ Stop
          </button>
          {telegramMessage && <span style={{ color: '#475569' }}>{telegramMessage}</span>}
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{ background: 'white', borderRadius: 14, padding: 16, border: '1px solid #e2e8f0' }}>
          <h2 style={{ marginTop: 0 }}>Relatório IA</h2>
          {latestReport ? (
            <>
              <p style={{ color: '#475569' }}>{latestReport.summary}</p>
              <p style={{ fontSize: 12, color: '#94a3b8' }}>
                Última atualização: {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(latestReport.createdAt))}
              </p>
            </>
          ) : (
            <p style={{ color: '#64748b' }}>Relatório ainda não disponível.</p>
          )}
        </div>
        <div style={{ background: 'white', borderRadius: 14, padding: 16, border: '1px solid #e2e8f0' }}>
          <h2 style={{ marginTop: 0 }}>Histórico IA</h2>
          {aiReports.length === 0 && <p style={{ color: '#64748b' }}>Sem relatórios recentes.</p>}
          <ul style={{ paddingLeft: 18, margin: 0, color: '#475569' }}>
            {aiReports.map((report) => (
              <li key={report.id} style={{ marginBottom: 8 }}>
                {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(report.createdAt))}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section style={{ background: 'white', borderRadius: 14, padding: 16, border: '1px solid #e2e8f0', marginBottom: 24 }}>
        <h2 style={{ marginTop: 0 }}>Produtos em alta</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {products.slice(0, 6).map((p) => (
            <div key={p.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 12, color: '#64748b' }}>Score</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{p.viralScore}</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 6 }}>{p.title}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{Number(p.views).toLocaleString()} views</div>
              {p.impressions != null && (
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  Impressões: {Number(p.impressions).toLocaleString()}
                </div>
              )}
              {(p.ctr != null || p.cvr != null || p.cpa != null) && (
                <div style={{ fontSize: 12, color: '#475569' }}>
                  CTR: {p.ctr != null ? `${p.ctr.toFixed(2)}%` : 'n/d'} • CVR: {p.cvr != null ? `${p.cvr.toFixed(2)}%` : 'n/d'} • CPA: {p.cpa != null ? p.cpa.toFixed(2) : 'n/d'}
                </div>
              )}
              {(p.postCount != null || p.postChange != null) && (
                <div style={{ fontSize: 12, color: '#475569' }}>
                  Posts: {p.postCount ?? 'n/d'} • Δ {p.postChange != null ? `${p.postChange.toFixed(2)}%` : 'n/d'}
                </div>
              )}
              <div style={{ fontSize: 12, color: '#0f172a', marginTop: 6 }}>
                Cresc. 48h: {p.insights?.growth48h ?? 0}%
              </div>
              <div style={{ fontSize: 12, color: '#0f172a' }}>
                Saturação: {p.insights?.saturationLabel ?? 'n/d'}
              </div>
              <div style={{ fontSize: 12, color: '#0f172a' }}>
                Engajamento: {p.insights?.engagementLabel ?? 'n/d'}
              </div>
              <div style={{ fontSize: 12, color: '#0f172a' }}>
                Probabilidade: {p.insights?.probability ?? 0}%
              </div>
              <a href={p.tiktokUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#2563eb' }}>
                Abrir no TikTok
              </a>
            </div>
          ))}
          {products.length === 0 && <p style={{ color: '#64748b' }}>Nenhum produto carregado ainda.</p>}
        </div>
      </section>

      <section style={{ background: 'white', borderRadius: 14, padding: 16, border: '1px solid #e2e8f0', marginBottom: 24 }}>
        <h2 style={{ marginTop: 0 }}>Sinais recentes</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
          {signals.slice(0, 12).map((signal) => (
            <div key={signal.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 12, color: '#64748b' }}>{signal.type}</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{signal.value}</div>
              <div style={{ fontSize: 12, color: '#475569' }}>
                Crescimento: {signal.growthPercent}%
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>
                {signal.region || 'Global'}
              </div>
            </div>
          ))}
          {signals.length === 0 && <p style={{ color: '#64748b' }}>Sem sinais recentes.</p>}
        </div>
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
