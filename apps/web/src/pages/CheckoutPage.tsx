/**
 * CHECKOUT PAGE
 * 
 * Página de checkout com resumo e botão de pagamento
 */

import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export function CheckoutPage() {
  const query = useQuery();
  const navigate = useNavigate();
  const checkoutUrl = import.meta.env.VITE_CHECKOUT_URL || '';

  const name = query.get('name') || '';
  const email = query.get('email') || '';
  const phone = query.get('phone') || '';

  const handlePay = () => {
    if (!checkoutUrl) return;
    const params = new URLSearchParams({ name, email, phone });
    window.location.href = `${checkoutUrl}?${params.toString()}`;
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', color: '#0f172a' }}>
      <section style={{ padding: '60px 24px', background: '#0b1220', color: 'white' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h1 style={{ marginBottom: 10 }}>Checkout</h1>
          <p style={{ color: '#cbd5f5' }}>
            Confirme seus dados e avance para o pagamento seguro.
          </p>
        </div>
      </section>

      <section style={{ padding: '50px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gap: 16 }}>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
            <h2 style={{ marginTop: 0 }}>Plano Premium</h2>
            <p style={{ fontSize: 24, margin: '8px 0' }}>R$ 59,99/mês</p>
            <ul style={{ paddingLeft: 18, color: '#475569' }}>
              <li>Alertas prioritários</li>
              <li>Até 200 alertas/dia</li>
              <li>Nichos gerais do mercado</li>
            </ul>
          </div>

          <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
            <h3 style={{ marginTop: 0 }}>Seus dados</h3>
            <p><strong>Nome:</strong> {name || '—'}</p>
            <p><strong>Email:</strong> {email || '—'}</p>
            <p><strong>Celular:</strong> {phone || '—'}</p>
            {!checkoutUrl && (
              <p style={{ color: '#ef4444' }}>
                Checkout indisponível. Configure <strong>VITE_CHECKOUT_URL</strong>.
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/')}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                background: 'white',
                cursor: 'pointer',
              }}
            >
              Voltar
            </button>
            <button
              onClick={handlePay}
              disabled={!checkoutUrl}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                border: 'none',
                background: '#22c55e',
                color: '#0b1220',
                fontWeight: 700,
                cursor: checkoutUrl ? 'pointer' : 'not-allowed',
              }}
            >
              Ir para pagamento
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
