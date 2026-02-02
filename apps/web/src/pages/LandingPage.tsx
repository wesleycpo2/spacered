/**
 * LANDING PAGE
 * 
 * Página pública com CTA e modal de cadastro
 */

import { useCallback } from 'react';

export function LandingPage() {
  const scrollToPlans = useCallback(() => {
    document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

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
              onClick={scrollToPlans}
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
              onClick={scrollToPlans}
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
              Ver plano
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

      {/* PLANO */}
      <section id="planos" style={{ padding: '60px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, marginBottom: 24 }}>Plano de assinatura</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            <div style={{ border: '2px solid #2563eb', borderRadius: 12, padding: 24, background: '#eff6ff' }}>
              <h3>Plano Premium</h3>
              <p style={{ fontSize: 26, margin: '8px 0' }}>R$ 97/mês</p>
              <ul style={{ paddingLeft: 18, color: '#1e3a8a' }}>
                <li>Alertas prioritários</li>
                <li>Até 200 alertas/dia</li>
                <li>Filtro por nichos</li>
              </ul>
              <button
                onClick={scrollToPlans}
                style={{ marginTop: 12, width: '100%', padding: 10, borderRadius: 8, border: 'none', background: '#2563eb', color: 'white', cursor: 'pointer' }}
              >
                Assinar Plano
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section style={{ padding: '50px 24px', background: '#0b1220', color: 'white' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ marginBottom: 12 }}>Pronto para dominar as tendências?</h2>
          <p style={{ color: '#cbd5f5', marginBottom: 20 }}>
            Entre na lista de espera e receba acesso antecipado.
          </p>
          <a
            href="mailto:contato@tiktoktrendalert.com"
            style={{
              display: 'inline-block',
              background: '#22c55e',
              color: '#0b1220',
              padding: '12px 20px',
              borderRadius: 8,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Quero entrar na lista
          </a>
        </div>
      </section>
    </div>
  );
}
