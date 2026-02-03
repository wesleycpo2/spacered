/**
 * TREND ANALYZER SERVICE
 * 
 * Serviço responsável por analisar métricas de produtos e calcular:
 * - viralScore (0-100): indica potencial viral do produto
 * - Crescimento percentual em relação ao último snapshot
 * - Status do produto (VIRAL, MONITORING, DECLINED)
 */

import { ProductStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';

interface ProductMetrics {
  views: bigint;
  likes: bigint;
  comments: bigint;
  shares: bigint;
  sales: number;
}

interface AnalysisResult {
  viralScore: number;
  status: ProductStatus;
  growth: {
    views: number;
    likes: number;
    sales: number;
  };
}

export class TrendAnalyzerService {
  /**
   * Calcula viralScore baseado nas métricas do produto
   * 
   * Fórmula:
   * - Views: peso 20%
   * - Likes: peso 25%
   * - Comments: peso 15%
   * - Shares: peso 20%
   * - Sales: peso 20%
   * 
   * Score normalizado de 0 a 100
   */
  calculateViralScore(metrics: ProductMetrics): number {
    // Converte BigInt para Number
    const views = Number(metrics.views);
    const likes = Number(metrics.likes);
    const comments = Number(metrics.comments);
    const shares = Number(metrics.shares);
    const sales = metrics.sales;

    // Normaliza cada métrica (escala logarítmica)
    const viewsScore = this.normalize(views, 1_000_000); // 1M views = 100
    const likesScore = this.normalize(likes, 100_000); // 100K likes = 100
    const commentsScore = this.normalize(comments, 10_000); // 10K comments = 100
    const sharesScore = this.normalize(shares, 50_000); // 50K shares = 100
    const salesScore = this.normalize(sales, 5_000); // 5K sales = 100

    // Aplica pesos
    const score =
      viewsScore * 0.2 +
      likesScore * 0.25 +
      commentsScore * 0.15 +
      sharesScore * 0.2 +
      salesScore * 0.2;

    // Retorna entre 0 e 100
    return Math.min(Math.max(score, 0), 100);
  }

  /**
   * Normaliza valor usando escala logarítmica
   * Retorna score de 0 a 100
   */
  private normalize(value: number, maxValue: number): number {
    if (value <= 0) return 0;
    
    // Usa log para suavizar crescimento exponencial
    const normalized = (Math.log(value + 1) / Math.log(maxValue + 1)) * 100;
    
    return Math.min(normalized, 100);
  }

  /**
   * Calcula crescimento percentual comparando com último snapshot
   */
  async calculateGrowth(
    productId: string,
    currentMetrics: ProductMetrics
  ): Promise<{ views: number; likes: number; sales: number }> {
    // Busca último snapshot (Trend mais recente)
    const lastTrend = await prisma.trend.findFirst({
      where: { productId },
      orderBy: { createdAt: 'desc' },
    });

    // Se não há histórico, retorna 0% de crescimento
    if (!lastTrend) {
      return { views: 0, likes: 0, sales: 0 };
    }

    // Calcula crescimento percentual
    const viewsGrowth = this.calculatePercentageGrowth(
      Number(lastTrend.views),
      Number(currentMetrics.views)
    );

    const likesGrowth = this.calculatePercentageGrowth(
      Number(lastTrend.likes),
      Number(currentMetrics.likes)
    );

    const salesGrowth = this.calculatePercentageGrowth(
      lastTrend.sales,
      currentMetrics.sales
    );

    return {
      views: viewsGrowth,
      likes: likesGrowth,
      sales: salesGrowth,
    };
  }

  /**
   * Calcula crescimento percentual entre dois valores
   * Retorna: ((novo - antigo) / antigo) * 100
   */
  private calculatePercentageGrowth(oldValue: number, newValue: number): number {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    
    const growth = ((newValue - oldValue) / oldValue) * 100;
    
    return Math.round(growth * 100) / 100; // 2 casas decimais
  }

  /**
   * Determina status do produto baseado em viralScore e crescimento
   * 
   * Regras:
   * - viralScore >= 75 → VIRAL
   * - viralScore < 40 E crescimento negativo → DECLINED
   * - Resto → MONITORING
   */
  determineStatus(
    viralScore: number,
    growth: { views: number; likes: number; sales: number }
  ): ProductStatus {
    // Viralização detectada
    if (viralScore >= 75) {
      return 'VIRAL';
    }

    // Produto em declínio (score baixo + crescimento negativo)
    const avgGrowth = (growth.views + growth.likes + growth.sales) / 3;
    if (viralScore < 40 && avgGrowth < -10) {
      return 'DECLINED';
    }

    // Produto em monitoramento
    return 'MONITORING';
  }

  /**
   * Analisa produto completo
   * Retorna viralScore, status e crescimento
   */
  async analyzeProduct(
    productId: string,
    metrics: ProductMetrics
  ): Promise<AnalysisResult> {
    logger.info('🔍 Analisando produto', { productId });

    // Calcula viralScore
    const viralScore = this.calculateViralScore(metrics);

    // Calcula crescimento
    const growth = await this.calculateGrowth(productId, metrics);

    // Determina status
    const status = this.determineStatus(viralScore, growth);

    logger.info('📊 Análise concluída', {
      productId,
      viralScore: viralScore.toFixed(2),
      status,
      growth,
    });

    return {
      viralScore: Math.round(viralScore * 100) / 100, // 2 casas decimais
      status,
      growth,
    };
  }

  /**
   * Atualiza produto no banco com nova análise
   */
  async updateProduct(
    productId: string,
    metrics: ProductMetrics,
    analysis: AnalysisResult
  ): Promise<void> {
    await prisma.product.update({
      where: { id: productId },
      data: {
        views: metrics.views,
        likes: metrics.likes,
        comments: metrics.comments,
        shares: metrics.shares,
        sales: metrics.sales,
        viralScore: analysis.viralScore,
        status: analysis.status,
      },
    });

    logger.success('✅ Produto atualizado', {
      productId,
      viralScore: analysis.viralScore,
      status: analysis.status,
    });
  }

  /**
   * Cria snapshot histórico (Trend)
   */
  async createTrendSnapshot(
    productId: string,
    nicheId: string,
    metrics: ProductMetrics,
    analysis: AnalysisResult
  ): Promise<void> {
    await prisma.trend.create({
      data: {
        productId,
        nicheId,
        views: metrics.views,
        likes: metrics.likes,
        comments: metrics.comments,
        shares: metrics.shares,
        sales: metrics.sales,
        viralScore: analysis.viralScore,
        viewsGrowth: analysis.growth.views,
        likesGrowth: analysis.growth.likes,
        salesGrowth: analysis.growth.sales,
        scoreGrowth: 0, // TODO: Calcular variação do score
      },
    });

    logger.info('📸 Snapshot de tendência criado', { productId });
  }

  /**
   * Simula novas métricas (mock para testes)
   * Em produção, substituir por scraper real do TikTok
   */
  simulateMetrics(currentMetrics: ProductMetrics): ProductMetrics {
    // Simula crescimento aleatório entre -10% e +30%
    const randomGrowth = (base: bigint | number): number => {
      const growth = 0.9 + Math.random() * 0.4; // 0.9 a 1.3
      return Math.floor(Number(base) * growth);
    };

    return {
      views: BigInt(randomGrowth(currentMetrics.views)),
      likes: BigInt(randomGrowth(currentMetrics.likes)),
      comments: BigInt(randomGrowth(currentMetrics.comments)),
      shares: BigInt(randomGrowth(currentMetrics.shares)),
      sales: randomGrowth(currentMetrics.sales),
    };
  }
}
