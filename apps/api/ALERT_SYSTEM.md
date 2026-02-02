# 🔔 SISTEMA DE ALERTAS E NOTIFICAÇÕES

Sistema completo de detecção e notificação de produtos virais do TikTok.

---

## 📁 Estrutura de Arquivos

```
src/
├── adapters/                          # Integrações externas (mocks)
│   ├── telegram.adapter.ts            # Telegram Bot API (mock)
│   └── whatsapp.adapter.ts            # WhatsApp API (mock)
│
├── services/                          # Lógica de negócio
│   ├── alert.service.ts               # Criação e distribuição de alertas
│   └── notification.service.ts        # Dispatcher de notificações
│
├── jobs/                              # Background jobs
│   └── alert-processor.job.ts         # Processa produtos virais e envia alertas
│
├── utils/                             # Utilitários
│   └── logger.ts                      # Sistema de logging estruturado
│
├── examples/                          # Exemplos de uso
│   └── alert-system.example.ts        # Casos de uso completos
│
└── http/routes/                       # Endpoints HTTP
    └── alert.routes.ts                # Rotas de alertas
```

---

## 🎯 Fluxo de Funcionamento

### **1. Detecção de Produtos Virais**
```
AlertProcessorJob → busca produtos com viralScore >= 70
```

### **2. Criação de Alertas**
```
AlertService → decide quem recebe baseado em:
  - Plano (BASE/PREMIUM)
  - Nichos escolhidos
  - NotificationConfig
  - Horário silencioso
```

### **3. Envio de Notificações**
```
NotificationService → envia pelos canais:
  - BASE: Telegram (canal público)
  - PREMIUM: Telegram privado ou WhatsApp
```

---

## 📊 Regras de Distribuição

### **Plano BASE:**
- ✅ Recebe alertas de **todos os produtos virais**
- 📢 Canal: **Telegram público** (canal comum)
- 🚫 Não filtra por nicho
- ⏰ Respeita horário silencioso

### **Plano PREMIUM:**
- ✅ Recebe alertas apenas dos **nichos escolhidos**
- 🔒 Canal: **Telegram privado** ou **WhatsApp**
- 🎯 Filtra por nicho
- ⏰ Respeita horário silencioso
- 📊 Pode configurar score mínimo

---

## 🚀 Como Usar

### **Executar Job Manualmente:**
```typescript
import { runAlertProcessor } from './jobs/alert-processor.job';

await runAlertProcessor();
```

### **Criar Alerta para Produto:**
```typescript
import { AlertService } from './services/alert.service';

const alertService = new AlertService();

const alertIds = await alertService.createAlertsForProduct({
  id: 'product-id',
  name: 'Mini Ventilador USB',
  nicheId: 'tech-gadgets',
  viralScore: 85.5,
  views: BigInt(2_500_000),
  sales: 1200,
  productUrl: 'https://tiktok.com/shop/product/123',
});
```

### **Enviar Notificações:**
```typescript
import { NotificationService } from './services/notification.service';

const notificationService = new NotificationService();

await notificationService.send({
  alertId: 'alert-id',
  userId: 'user-id',
  channel: 'TELEGRAM',
  message: 'Mensagem formatada',
  chatId: 'telegram-chat-id',
});
```

---

## 🔧 Configuração

### **Variáveis de Ambiente (.env):**
```env
# Telegram
TELEGRAM_BOT_TOKEN=seu-token-aqui
TELEGRAM_PUBLIC_CHANNEL=@seu-canal-publico

# WhatsApp (futuro)
WHATSAPP_API_KEY=sua-api-key
```

---

## 📝 Endpoints Disponíveis

### **POST /admin/alerts/process**
Executa job de alertas manualmente (apenas PREMIUM)

### **GET /alerts/stats**
Retorna estatísticas de alertas do usuário

### **GET /alerts/history**
Retorna histórico de alertas recebidos

---

## 🧪 Testes Manuais

Ver exemplos completos em: `src/examples/alert-system.example.ts`

---

## 🔮 Próximos Passos

- [ ] Integrar Telegram Bot API real
- [ ] Integrar WhatsApp API (Twilio/Evolution)
- [ ] Implementar cron job (node-cron/bull)
- [ ] Adicionar rate limiting
- [ ] Criar painel de métricas
- [ ] Implementar scraper do TikTok

---

## 📊 Logs Estruturados

O sistema gera logs estruturados para rastreamento:

```
ℹ️ [INFO] Criando alertas para produto viral
✅ [SUCCESS] 15 alertas criados
📤 [INFO] Enviando alerta via Telegram
✅ [SUCCESS] Alerta enviado com sucesso
```

---

## ⚙️ Clean Architecture

```
📦 Adapters    → Integrações externas (Telegram, WhatsApp)
📦 Services    → Lógica de negócio (AlertService, NotificationService)
📦 Jobs        → Background processing
📦 Utils       → Helpers (Logger)
📦 Routes      → HTTP controllers
```

Sistema pronto para uso! 🚀
