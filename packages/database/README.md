# Packages - Database

Configuração centralizada do Prisma ORM para o monorepo.

## 📁 Estrutura

```
packages/database/
├── prisma/
│   ├── schema.prisma    # Schema do banco de dados
│   └── seed.ts          # Seed de dados iniciais
```

## 🚀 Comandos

### Gerar Prisma Client
```bash
cd packages/database
npx prisma generate
```

### Criar migração
```bash
npx prisma migrate dev --name migration_name
```

### Aplicar migrações (produção)
```bash
npx prisma migrate deploy
```

### Seed (popular banco)
```bash
npx tsx prisma/seed.ts
```

### Prisma Studio (visualizar dados)
```bash
npx prisma studio
```

## 🔧 Configuração

### DATABASE_URL
Criar `.env` na raiz do projeto:
```
DATABASE_URL="postgresql://user:password@localhost:5432/ttbusiness?schema=public"
```

## 📊 Schema

- **User**: Usuários do sistema
- **Subscription**: Assinaturas (BASE/PREMIUM)
- **NotificationConfig**: Configurações de notificação
- **Niche**: Nichos de produtos
- **Product**: Produtos do TikTok monitorados
- **Alert**: Alertas enviados aos usuários
- **Trend**: Histórico de métricas dos produtos
