/**
 * EXEMPLOS DE USO DO TREND ENGINE
 * 
 * Demonstra como usar o sistema de análise de tendências
 */

import { TrendAnalyzerService } from '../services/trend-analyzer.service';
import { AnalyzeTrendsJob, runTrendAnalysis } from '../jobs/analyze-trends.job';
import { prisma } from '../config/prisma';

// ============================================
// EXEMPLO 1: Calcular viralScore manualmente
// ============================================

async function example1_CalculateViralScore() {
  const analyzer = new TrendAnalyzerService();

  const metrics = {
    views: BigInt(2_500_000),
    likes: BigInt(150_000),
    comments: BigInt(8_000),
    shares: BigInt(35_000),
    sales: 1200,
  };

  const score = analyzer.calculateViralScore(metrics);

  console.log('📊 ViralScore:', score.toFixed(2));
  // Exemplo: 78.45
}

// ============================================
// EXEMPLO 2: Analisar produto completo
// ============================================

async function example2_AnalyzeProduct() {
  const analyzer = new TrendAnalyzerService();

  const productId = 'product-id-here';

  const metrics = {
    views: BigInt(3_000_000),
    likes: BigInt(180_000),
    comments: BigInt(10_000),
    shares: BigInt(40_000),
    sales: 1500,
  };

  const analysis = await analyzer.analyzeProduct(productId, metrics);

  console.log('📊 Análise:', {
    viralScore: analysis.viralScore,
    status: analysis.status,
    growth: analysis.growth,
  });

  // Exemplo:
  // {
  //   viralScore: 82.35,
  //   status: 'VIRAL',
  //   growth: { views: 15.2, likes: 22.5, sales: 18.7 }
  // }
}

// ============================================
// EXEMPLO 3: Executar job completo
// ============================================

async function example3_RunFullJob() {
  // Método simples
  await runTrendAnalysis();

  // OU instanciar manualmente
  const job = new AnalyzeTrendsJob();
  await job.execute();
}

// ============================================
// EXEMPLO 4: Analisar produto específico
// ============================================

async function example4_AnalyzeSpecificProduct() {
  const job = new AnalyzeTrendsJob();

  const productId = 'product-id-here';

  await job.analyzeSpecificProduct(productId);

  console.log('✅ Produto analisado:', productId);
}

// ============================================
// EXEMPLO 5: Obter estatísticas gerais
// ============================================

async function example5_GetStats() {
  const job = new AnalyzeTrendsJob();

  const stats = await job.getStats();

  console.log('📊 Estatísticas:', stats);

  // Exemplo:
  // {
  //   total: 150,
  //   byStatus: { viral: 12, monitoring: 130, declined: 8 },
  //   averageScore: '65.42',
  //   topViral: [...]
  // }
}

// ============================================
// EXEMPLO 6: Simular métricas (mock)
// ============================================

async function example6_SimulateMetrics() {
  const analyzer = new TrendAnalyzerService();

  const currentMetrics = {
    views: BigInt(1_000_000),
    likes: BigInt(50_000),
    comments: BigInt(3_000),
    shares: BigInt(15_000),
    sales: 800,
  };

  // Simula crescimento aleatório
  const newMetrics = analyzer.simulateMetrics(currentMetrics);

  console.log('📈 Métricas antigas:', {
    views: Number(currentMetrics.views),
    sales: currentMetrics.sales,
  });

  console.log('📈 Novas métricas:', {
    views: Number(newMetrics.views),
    sales: newMetrics.sales,
  });
}

// ============================================
// EXEMPLO 7: Fluxo completo manual
// ============================================

