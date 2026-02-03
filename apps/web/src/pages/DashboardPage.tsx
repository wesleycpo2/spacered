/**
 * DASHBOARD PAGE
 * 
 * Página principal com status da assinatura e seleção de nichos
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api, Niche } from '../services/api';

export function DashboardPage() {
  const { user, subscription, logout, refreshSubscription } = useAuth();
  const navigate = useNavigate();

  const [allNiches, setAllNiches] = useState<Niche[]>([]);
  const [userNiches, setUserNiches] = useState<Niche[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [telegramIdentifier, setTelegramIdentifier] = useState('');
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [telegramMessage, setTelegramMessage] = useState('');

  const telegramBotUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || '';

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setIsLoading(true);
      await refreshSubscription();
      const [niches, myNiches] = await Promise.all([
        api.getNiches(),
        api.getUserNiches(),
      ]);
      try {
        const telegramConfig = await api.getTelegramConfig();
        setTelegramEnabled(Boolean(telegramConfig.enabled));
        setTelegramIdentifier(telegramConfig.telegramChatId || '');
      } catch {
        // ignore telegram config errors
      }
      setAllNiches(niches);
      setUserNiches(myNiches);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleToggleNiche(niche: Niche) {
    const isSubscribed = userNiches.some((n) => n.id === niche.id);

    try {
      if (isSubscribed) {
        await api.removeNiche(niche.id);
        setUserNiches((prev) => prev.filter((n) => n.id !== niche.id));
      } else {
        // Verifica limite
        if (subscription && userNiches.length >= subscription.maxNiches) {
          alert(`Limite de ${subscription.maxNiches} nichos atingido`);
          return;
        }
        await api.addNiche(niche.id);
        setUserNiches((prev) => [...prev, niche]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar nicho');
    }
  }

  function handleLogout() {
    logout();
    navigate('/');
  }

  async function handleTelegramPlay() {
    setTelegramMessage('Conectando Telegram...');
    try {
      const data = await api.connectTelegram(telegramIdentifier);
      setTelegramEnabled(Boolean(data.enabled));
      setTelegramIdentifier(data.telegramChatId || telegramIdentifier);
      setTelegramMessage('Telegram conectado.');
    } catch (err) {
      setTelegramMessage(err instanceof Error ? err.message : 'Falha ao conectar Telegram.');
    }
  }

  async function handleTelegramStop() {
    setTelegramMessage('Desativando Telegram...');
    try {
      const data = await api.disableTelegram();
      setTelegramEnabled(Boolean(data.enabled));
      setTelegramMessage('Telegram desativado.');
    } catch (err) {
      setTelegramMessage(err instanceof Error ? err.message : 'Falha ao desativar Telegram.');
    }
  }

  if (isLoading) {
    return <div style={{ padding: 20 }}>Carregando...</div>;
  }

  const statusColors = {
    ACTIVE: '#22c55e',
    PENDING: '#f59e0b',
    CANCELED: '#ef4444',
    EXPIRED: '#6b7280',
  };

  const planLabels = {
    BASE: 'Plano Base',
    PREMIUM: 'Plano Premium',
  };

  const isPremium = subscription?.planType === 'PREMIUM';
  const isActive = subscription?.status === 'ACTIVE';

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 30 }}>
        <h1>TikTok Trend Alert</h1>
        <button onClick={handleLogout} style={{ padding: '8px 16px', cursor: 'pointer' }}>
          Sair
        </button>
      </header>

      {error && (
        <div style={{ padding: 15, backgroundColor: '#fee', color: 'red', marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* STATUS DA ASSINATURA */}
      <section style={{ marginBottom: 40, padding: 20, border: '1px solid #ddd' }}>
        <h2>Status da Assinatura</h2>
        
        {subscription ? (
          <div>
            <p>
              <strong>Email:</strong> {user?.email}
            </p>
            <p>
              <strong>Plano:</strong>{' '}
              <span style={{ 
                padding: '4px 8px', 
                backgroundColor: isPremium ? '#0070f3' : '#10b981',
                color: 'white',
                borderRadius: 4,
              }}>
                {planLabels[subscription.planType]}
              </span>
            </p>
            <p>
              <strong>Status:</strong>{' '}
              <span style={{ 
                color: statusColors[subscription.status],
                fontWeight: 'bold',
              }}>
                {subscription.status}
              </span>
            </p>
            <p>
              <strong>Alertas por dia:</strong> {subscription.maxAlertsPerDay}
            </p>
            <p>
              <strong>Nichos permitidos:</strong> {userNiches.length} / {subscription.maxNiches}
            </p>

            {subscription.status !== 'ACTIVE' && (
              <div style={{ 
                marginTop: 15, 
                padding: 15, 
                backgroundColor: '#fff3cd',
                border: '1px solid #ffc107',
              }}>
                ⚠️ Sua assinatura não está ativa. Ative para receber alertas.
              </div>
            )}
          </div>
        ) : (
          <p>Carregando dados da assinatura...</p>
        )}
      </section>

      {/* TELEGRAM */}
      <section style={{ marginBottom: 40, padding: 20, border: '1px solid #ddd' }}>
        <h2>Telegram</h2>
        <p style={{ marginTop: 0, color: '#475569' }}>
          Envie <strong>/start</strong> para o bot antes de conectar.
        </p>
        {telegramBotUsername && (
          <p style={{ marginTop: 0 }}>
            Bot: <a href={`https://t.me/${telegramBotUsername.replace('@', '')}`} target="_blank" rel="noreferrer">@{telegramBotUsername.replace('@', '')}</a>
          </p>
        )}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            placeholder="Seu @username ou chat_id"
            value={telegramIdentifier}
            onChange={(e) => setTelegramIdentifier(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', minWidth: 260 }}
          />
          <button
            onClick={handleTelegramPlay}
            disabled={!telegramIdentifier || telegramEnabled}
            style={{
              padding: '8px 16px',
              borderRadius: 999,
              border: '1px solid #cbd5e1',
              background: telegramEnabled ? '#e2e8f0' : '#22c55e',
              color: telegramEnabled ? '#64748b' : '#0b1220',
              cursor: telegramEnabled ? 'not-allowed' : 'pointer',
              fontWeight: 600,
            }}
          >
            ▶ Play
          </button>
          <button
            onClick={handleTelegramStop}
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
            ⏹ Stop
          </button>
          {telegramMessage && <span style={{ color: '#475569' }}>{telegramMessage}</span>}
        </div>
      </section>

      {/* SELEÇÃO DE NICHOS */}
      <section style={{ padding: 20, border: '1px solid #ddd' }}>
        <h2>Seus Nichos</h2>
        
        {!isPremium && (
          <div style={{ 
            padding: 15, 
            backgroundColor: '#e0f2fe',
            marginBottom: 20,
            border: '1px solid #0ea5e9',
          }}>
            ℹ️ <strong>Plano BASE:</strong> Você recebe alertas de todos os produtos virais.
            <br />
            Faça upgrade para PREMIUM e filtre apenas nichos específicos.
          </div>
        )}

        {isPremium && !isActive && (
          <div style={{ 
            padding: 15, 
            backgroundColor: '#fee',
            marginBottom: 20,
            border: '1px solid #ef4444',
          }}>
            ❌ Assinatura inativa. Ative sua conta para gerenciar nichos.
          </div>
        )}

        {isPremium && isActive && (
          <>
            <p style={{ marginBottom: 15 }}>
              Selecione os nichos que deseja monitorar ({userNiches.length}/{subscription?.maxNiches}):
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 15 }}>
              {allNiches.map((niche) => {
                const isSubscribed = userNiches.some((n) => n.id === niche.id);
                return (
                  <div
                    key={niche.id}
                    style={{
                      padding: 15,
                      border: `2px solid ${isSubscribed ? '#0070f3' : '#ddd'}`,
                      backgroundColor: isSubscribed ? '#f0f9ff' : 'white',
                      cursor: 'pointer',
                    }}
                    onClick={() => handleToggleNiche(niche)}
                  >
                    <h3 style={{ margin: '0 0 8px 0', fontSize: 16 }}>
                      {isSubscribed ? '✓ ' : ''}
                      {niche.name}
                    </h3>
                    {niche.description && (
                      <p style={{ margin: 0, fontSize: 14, color: '#666' }}>
                        {niche.description}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {allNiches.length === 0 && (
              <p style={{ color: '#666' }}>Nenhum nicho disponível no momento.</p>
            )}
          </>
        )}

        {!isPremium && (
          <p style={{ color: '#666', marginTop: 15 }}>
            Faça upgrade para Premium para selecionar nichos específicos.
          </p>
        )}
      </section>
    </div>
  );
}
