/**
 * LANDING PAGE
 * 
 * Página pública com CTA e modal de cadastro
 */

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';

export function LandingPage() {
  const heroRef = useRef<HTMLDivElement | null>(null);
  const featureRefs = useRef<HTMLDivElement[]>([]);
  const planRef = useRef<HTMLDivElement | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const scrollToPlans = useCallback(() => {
    document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (heroRef.current) {
      gsap.fromTo(
        heroRef.current,
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }
      );
    }

    if (featureRefs.current.length) {
      gsap.fromTo(
        featureRefs.current,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: 'power2.out',
          stagger: 0.12,
          delay: 0.15,
        }
      );
    }

    if (planRef.current) {
      gsap.fromTo(
        planRef.current,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out', delay: 0.25 }
      );
      gsap.to(planRef.current, {
        y: -6,
        duration: 2.6,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      });
    }
  }, []);

  const handleOpenSignup = useCallback(() => {
    setError('');
    setIsModalOpen(true);
  }, []);

  const handleCheckout = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      setError('');

      if (!name.trim() || !email.trim() || !phone.trim()) {
        setError('Preencha nome, email e celular.');
        return;
      }

      setIsLoading(true);
      const params = new URLSearchParams({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });
      navigate(`/checkout?${params.toString()}`);
    },
    [email, name, navigate, phone]
  );

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', color: '#0f172a' }}>
      {/* HERO */}
      <section style={{ padding: '80px 24px', background: '#0b1220', color: 'white' }}>
        <div ref={heroRef} style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h1 style={{ fontSize: 44, marginBottom: 16 }}>
            Descubra o que vai viralizar no TikTok antes dos concorrentes
          </h1>
          <p style={{ fontSize: 18, maxWidth: 700, lineHeight: 1.6, color: '#cbd5f5' }}>
            O TikTok Trend Alert analisa sinais de crescimento e avisa quando um produto
            está prestes a explodir. Pare de adivinhar e comece a vender antes do mercado.
          </p>
          <div style={{ marginTop: 28, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              onClick={handleOpenSignup}
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
                title: 'Insights de mercado',
                text: 'Visualize produtos em alta com dados claros e objetivos.',
              },
            ].map((item, index) => (
              <div
                key={item.title}
                ref={(el) => {
                  if (el) featureRefs.current[index] = el;
                }}
                style={{
                  background: 'white',
                  padding: 20,
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  boxShadow: '0 8px 20px rgba(15, 23, 42, 0.06)',
                  transform: 'translateZ(0)'
                }}
              >
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
            <div
              ref={planRef}
              style={{
                border: '2px solid #2563eb',
                borderRadius: 12,
                padding: 24,
                background: '#eff6ff',
                boxShadow: '0 18px 40px rgba(37, 99, 235, 0.18)'
              }}
            >
              <h3>Plano Premium</h3>
              <p style={{ fontSize: 26, margin: '8px 0' }}>R$ 29,90/mês</p>
              <ul style={{ paddingLeft: 18, color: '#1e3a8a' }}>
                <li>Alertas prioritários</li>
                <li>Até 200 alertas/dia</li>
                <li>Nichos gerais do mercado</li>
              </ul>
              <button
                onClick={handleOpenSignup}
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
          <button
            onClick={handleOpenSignup}
            style={{
              background: '#22c55e',
              color: '#0b1220',
              padding: '12px 20px',
              borderRadius: 8,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Quero assinar agora
          </button>
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
            <h3 style={{ marginTop: 0 }}>Cadastro rápido</h3>
            <form onSubmit={handleCheckout}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Nome</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
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
                <label style={{ display: 'block', marginBottom: 6 }}>Celular</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
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
                {isLoading ? 'Redirecionando...' : 'Ir para checkout'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
