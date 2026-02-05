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

interface AiReportItem {
  id: string;
  summary: string;
  createdAt: string;
}

export function AdminDashboardPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [signals, setSignals] = useState<TrendSignalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [latestReport, setLatestReport] = useState<AiReportItem | null>(null);
  const [aiReports, setAiReports] = useState<AiReportItem[]>([]);
  const [telegramMessage, setTelegramMessage] = useState('');
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
      setLatestReport(data.aiReport || null);
      setAiReports(data.aiReports || []);
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


  useEffect(() => {
    if (apiUrl) {
      loadOverview();
    }
  }, [apiUrl]);

  const topSignals = signals.slice(0, 6);
  const topProducts = products.slice(0, 6);
  const formattedLatest = latestReport?.createdAt
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(latestReport.createdAt)
      )
    : null;

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
            <div style={{ color: '#94a3b8', fontSize: 12 }}>Relatórios de IA</div>
            <div style={{ fontSize: 26, fontWeight: 700 }}>{aiReports.length}</div>
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
            <h2 style={{ marginTop: 0 }}>Produtos em alta</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
              {topProducts.map((p) => (
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
                </div>
              ))}
            </div>
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
          {latestReport && (
            <section style={{ background: '#0b1220', color: 'white', borderRadius: 12, padding: 16, marginBottom: 18 }}>
              <h2 style={{ marginTop: 0 }}>Resumo da IA</h2>
              {formattedLatest && (
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
                  Última atualização: {formattedLatest}
                </div>
              )}
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0, color: '#e2e8f0' }}>
                {latestReport.summary || 'Sem resumo.'}
              </pre>
            </section>
          )}
          {aiReports.length > 0 && (
            <section style={{ background: 'white', borderRadius: 14, padding: 16, border: '1px solid #e2e8f0', marginBottom: 18 }}>
              <h2 style={{ marginTop: 0 }}>Histórico da IA</h2>
              <div style={{ display: 'grid', gap: 12 }}>
                {aiReports.map((report) => (
                  <div key={report.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                      {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(
                        new Date(report.createdAt)
                      )}
                    </div>
                    <div style={{ fontSize: 14, color: '#0f172a', whiteSpace: 'pre-wrap' }}>{report.summary}</div>
                  </div>
                ))}
              </div>
            </section>
          )}
          <section style={{ background: '#f8fafc', borderRadius: 14, padding: 16, border: '1px solid #e2e8f0', marginBottom: 18 }}>
            <h2 style={{ marginTop: 0 }}>Como a IA analisa vídeos</h2>
            <ul style={{ margin: 0, paddingLeft: 18, color: '#334155' }}>
              <li>Crescimento de views nas últimas 48h.</li>
              <li>Engajamento: (likes + comentários + shares) / views.</li>
              <li>Saturação: baixa quando o crescimento acelera rápido.</li>
              <li>Probabilidade semanal combina score + crescimento + engajamento.</li>
            </ul>
          </section>
          <section style={{ background: 'white', borderRadius: 14, padding: 16, border: '1px solid #e2e8f0' }}>
            <h2 style={{ marginTop: 0 }}>Sinais recentes</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
              {topSignals.map((s) => (
                <div key={s.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{s.type}</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{s.region || '—'}</div>
                  <div style={{ height: 6, background: '#e2e8f0', borderRadius: 999, marginTop: 8 }}>
                    <div
                      style={{
                        height: 6,
                        width: `${Math.min(100, s.growthPercent)}%`,
                        background: '#22c55e',
                        borderRadius: 999,
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 12, color: '#16a34a', marginTop: 4 }}>
                    +{s.growthPercent.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
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
