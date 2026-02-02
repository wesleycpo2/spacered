# 📊 TREND ENGINE - SISTEMA DE ANÁLISE DE TENDÊNCIAS

Motor de análise que detecta produtos virais do TikTok baseado em métricas de engajamento.

---

## 📁 Estrutura de Arquivos

```
src/
├── services/
│   └── trend-analyzer.service.ts      # Cálculo de viralScore e crescimento
│
├── jobs/
│   └── analyze-trends.job.ts          # Job de análise periódica
│
├── examples/
│   └── trend-engine.example.ts        # 10 exemplos de uso
│
└── http/routes/
    └── trend.routes.ts                # Endpoints HTTP
```

---

## 🎯 O que faz o Trend Engine?

### **1. Calcula ViralScore (0-100)**
Fórmula ponderada baseada em:
- **Views** (20%) - Alcance do conteúdo
- **Likes** (25%) - Engajamento positivo
- **Comments** (15%) - Interação ativa
- **Shares** (20%) - Viralização orgânica
- **Sales** (20%) - Conversão comercial

### **2. Calcula Crescimento Percentual**
Compara com último snapshot (Trend):
- Crescimento de views
- Crescimento de likes
- Crescimento de vendas

### **3. Define Status do Produto**

#### **VIRAL** (viralScore >= 75)
- Produto detectado como viral
- Alto engajamento e vendas
- Pronto para gerar alertas

#### **MONITORING** (40 <= score < 75)
- Produto em observação
- Potencial de crescimento
- Continua sendo analisado

#### **DECLINED** (score < 40 + crescimento negativo)
- Produto em declínio
- Baixo engajamento
- Vendas caindo

---

## 🚀 Como Usar

### **Executar Job Manualmente:**
```typescript
import { runTrendAnalysis } from './jobs/analyze-trends.job';

await runTrendAnalysis();
```

### **Analisar Produto Específico:**
```typescript
import { AnalyzeTrendsJob } from './jobs/analyze-trends.job';

const job = new AnalyzeTrendsJob();
await job.analyzeSpecificProduct('product-id');
```

### **Calcular ViralScore:**
```typescript
import { TrendAnalyzerService } from './services/trend-analyzer.service';

const analyzer = new TrendAnalyzerService();

const score = analyzer.calculateViralScore({
  views: BigInt(2_500_000),
  likes: BigInt(150_000),
  comments: BigInt(8_000),
  shares: BigInt(35_000),
  sales: 1200,
});

console.log('Score:', score); // Ex: 78.45
```

---

## 📊 Fórmula do ViralScore

```
Score = (Views × 0.20) + (Likes × 0.25) + (Comments × 0.15) 
        + (Shares × 0.20) + (Sales × 0.20)
```

**Normalização logarítmica:**
- 1M views = 100 pontos
- 100K likes = 100 pontos
- 10K comments = 100 pontos
- 50K shares = 100 pontos
- 5K sales = 100 pontos

---

## 🔄 Fluxo de Execução

```
1. AnalyzeTrendsJob.execute()
   ↓
2. Busca produtos ativos (MONITORING ou VIRAL)
   ↓
3. Para cada produto:
   ├─ Simula novas métricas (mock)
   ├─ Calcula viralScore
   ├─ Calcula crescimento
   ├─ Define status
   ├─ Atualiza Product
   └─ Cria Trend (snapshot histórico)
```

---

## 📝 Endpoints Disponíveis

### **POST /admin/trends/analyze**
Executa análise de todos produtos (apenas PREMIUM)

### **POST /admin/trends/analyze/:productId**
Analisa produto específico (apenas PREMIUM)

### **GET /trends/stats**
Retorna estatísticas gerais de tendências

### **GET /trends/history/:productId**
Histórico de snapshots de um produto

---

## 🧪 Exemplos Completos

Ver 10 exemplos práticos em: `src/examples/trend-engine.example.ts`

Inclui:
- Cálculo de viralScore
- Análise completa de produto
- Simulação de métricas
- Fluxo manual passo a passo
- Integração com sistema de alertas

---

## 🔮 Integração com AlertProcessor

```
┌─────────────────────┐
│ AnalyzeTrendsJob    │  ← Este sistema
│ (Detecta virais)    │
└──────────┬──────────┘
           │ atualiza status = VIRAL
           ↓
┌─────────────────────┐
│ AlertProcessorJob   │  ← Sistema de alertas
│ (Notifica usuários) │
└─────────────────────┘
```

**Ordem recomendada:**
1. Execute `AnalyzeTrendsJob` primeiro (atualiza produtos)
2. Execute `AlertProcessorJob` depois (envia alertas)

---

## ⚙️ Mock vs Produção

### **Atualmente (Mock):**
```typescript
// Simula crescimento aleatório
const newMetrics = analyzer.simulateMetrics(currentMetrics);
```

### **Em Produção:**
```typescript
// Substituir por scraper real
const newMetrics = await tiktokScraper.getProductMetrics(productId);
```

---

## 📊 Histórico de Tendências

Cada análise cria um snapshot na tabela `Trend`:
- Métricas do momento
- ViralScore calculado
- Crescimento percentual
- Timestamp

Útil para:
- Gráficos de evolução
- Análise de padrões
- Machine Learning futuro

---

## 🎯 Próximos Passos

- [ ] Integrar scraper real do TikTok
- [ ] Implementar cron job (node-cron/bull)
- [ ] Adicionar ML para previsão de viralização
- [ ] Criar dashboard de métricas
- [ ] Otimizar fórmula de viralScore com dados reais

---

Sistema pronto para detectar produtos virais! 🚀
