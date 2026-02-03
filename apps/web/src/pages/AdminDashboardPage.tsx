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
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');

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

  useEffect(() => {
    if (apiUrl) {
      loadOverview();
    }
  }, [apiUrl]);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 24, color: '#0f172a' }}>
      <h1>Dashboard Admin (MVP)</h1>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <button onClick={runCollect} style={{ padding: '8px 12px' }}>Coletar hashtags</button>
        <button onClick={() => fetch(`${apiUrl}/admin/collect-all`, { method: 'POST', headers, body: JSON.stringify({ limit: 30 }) }).then(loadOverview)} style={{ padding: '8px 12px' }}>
          Coletar sinais
        </button>
        <input
          placeholder="WhatsApp (ex: 67999999999)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={{ padding: '8px 12px' }}
        />
        <button onClick={sendWhatsAppTest} style={{ padding: '8px 12px' }}>Enviar WhatsApp</button>
      </div>

      {message && <p>{message}</p>}

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <>
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
        <h2 style={{ marginTop: 24 }}>Sinais recentes</h2>
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
        </>
      )}
    </div>
  );
}
