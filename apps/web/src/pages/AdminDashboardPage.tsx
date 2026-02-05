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
  const [autoCollectorRunning, setAutoCollectorRunning] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [telegramUserIdentifier, setTelegramUserIdentifier] = useState('');
  const [telegramIdentifier, setTelegramIdentifier] = useState('');
  const [telegramMessage, setTelegramMessage] = useState('');
  const [telegramEnabled, setTelegramEnabled] = useState(false);

  const telegramBotUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || '';

  const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
  const adminToken = import.meta.env.VITE_ADMIN_TOKEN || '';

  const headers = useMemo(() => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (adminToken) h['x-admin-token'] = adminToken;
    return h;
  }, [adminToken]);

  async function loadOverview() {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch(`${apiUrl}/admin/overview`, { headers });
      const data = await res.json();
      setProducts(data.products || []);
      setSignals(data.signals || []);
      setLatestReport(data.aiReport || null);
      setAiReports(data.aiReports || []);
      setAutoCollectorRunning(Boolean(data.autoCollectorRunning));
    } catch (err) {
      setErrorMessage('Erro ao carregar overview.');
    } finally {
      setLoading(false);
    }
  }

  async function toggleAutoCollector(action: 'start' | 'stop') {
    if (action === 'start' && !telegramEnabled) {
      setActionMessage('Conecte o Telegram antes de iniciar.');
      return;
    }

    setActionMessage(action === 'start' ? 'Iniciando coleta automática...' : 'Pausando coleta automática...');
    try {
      const res = await fetch(`${apiUrl}/admin/auto-collector/${action}`, {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao atualizar coletor automático.');
      }
      setAutoCollectorRunning(Boolean(data.running));
      setActionMessage(data.running ? 'Coleta automática ativa.' : 'Coleta automática pausada.');
      await loadOverview();
    } catch (err) {
      setActionMessage('Falha ao atualizar coletor automático.');
    }
  }

  async function resetDataAndCollect() {
    if (!adminToken) {
      setActionMessage('ADMIN token não configurado.');
      return;
    }
    setActionMessage('Limpando dados antigos...');
    try {
      const resetRes = await fetch(`${apiUrl}/admin/reset-data`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });
      if (!resetRes.ok) {
        const payload = await resetRes.json().catch(() => ({}));
        throw new Error(payload.error || payload.message || `Falha ao limpar dados (${resetRes.status})`);
      }

      setActionMessage('Recoletando dados reais...');
      const collectRes = await fetch(`${apiUrl}/admin/collect-all`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ limit: 30 }),
      });
      if (!collectRes.ok) {
        const payload = await collectRes.json().catch(() => ({}));
        throw new Error(payload.error || payload.message || `Falha ao coletar dados (${collectRes.status})`);
      }

      await loadOverview();
      setActionMessage('Dados reais carregados.');
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Falha ao resetar e coletar.');
    }
  }

  async function connectTelegram() {
    if (!telegramUserIdentifier || !telegramIdentifier) {
      setTelegramMessage('Informe telefone ou email e @username/chat_id.');
      return;
    }

    const isEmail = telegramUserIdentifier.includes('@');
    const body = isEmail
      ? { email: telegramUserIdentifier, identifier: telegramIdentifier }
      : { phone: telegramUserIdentifier, identifier: telegramIdentifier };

    setTelegramMessage('Conectando Telegram...');
    try {
      const res = await fetch(`${apiUrl}/admin/telegram/connect`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao conectar Telegram.');
      }
      setTelegramEnabled(Boolean(data.data?.enabled));
      setTelegramMessage('Telegram conectado.');
    } catch (err) {
      setTelegramMessage(err instanceof Error ? err.message : 'Falha ao conectar Telegram.');
    }
  }

  async function disableTelegram() {
    if (!telegramUserIdentifier) {
      setTelegramMessage('Informe o telefone ou email do usuário.');
      return;
    }

    const isEmail = telegramUserIdentifier.includes('@');
    const body = isEmail ? { email: telegramUserIdentifier } : { phone: telegramUserIdentifier };

    setTelegramMessage('Desativando Telegram...');
    try {
      const res = await fetch(`${apiUrl}/admin/telegram/disable`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao desativar Telegram.');
      }
      setTelegramEnabled(Boolean(data.data?.enabled));
      setTelegramMessage('Telegram desativado.');
    } catch (err) {
      setTelegramMessage(err instanceof Error ? err.message : 'Falha ao desativar Telegram.');
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
            <div style={{ color: '#94a3b8', fontSize: 12 }}>Status</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: loading ? '#f59e0b' : '#22c55e' }}>
              {loading ? 'Carregando...' : 'Ativo'}
            </div>
          </div>
          <div style={{ background: '#0b1220', color: 'white', borderRadius: 14, padding: 16, border: '1px solid #1e293b' }}>
            <div style={{ color: '#94a3b8', fontSize: 12 }}>Automação</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: autoCollectorRunning ? '#38bdf8' : '#94a3b8' }}>
              {autoCollectorRunning ? 'Rodando' : 'Pausado'}
            </div>
          </div>
        </section>

        <section style={{ background: 'white', borderRadius: 14, padding: 16, border: '1px solid #e2e8f0', marginBottom: 18 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={() => toggleAutoCollector('start')}
              disabled={autoCollectorRunning}
              style={{
                padding: '8px 16px',
                borderRadius: 999,
                border: '1px solid #cbd5e1',
                background: autoCollectorRunning ? '#e2e8f0' : '#22c55e',
                color: autoCollectorRunning ? '#64748b' : '#0b1220',
                cursor: autoCollectorRunning ? 'not-allowed' : 'pointer',
                fontWeight: 600,
              }}
            >
              ▶ Play
            </button>
            <button
              onClick={() => toggleAutoCollector('stop')}
              disabled={!autoCollectorRunning}
              style={{
                padding: '8px 16px',
                borderRadius: 999,
                border: '1px solid #cbd5e1',
                background: !autoCollectorRunning ? '#e2e8f0' : '#ef4444',
                color: !autoCollectorRunning ? '#64748b' : '#fff',
                cursor: !autoCollectorRunning ? 'not-allowed' : 'pointer',
                fontWeight: 600,
              }}
            >
              ⏹ Stop
            </button>
            <button
              onClick={resetDataAndCollect}
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
              ♻ Limpar & Recoletar
            </button>
            {actionMessage && <span style={{ color: '#475569' }}>{actionMessage}</span>}
            {errorMessage && <span style={{ color: '#ef4444' }}>{errorMessage}</span>}
          </div>
        </section>

        <section style={{ background: 'white', borderRadius: 14, padding: 16, border: '1px solid #e2e8f0', marginBottom: 18 }}>
          <h2 style={{ marginTop: 0 }}>Telegram (Cliente)</h2>
          <ol style={{ marginTop: 0, color: '#475569', paddingLeft: 18 }}>
            <li>O cliente precisa enviar <strong>/start</strong> para o bot.</li>
            <li>Preencha o email do cliente e o @username.</li>
            <li>Clique em <strong>Verificar</strong>. Se validar, o Play é liberado.</li>
          </ol>
          {telegramBotUsername && (
            <p style={{ marginTop: 0 }}>
              Bot: <a href={`https://t.me/${telegramBotUsername.replace('@', '')}`} target="_blank" rel="noreferrer">@{telegramBotUsername.replace('@', '')}</a>
            </p>
          )}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              placeholder="Telefone ou email do cliente"
              value={telegramUserIdentifier}
              onChange={(e) => setTelegramUserIdentifier(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', minWidth: 220 }}
            />
            <input
              placeholder="@username ou chat_id"
              value={telegramIdentifier}
              onChange={(e) => setTelegramIdentifier(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', minWidth: 220 }}
            />
            <button
              onClick={connectTelegram}
              disabled={!telegramUserIdentifier || !telegramIdentifier}
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
              ✅ Verificar
            </button>
            <button
              onClick={disableTelegram}
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
              ⏹ Desativar
            </button>
            {telegramMessage && <span style={{ color: '#475569' }}>{telegramMessage}</span>}
          </div>
        </section>

        {loading ? (
          <p style={{ color: '#e2e8f0' }}>Carregando...</p>
        ) : (
          <>
          <section style={{ background: 'white', borderRadius: 14, padding: 16, border: '1px solid #e2e8f0', marginBottom: 18 }}>
            <h2 style={{ marginTop: 0 }}>Produtos em alta</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
              {topProducts.map((p) => (
                <div key={p.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Score</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{p.viralScore}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginTop: 6 }}>{p.title}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{Number(p.views).toLocaleString()} views</div>
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
