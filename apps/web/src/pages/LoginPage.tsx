/**
 * LOGIN PAGE
 * 
 * Página de login e registro
 */

import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(phone, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao autenticar');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '100px auto', padding: 20 }}>
      <h1>Login</h1>
      <p style={{ color: '#64748b', marginTop: 0 }}>
        Use o celular cadastrado após o primeiro pagamento.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 15 }}>
          <label style={{ display: 'block', marginBottom: 5 }}>
            Celular
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            style={{ width: '100%', padding: 8 }}
          />
        </div>

        <div style={{ marginBottom: 15 }}>
          <label style={{ display: 'block', marginBottom: 5 }}>
            Senha
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={{ width: '100%', padding: 8 }}
          />
        </div>

        {error && (
          <div style={{ color: 'red', marginBottom: 15 }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: '100%',
            padding: 10,
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {isLoading ? 'Aguarde...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
