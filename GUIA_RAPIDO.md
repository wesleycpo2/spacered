# 🚀 GUIA RÁPIDO - ETAPA 6

## ▶️ Como executar

### Terminal 1 - Backend
```bash
cd c:\xampp\htdocs\TTbusiness\apps\api
npm run dev
```
**API rodando em:** http://localhost:3333

### Terminal 2 - Frontend
```bash
cd c:\xampp\htdocs\TTbusiness\apps\web
npm run dev
```
**Frontend rodando em:** http://localhost:3000

---

## 🎯 Testando funcionalidades

### 1. Criar conta
```
http://localhost:3000
→ Clicar em "Criar nova conta"
→ Email: teste@exemplo.com
→ Senha: 123456
→ Clicar em "Criar Conta"
```

### 2. Login
```
→ Email: teste@exemplo.com
→ Senha: 123456
→ Clicar em "Entrar"
```

### 3. Dashboard
```
Após login, você verá:
✓ Status da assinatura (PENDING ou ACTIVE)
✓ Plano (BASE ou PREMIUM)
✓ Limites de alertas e nichos
```

### 4. Nichos (apenas PREMIUM com assinatura ACTIVE)
```
Se sua assinatura for PREMIUM e ACTIVE:
→ Veja lista de nichos disponíveis
→ Clique para selecionar/desselecionar
→ Respeite o limite (máximo 10)
```

---

## 🛠️ Comandos úteis

### Verificar tipos (TypeScript)
```bash
# Backend
cd apps/api
npm run typecheck

# Frontend
cd apps/web
npm run build  # Build também verifica tipos
```

### Popular nichos no banco
```bash
cd packages/database
npx tsx prisma/seed.ts
```

### Verificar saúde da API
```bash
curl http://localhost:3333/health
```

---

## 📝 Endpoints disponíveis

### Públicos
- `GET /health` - Status da API
- `POST /auth/register` - Criar conta
- `POST /auth/login` - Login
- `POST /auth/refresh` - Renovar token

### Privados (requer autenticação)
- `GET /subscription/status` - Status da assinatura
- `GET /niches` - Lista todos os nichos
- `GET /niches/me` - Nichos do usuário
- `POST /niches/:id/subscribe` - Adicionar nicho (PREMIUM)
- `DELETE /niches/:id/unsubscribe` - Remover nicho (PREMIUM)

---

## 🎉 Pronto para usar!

Frontend e backend totalmente integrados.
