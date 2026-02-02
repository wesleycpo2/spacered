/**
 * LANDING PAGE
 * 
 * Página pública com CTA e modal de cadastro
 */

import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function LandingPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await register(email, password, name || undefined);
      setIsModalOpen(false);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', color: '#0f172a' }}>
      {/* HERO */}
      <section style={{ padding: '80px 24px', background: '#0b1220', color: 'white' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h1 style={{ fontSize: 44, marginBottom: 16 }}>
            Descubra o que vai viralizar no TikTok antes dos concorrentes
          </h1>
          <p style={{ fontSize: 18, maxWidth: 700, lineHeight: 1.6, color: '#cbd5f5' }}>
            O TikTok Trend Alert analisa sinais de crescimento e avisa quando um produto
            está prestes a explodir. Pare de adivinhar e comece a vender antes do mercado.
          </p>
          <div style={{ marginTop: 28, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              onClick={() => setIsModalOpen(true)}
              style={{
                background: '#22c55e',
                color: '#0b1220',
                border: 'none',
                padding: '12px 20px',
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
                borderRadius: 8,
              }}
            >
              Quero receber alertas
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              style={{
                background: 'transparent',
                color: 'white',
                border: '1px solid #3b82f6',
                padding: '12px 20px',
                fontSize: 16,
                cursor: 'pointer',
                borderRadius: 8,
              }}
            >
              Ver planos
            </button>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: '60px 24px', background: '#f8fafc' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, marginBottom: 24 }}>
            Automação inteligente para encontrar tendências reais
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {[
              {
                title: 'Detecção antecipada',
                text: 'Identificamos sinais de crescimento antes do pico viral.',
              },
              {
                title: 'Alertas em tempo real',
                text: 'Receba notificações imediatas e aja rápido no mercado.',
              },
              {
                title: 'Filtro por nichos',
                text: 'Plano premium com nichos específicos para você.',
              },
            ].map((item) => (
              <div key={item.title} style={{ background: 'white', padding: 20, border: '1px solid #e2e8f0', borderRadius: 12 }}>
                <h3 style={{ marginBottom: 8 }}>{item.title}</h3>
                <p style={{ margin: 0, color: '#475569' }}>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANS */}
      <section style={{ padding: '60px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, marginBottom: 24 }}>Planos de assinatura</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 24 }}>
              <h3>Plano Base</h3>
              <p style={{ fontSize: 26, margin: '8px 0' }}>R$ 97/mês</p>
              <ul style={{ paddingLeft: 18, color: '#475569' }}>
                <li>Alertas de produtos virais</li>
                <li>Até 50 alertas/dia</li>
                <li>Acesso a todos os nichos</li>
              </ul>
              <button
                onClick={() => setIsModalOpen(true)}
                style={{ marginTop: 12, width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', cursor: 'pointer' }}
              >
                Assinar Base
              </button>
            </div>
            <div style={{ border: '2px solid #2563eb', borderRadius: 12, padding: 24, background: '#eff6ff' }}>
              <h3>Plano Premium</h3>
              <p style={{ fontSize: 26, margin: '8px 0' }}>R$ 197/mês</p>
              <ul style={{ paddingLeft: 18, color: '#1e3a8a' }}>
                <li>Alertas prioritários</li>
                <li>Até 200 alertas/dia</li>
                <li>Filtro por nichos</li>
              </ul>
              <button
                onClick={() => setIsModalOpen(true)}
                style={{ marginTop: 12, width: '100%', padding: 10, borderRadius: 8, border: 'none', background: '#2563eb', color: 'white', cursor: 'pointer' }}
              >
                Assinar Premium
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* MODAL CADASTRO */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 50,
          }}
          onClick={() => !isLoading && setIsModalOpen(false)}
        >
          <div
            style={{ background: 'white', padding: 24, borderRadius: 12, maxWidth: 420, width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>Criar conta</h3>
            <form onSubmit={handleRegister}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Nome (opcional)</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', padding: 8 }}
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{ width: '100%', padding: 8 }}
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  style={{ width: '100%', padding: 8 }}
                />
              </div>

              {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: 10,
                  border: 'none',
                  background: '#22c55e',
                  color: 'white',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                {isLoading ? 'Criando...' : 'Criar conta'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
