## TTbusiness

### Requisitos
- Node.js 20+
- Bun ou npm/yarn (o projeto usa `tsx`/`tsup`)
- PostgreSQL ativo com a URL configurada em `DATABASE_URL`

### Configuração do ambiente
1. Copie `apps/api/.env.example` para `apps/api/.env` e preencha:
	- `DATABASE_URL`
	- Credenciais RapidAPI (`RAPIDAPI_KEY`, `RAPIDAPI_HOST`, `RAPIDAPI_BASE_URL`)
	- Parâmetros opcionais: períodos (`RAPIDAPI_HASHTAG_PERIOD`, `RAPIDAPI_KEYWORD_PERIOD`, etc.) e nomes de parâmetros (`RAPIDAPI_SONG_COUNTRY_PARAM`, `RAPIDAPI_PRODUCT_COUNTRY_PARAM`...).
2. (Opcional) Ajuste `MANUAL_COLLECT_LIMIT` e `RAPIDAPI_SMOKE_LIMIT` para personalizar os scripts.

### Preparando o banco
```bash
cd apps/api
pnpm install # ou npm install / bun install
npx prisma migrate deploy
```

### Verificando o provedor (RapidAPI)
Executa chamadas para vídeos, hashtags, produtos, keywords e tenta buscar detail/metrics com o primeiro `product_id` retornado.
```bash
pnpm provider:test
```

### Coletando dados manualmente (preenche o banco)
```bash
pnpm collect:manual
```

O script roda `runVideoCollector`, `runProductCollector` e `runSignalCollector` em paralelo e encerra a conexão Prisma ao finalizar.

### API em desenvolvimento
```bash
pnpm dev
```

### Build e produção
```bash
pnpm build
pnpm start:prod
```

### Observações
- Ative `RAPIDAPI_DEBUG=true` para registrar amostras das respostas no log.
- Caso a lista de produtos não retorne `product_id`, informe manualmente ao testar `fetchProductDetail`/`fetchProductMetrics` (o script avisa).
- Os endpoints administrativos (`/admin/collect`, `/admin/collect-all`, etc.) exigem `x-admin-token` configurado em `ADMIN_TOKEN`.
