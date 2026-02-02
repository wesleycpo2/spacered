# Frontend - TikTok Trend Alert

Frontend mínimo funcional com React + Vite.

## 📁 Estrutura

```
apps/web/
├── src/
│   ├── contexts/
│   │   └── AuthContext.tsx      # Gerenciamento de autenticação
│   ├── pages/
│   │   ├── LoginPage.tsx        # Login e registro
│   │   └── DashboardPage.tsx    # Dashboard com status e nichos
│   ├── services/
│   │   └── api.ts               # Cliente HTTP para backend
│   ├── App.tsx                  # Rotas e componente raiz
│   ├── main.tsx                 # Entry point
│   └── vite-env.d.ts            # Types do Vite
├── index.html
├── vite.config.ts
└── package.json
```

## 🚀 Como executar

### 1. Backend (API) deve estar rodando

```bash
cd apps/api
npm run dev
# API rodando em http://localhost:3333
```

### 2. Executar frontend

```bash
cd apps/web
npm run dev
# Frontend rodando em http://localhost:3000
```

## 🎯 Funcionalidades

### ✅ Login e Registro
- Formulário simples com email e senha
- Alternância entre login e registro
- Validação básica

### ✅ Status da Assinatura
- Exibe plano (BASE ou PREMIUM)
- Mostra status (ACTIVE, PENDING, CANCELED, EXPIRED)
- Indica limites (alertas por dia, nichos)
- Alerta visual se assinatura inativa

### ✅ Seleção de Nichos (PREMIUM)
- **Plano BASE**: Recebe todos os produtos virais (sem filtro)
- **Plano PREMIUM**: Seleciona nichos específicos
- Interface de seleção com clique para toggle
- Respeita limite de nichos da assinatura
- Bloqueado se assinatura não estiver ACTIVE

### ✅ Integração com API
- Cliente HTTP com:
  - Refresh automático de token
  - Tratamento de erros
  - Persistência de tokens no localStorage
- Endpoints usados:
  - `POST /auth/login`
  - `POST /auth/register`
  - `POST /auth/refresh`
  - `GET /subscription/status`
  - `GET /niches`
  - `GET /niches/me`
  - `POST /niches/:id/subscribe`
  - `DELETE /niches/:id/unsubscribe`

## 🔧 Configuração

### Proxy Vite (vite.config.ts)
```typescript
proxy: {
  '/api': {
    target: 'http://localhost:3333',
    changeOrigin: true,
  },
}
```

Requisições para `/api/*` são redirecionadas para `http://localhost:3333/api/*`

### Variáveis de ambiente (.env - opcional)
```bash
VITE_API_URL=http://localhost:3333
```

Por padrão, usa `http://localhost:3333` se não especificado.

## 📝 Fluxo de uso

1. **Acesso inicial** → Página de Login
2. **Criar conta** → Registro com email/senha
3. **Login** → Recebe tokens JWT
4. **Dashboard** → Visualiza status da assinatura
5. **Nichos (PREMIUM)** → Seleciona nichos de interesse
6. **Logout** → Limpa tokens e volta para login

## ⚠️ Observações

### Design
- Interface minimalista e funcional
- Sem CSS framework (inline styles)
- Foco total em funcionalidade

### Validações
- Email obrigatório e válido
- Senha mínima de 6 caracteres
- Limite de nichos respeitado (PREMIUM)
- Bloqueio se assinatura não ACTIVE

### Estados
- Loading states durante requisições
- Mensagens de erro visíveis
- Feedback visual em ações (nichos selecionados)

### Rotas protegidas
- `/` → Login (público, redireciona para dashboard se autenticado)
- `/dashboard` → Dashboard (privado, redireciona para login se não autenticado)

## 🔐 Segurança

- Tokens JWT armazenados no localStorage
- Refresh automático em 401
- Logout limpa todos os tokens
- Authorization header em requests autenticados

## 📦 Dependências

```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-router-dom": "^6.23.1"
}
```

Apenas 3 dependências (+ dev dependencies).
