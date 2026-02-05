/**
 * SET PASSWORD PAGE
 * 
 * Tela pós-pagamento para definir senha do cliente
 */

import { FormEvent, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export function SetPasswordPage() {
  const query = useQuery();
  const navigate = useNavigate();

  const [phone, setPhone] = useState(query.get('phone') || '');
  const [name, setName] = useState(query.get('name') || '');
  const [email, setEmail] = useState(query.get('email') || '');
  const [paymentMethod] = useState(query.get('paymentMethod') || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!phone.trim() || !password.trim()) {
      setError('Informe celular e senha.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não conferem.');
      return;
    }

    setIsLoading(true);
    try {
      await api.setPassword({
        phone: phone.trim(),
        password: password.trim(),
        name: name.trim() || undefined,
        email: email.trim() || undefined,
        paymentMethod: paymentMethod || undefined,
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao definir senha');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', color: '#0f172a' }}>
      <section style={{ padding: '60px 24px', background: '#0b1220', color: 'white' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <h1 style={{ marginBottom: 10 }}>Defina sua senha</h1>
          <p style={{ color: '#cbd5f5' }}>
            Pagamento confirmado. Crie sua senha para acessar o dashboard.
          </p>
        </div>
      </section>

      <section style={{ padding: '50px 24px' }}>
        <div style={{ maxWidth: 520, margin: '0 auto', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24 }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 6 }}>Celular</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                style={{ width: '100%', padding: 10 }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 6 }}>Nome (opcional)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: '100%', padding: 10 }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 6 }}>Email (opcional)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: 10 }}
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
                style={{ width: '100%', padding: 10 }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 6 }}>Confirmar senha</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                style={{ width: '100%', padding: 10 }}
              />
            </div>

            {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: 12,
                border: 'none',
                borderRadius: 8,
                background: '#22c55e',
                color: '#0b1220',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {isLoading ? 'Salvando...' : 'Entrar no dashboard'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