async function example7_ManualFlow() {
  const analyzer = new TrendAnalyzerService();

  // 1. Criar produto de teste
  const niche = await prisma.niche.findFirst();

  if (!niche) {
    console.log('⚠️ Nenhum nicho encontrado');
    return;
  }

  const product = await prisma.product.create({
    data: {
      tiktokId: 'tt-test-' + Date.now(),
      name: 'Produto Teste - Trend Engine',
      nicheId: niche.id,
      price: 49.9,
      productUrl: 'https://example.com/product',
      views: BigInt(500_000),
      likes: BigInt(25_000),
      comments: BigInt(1_500),
      shares: BigInt(8_000),
      sales: 400,
      viralScore: 0,
      status: 'MONITORING',
    },
  });

  console.log('✅ Produto criado:', product.id);

  // 2. Simular crescimento
  const newMetrics = analyzer.simulateMetrics({
    views: product.views,
    likes: product.likes,
    comments: product.comments,
    shares: product.shares,
    sales: product.sales,
  });

  console.log('📈 Métricas simuladas:', {
    views: Number(newMetrics.views),
    sales: newMetrics.sales,
  });

  // 3. Analisar produto
  const analysis = await analyzer.analyzeProduct(product.id, newMetrics);

  console.log('📊 Análise:', analysis);

  // 4. Atualizar produto
  await analyzer.updateProduct(product.id, newMetrics, analysis);

  console.log('✅ Produto atualizado');

  // 5. Criar snapshot
  await analyzer.createTrendSnapshot(
    product.id,
    product.nicheId,
    newMetrics,
    analysis
  );

  console.log('📸 Snapshot criado');

  // 6. Verificar resultado
  const updated = await prisma.product.findUnique({
    where: { id: product.id },
  });

  console.log('🔍 Produto final:', {
    viralScore: updated?.viralScore,
    status: updated?.status,
  });
}

// ============================================
// EXEMPLO 8: Reprocessar produtos em declínio
// ============================================

async function example8_ReanalyzeDeclined() {
  const job = new AnalyzeTrendsJob();

  await job.reanalyzeDeclinedProducts();

  console.log('✅ Produtos em declínio reprocessados');
}

// ============================================
// EXEMPLO 9: Entender regras de viralização
// ============================================

function example9_ViralRules() {
  console.log('📋 REGRAS DE VIRALIZAÇÃO:');
  console.log('');
  console.log('1️⃣ VIRAL (viralScore >= 75)');
  console.log('   - Produto detectado como viral');
  console.log('   - Alto engajamento e vendas');
  console.log('');
  console.log('2️⃣ MONITORING (40 <= viralScore < 75)');
  console.log('   - Produto sendo monitorado');
  console.log('   - Potencial de crescimento');
  console.log('');
  console.log('3️⃣ DECLINED (viralScore < 40 + crescimento negativo)');
  console.log('   - Produto em declínio');
  console.log('   - Baixo engajamento e vendas caindo');
  console.log('');
  console.log('📊 FÓRMULA DO VIRALSCORE:');
  console.log('   Views (20%) + Likes (25%) + Comments (15%)');
  console.log('   + Shares (20%) + Sales (20%)');
  console.log('   = Score de 0 a 100');
}

// ============================================
// EXEMPLO 10: Integração com AlertProcessor
// ============================================

async function example10_IntegrationFlow() {
  console.log('🔄 FLUXO COMPLETO DO SISTEMA:');
  console.log('');
  console.log('1. AnalyzeTrendsJob (este sistema)');
  console.log('   ↓ Analisa produtos');
  console.log('   ↓ Atualiza viralScore e status');
  console.log('   ↓ Produtos com status VIRAL ficam disponíveis');
  console.log('');
  console.log('2. AlertProcessorJob (sistema de alertas)');
  console.log('   ↓ Busca produtos VIRAL com score >= 70');
  console.log('   ↓ Cria alertas para usuários elegíveis');
  console.log('   ↓ Envia notificações');
  console.log('');
  console.log('💡 DICA: Execute AnalyzeTrendsJob ANTES de AlertProcessorJob');
}

// Exporta exemplos
export {
  example1_CalculateViralScore,
  example2_AnalyzeProduct,
  example3_RunFullJob,
  example4_AnalyzeSpecificProduct,
  example5_GetStats,
  example6_SimulateMetrics,
  example7_ManualFlow,
  example8_ReanalyzeDeclined,
  example9_ViralRules,
  example10_IntegrationFlow,
};
