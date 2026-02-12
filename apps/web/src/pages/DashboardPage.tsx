/**
 * DASHBOARD PAGE
 * 
 * Página principal com status da assinatura e seleção de nichos
 */

import { useState, useEffect, useMemo } from 'react';
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
  lastScrapedAt?: string | null;
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

const compactFormatter = new Intl.NumberFormat('pt-BR', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat('pt-BR');

const signalLabels: Record<string, string> = {
  HASHTAG: 'Hashtags em alta',
  SOUND: 'Sons em alta',
  VIDEO: 'Vídeos em alta',
};

const signalOrder = ['HASHTAG', 'SOUND', 'VIDEO'];

function formatCompact(value: number | null | undefined) {
  if (!Number.isFinite(value as number)) {
    return '—';
  }
  return compactFormatter.format(value as number);
}

function formatNumber(value: number | null | undefined) {
  if (!Number.isFinite(value as number)) {
    return '—';
  }
  return numberFormatter.format(value as number);
}

function formatPercent(value: number | null | undefined) {
  if (!Number.isFinite(value as number)) {
    return '—';
  }
  return `${(value as number).toFixed(1)}%`;
}

function formatRatioPercent(value: number | null | undefined) {
  if (!Number.isFinite(value as number)) {
    return '—';
  }
  const numeric = value as number;
  const normalized = Math.abs(numeric) <= 1 ? numeric * 100 : numeric;
  const sign = normalized >= 0 ? '' : '-';
  return `${sign}${Math.abs(normalized).toFixed(1)}%`;
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

  const productSummary = useMemo(() => {
    if (!products.length) {
      return {
        totalViews: 0,
        totalImpressions: 0,
        averageViralScore: 0,
        averageGrowth48h: 0,
        bestProbability: 0,
        bestProductTitle: '',
        topCategory: '',
      };
    }

    let viewAccumulator = 0;
    let impressionAccumulator = 0;
    let viralScoreAccumulator = 0;
    let growthAccumulator = 0;
    let growthSamples = 0;
    let bestProduct: ProductItem | null = null;
    const categoryCounter = new Map<string, number>();

    for (const product of products) {
      const views = Number(product.views ?? 0);
      const impressions = Number(product.impressions ?? 0);

      viewAccumulator += views;
      impressionAccumulator += impressions;
      viralScoreAccumulator += Number(product.viralScore ?? 0);

      if (Number.isFinite(product.insights?.growth48h)) {
        growthAccumulator += Number(product.insights?.growth48h ?? 0);
        growthSamples += 1;
      }

      if (!bestProduct || (product.insights?.probability ?? 0) > (bestProduct.insights?.probability ?? 0)) {
        bestProduct = product;
      }

      const categories = [product.ecomCategory1, product.ecomCategory2, product.ecomCategory3].filter(Boolean) as string[];
      for (const category of categories) {
        categoryCounter.set(category, (categoryCounter.get(category) || 0) + 1);
      }
    }

    const [topCategory] = Array.from(categoryCounter.entries()).sort((a, b) => b[1] - a[1]);

    return {
      totalViews: viewAccumulator,
      totalImpressions: impressionAccumulator,
      averageViralScore: Math.round(viralScoreAccumulator / products.length),
      averageGrowth48h: growthSamples ? growthAccumulator / growthSamples : 0,
      bestProbability: bestProduct?.insights?.probability ?? bestProduct?.viralScore ?? 0,
      bestProductTitle: bestProduct?.title ?? '',
      topCategory: topCategory ? topCategory[0] : '',
    };
  }, [products]);

  const groupedSignals = useMemo(() => {
    const groups: Record<string, TrendSignalItem[]> = {};
    for (const signal of signals) {
      if (!groups[signal.type]) {
        groups[signal.type] = [];
      }
      groups[signal.type].push(signal);
    }
    return groups;
  }, [signals]);

  const orderedSignalTypes = useMemo(() => {
    const known = signalOrder.filter((type) => groupedSignals[type]?.length);
    const extras = Object.keys(groupedSignals).filter((type) => !signalOrder.includes(type));
    return [...known, ...extras];
  }, [groupedSignals]);

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
          <div style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4 }}>Produtos monitorados</div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{products.length}</div>
          <div style={{ marginTop: 4, color: '#64748b', fontSize: 12 }}>Top categoria: {productSummary.topCategory || '—'}</div>
        </div>
        <div style={{ background: '#111827', color: 'white', borderRadius: 14, padding: 16, border: '1px solid #1f2937' }}>
          <div style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4 }}>Sinais recentes</div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{signals.length}</div>
          <div style={{ marginTop: 4, color: '#64748b', fontSize: 12 }}>Atualizados nas últimas 48h</div>
        </div>
        <div style={{ background: '#0b1220', color: 'white', borderRadius: 14, padding: 16, border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4 }}>Impressões acumuladas</div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{formatCompact(productSummary.totalImpressions || productSummary.totalViews)}</div>
          <div style={{ marginTop: 4, color: '#64748b', fontSize: 12 }}>Somatório dos itens monitorados</div>
        </div>
        <div style={{ background: '#111827', color: 'white', borderRadius: 14, padding: 16, border: '1px solid #1f2937' }}>
          <div style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4 }}>Crescimento médio 48h</div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{formatPercent(productSummary.averageGrowth48h)}</div>
          <div style={{ marginTop: 4, color: '#64748b', fontSize: 12 }}>Baseado nas tendências recentes</div>
        </div>
        <div style={{ background: '#0f172a', color: 'white', borderRadius: 14, padding: 16, border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4 }}>Melhor oportunidade</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{productSummary.bestProductTitle || 'Sem dados'}</div>
          <div style={{ color: '#38bdf8', fontWeight: 600 }}>{productSummary.bestProbability ? `${productSummary.bestProbability.toFixed(0)}% probabilidade` : 'Aguardando coleta'}</div>
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
        <h2 style={{ marginTop: 0 }}>Produtos monitorados</h2>
        <p style={{ marginTop: 0, marginBottom: 16, color: '#475569' }}>
          Indicadores coletados diretamente do TikTok Creative Center (views, impressões, CTR, engajamento e probabilidade calculada).
        </p>

        {products.length === 0 ? (
          <p style={{ color: '#64748b' }}>
            Nenhum produto disponível ainda. Execute a coleta manual ou aguarde o próximo ciclo automático.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {products.map((product) => {
              const categories = [product.ecomCategory1, product.ecomCategory2, product.ecomCategory3]
                .filter(Boolean)
                .join(' • ');
              const probability = product.insights?.probability ?? null;
              const growth = product.insights?.growth48h ?? null;
              const engagementLabel = product.insights?.engagementLabel ?? '—';
              const saturationLabel = product.insights?.saturationLabel ?? '—';
              const impressions = product.impressions ?? product.views ?? 0;
              const postChangeValue = Number(product.postChange);
              const postChange = Number.isFinite(postChangeValue)
                ? `${postChangeValue > 0 ? '+' : ''}${postChangeValue}`
                : '—';
              const updatedAt = product.lastScrapedAt ? new Date(product.lastScrapedAt) : null;

              return (
                <article
                  key={product.id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 16,
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    background: '#f8fafc',
                  }}
                >
                  <div style={{ display: 'flex', gap: 12 }}>
                    {product.thumbnail ? (
                      <img
                        src={product.thumbnail}
                        alt={product.title}
                        style={{ width: 72, height: 72, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 72,
                          height: 72,
                          borderRadius: 12,
                          background: '#0f172a',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 600,
                        }}
                      >
                        {product.title.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <h3 style={{ margin: 0, fontSize: 16 }}>{product.title}</h3>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{product.viralScore}</span>
                      </div>
                      <div style={{ color: '#475569', fontSize: 13 }}>
                        {categories || 'Categoria não informada'}
                      </div>
                      <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ background: '#e2e8f0', color: '#0f172a', borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 600 }}>
                          {product.status}
                        </span>
                        <span style={{ background: '#1e293b', color: 'white', borderRadius: 999, padding: '4px 10px', fontSize: 12 }}>
                          Prob.: {probability ? `${probability.toFixed(0)}%` : '—'}
                        </span>
                        <span style={{ background: '#0ea5e9', color: 'white', borderRadius: 999, padding: '4px 10px', fontSize: 12 }}>
                          Cresc. 48h: {formatPercent(growth)}
                        </span>
                        <span style={{ background: '#22c55e', color: 'white', borderRadius: 999, padding: '4px 10px', fontSize: 12 }}>
                          Engajamento: {engagementLabel}
                        </span>
                        <span style={{ background: '#f97316', color: 'white', borderRadius: 999, padding: '4px 10px', fontSize: 12 }}>
                          Saturação: {saturationLabel}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
                    <div style={{ background: 'white', borderRadius: 12, padding: 10 }}>
                      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase' }}>Views</div>
                      <div style={{ fontWeight: 600 }}>{formatCompact(product.views)}</div>
                    </div>
                    <div style={{ background: 'white', borderRadius: 12, padding: 10 }}>
                      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase' }}>Impressões</div>
                      <div style={{ fontWeight: 600 }}>{formatCompact(impressions)}</div>
                    </div>
                    <div style={{ background: 'white', borderRadius: 12, padding: 10 }}>
                      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase' }}>Likes</div>
                      <div style={{ fontWeight: 600 }}>{formatCompact(product.likes)}</div>
                    </div>
                    <div style={{ background: 'white', borderRadius: 12, padding: 10 }}>
                      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase' }}>Comentários</div>
                      <div style={{ fontWeight: 600 }}>{formatCompact(product.comments)}</div>
                    </div>
                    <div style={{ background: 'white', borderRadius: 12, padding: 10 }}>
                      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase' }}>Compart.</div>
                      <div style={{ fontWeight: 600 }}>{formatCompact(product.shares)}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
                    <div style={{ background: 'white', borderRadius: 12, padding: 10 }}>
                      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase' }}>CTR</div>
                      <div style={{ fontWeight: 600 }}>{formatRatioPercent(product.ctr)}</div>
                    </div>
                    <div style={{ background: 'white', borderRadius: 12, padding: 10 }}>
                      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase' }}>CVR</div>
                      <div style={{ fontWeight: 600 }}>{formatRatioPercent(product.cvr)}</div>
                    </div>
                    <div style={{ background: 'white', borderRadius: 12, padding: 10 }}>
                      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase' }}>CPA</div>
                      <div style={{ fontWeight: 600 }}>{formatNumber(product.cpa)}</div>
                    </div>
                    <div style={{ background: 'white', borderRadius: 12, padding: 10 }}>
                      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase' }}>Custo</div>
                      <div style={{ fontWeight: 600 }}>{formatNumber(product.cost)}</div>
                    </div>
                    <div style={{ background: 'white', borderRadius: 12, padding: 10 }}>
                      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase' }}>Posts</div>
                      <div style={{ fontWeight: 600 }}>{formatNumber(product.postCount)}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>Var.: {postChange}</div>
                    </div>
                    <div style={{ background: 'white', borderRadius: 12, padding: 10 }}>
                      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase' }}>Play 6s</div>
                      <div style={{ fontWeight: 600 }}>{formatRatioPercent(product.playSixRate)}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <a
                      href={product.tiktokUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#1d4ed8', fontWeight: 600 }}
                    >
                      Abrir no TikTok ↗
                    </a>
                    <span style={{ fontSize: 12, color: '#64748b' }}>
                      Atualizado: {updatedAt ? updatedAt.toLocaleDateString('pt-BR') : '—'}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section style={{ background: 'white', borderRadius: 14, padding: 16, border: '1px solid #e2e8f0', marginBottom: 24 }}>
        <h2 style={{ marginTop: 0 }}>Alertas recentes</h2>
        <p style={{ marginTop: 0, color: '#475569' }}>
          Principais sinais detectados (hashtags, sons e vídeos) ordenados por crescimento nos últimos dias.
        </p>

        {signals.length === 0 ? (
          <p style={{ color: '#64748b' }}>Nenhum sinal registrado no momento.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {orderedSignalTypes.map((type) => {
                const list = (groupedSignals[type] || []).slice(0, 6);
                return (
                  <div key={type} style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: 16, background: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <h3 style={{ margin: 0, fontSize: 16 }}>{signalLabels[type] || type}</h3>
                      <span style={{ fontSize: 12, color: '#475569' }}>{list.length} itens</span>
                    </div>
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {list.map((signal) => (
                        <li key={signal.id} style={{ background: 'white', borderRadius: 12, padding: 12, border: '1px solid #e2e8f0' }}>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{signal.value}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, fontSize: 12 }}>
                            <span style={{ color: '#0ea5e9', fontWeight: 600 }}>
                              {signal.growthPercent >= 0 ? '+' : ''}{signal.growthPercent.toFixed(1)}%
                            </span>
                            <span style={{ color: '#475569' }}>{signal.category || '—'}</span>
                            <span style={{ color: '#94a3b8' }}>{signal.region || 'BR'}</span>
                          </div>
                          <div style={{ marginTop: 6, fontSize: 11, color: '#94a3b8' }}>
                            {new Date(signal.collectedAt).toLocaleString('pt-BR')}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
          </div>
        )}
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
