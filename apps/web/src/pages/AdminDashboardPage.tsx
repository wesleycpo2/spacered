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
  const [phone, setPhone] = useState('67993133993');
  const [message, setMessage] = useState('');
  const [aiSummary, setAiSummary] = useState('');

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
      setMessage('Erro ao carregar overview.');
    } finally {
      setLoading(false);
    }
  }

  async function runCollect() {
    setMessage('Coletando...');
    const res = await fetch(`${apiUrl}/admin/collect`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ limit: 20 }),
    });
    const data = await res.json();
    setMessage(`Coleta finalizada: ${data.total || 0} itens.`);
    await loadOverview();
  }

  async function sendWhatsAppTest() {
    if (!phone) {
      setMessage('Informe o número do WhatsApp.');
      return;
    }

    setMessage('Enviando WhatsApp...');
    const res = await fetch(`${apiUrl}/admin/whatsapp-test`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ phoneNumber: phone }),
    });
    const data = await res.json();
    setMessage(data.success ? 'Mensagem enviada (mock).' : 'Falha no envio.');
  }

  async function runAiEvaluation() {
    setMessage('Analisando com IA...');
    const res = await fetch(`${apiUrl}/admin/ai-evaluate`, {
      method: 'POST',
      headers,
    });
    const data = await res.json();
    if (data.success) {
      setAiSummary(data.summary || 'Sem resposta.');
      setMessage('IA concluída.');
    } else {
      setAiSummary('');
      setMessage(data.message || 'Falha na IA.');
    }
  }

  useEffect(() => {
    if (apiUrl) {
      loadOverview();
    }
  }, [apiUrl]);

  const topSignals = signals.slice(0, 6);
  const topProducts = products.slice(0, 6);

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
            <div style={{ color: '#94a3b8', fontSize: 12 }}>IA</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: aiSummary ? '#38bdf8' : '#94a3b8' }}>
              {aiSummary ? 'Resumo pronto' : 'Sem análise'}
            </div>
          </div>
        </section>

        <section style={{ background: 'white', borderRadius: 14, padding: 16, border: '1px solid #e2e8f0', marginBottom: 18 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={runCollect} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' }}>
              Coletar hashtags
            </button>
            <button
              onClick={() => fetch(`${apiUrl}/admin/collect-all`, { method: 'POST', headers, body: JSON.stringify({ limit: 30 }) }).then(loadOverview)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' }}
            >
              Coletar sinais
            </button>
            <button
              onClick={runAiEvaluation}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#eef2ff', cursor: 'pointer' }}
            >
              Avaliar com IA
            </button>
            <input
              placeholder="WhatsApp (ex: 67999999999)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', minWidth: 220 }}
            />
            <button onClick={sendWhatsAppTest} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#22c55e', color: '#0b1220', fontWeight: 600, cursor: 'pointer' }}>
              Enviar WhatsApp
            </button>
            {message && <span style={{ color: '#475569' }}>{message}</span>}
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
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    {Number(p.views).toLocaleString()} views
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
          {aiSummary && (
            <section style={{ background: '#0b1220', color: 'white', borderRadius: 12, padding: 16, marginBottom: 18 }}>
              <h2 style={{ marginTop: 0 }}>Resumo da IA</h2>
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0, color: '#e2e8f0' }}>{aiSummary}</pre>
            </section>
          )}
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
