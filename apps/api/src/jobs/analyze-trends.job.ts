/**
 * ANALYZE TRENDS JOB
 * 
 * Background job que:
 * 1. Busca produtos ativos
 * 2. Usa métricas reais já coletadas
 * 3. Analisa viralScore e crescimento
 * 4. Atualiza status do produto
 * 5. Cria snapshot histórico (Trend)
 * 
 * Este job NÃO dispara alertas (isso é responsabilidade do AlertProcessorJob)
 */

import { prisma } from '../config/prisma';
import { TrendAnalyzerService } from '../services/trend-analyzer.service';
import { logger } from '../utils/logger';

export class AnalyzeTrendsJob {
  private trendAnalyzer: TrendAnalyzerService;

  constructor() {
    this.trendAnalyzer = new TrendAnalyzerService();
  }

  /**
   * Executa análise de tendências para todos produtos ativos
   */
  async execute(): Promise<void> {
    const startTime = Date.now();

    logger.info('🚀 Iniciando análise de tendências');

    try {
      // Busca produtos ativos
      const products = await this.getActiveProducts();

      if (products.length === 0) {
        logger.info('ℹ️ Nenhum produto para analisar');
        return;
      }

      logger.info(`📦 ${products.length} produtos encontrados`);

      // Processa cada produto
      let analyzed = 0;
      let errors = 0;

      for (const product of products) {
        try {
          await this.analyzeProduct(product);
          analyzed++;
        } catch (error: any) {
          errors++;
          logger.error('❌ Erro ao analisar produto', {
            productId: product.id,
            error: error.message,
          });
        }

        // Delay entre análises
        await this.delay(100);
      }

      // Estatísticas finais
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.success('✅ Análise concluída', {
        total: products.length,
        analyzed,
        errors,
        duration: `${duration}s`,
      });
    } catch (error: any) {
      logger.error('❌ Erro no job de análise', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Busca produtos elegíveis para análise
   * 
   * Critérios:
   * - isActive = true
   * - Status: MONITORING ou VIRAL
   * - Não analisa DECLINED ou INACTIVE
   */
  private async getActiveProducts() {
    return await prisma.product.findMany({
      where: {
        isActive: true,
        status: {
          in: ['MONITORING', 'VIRAL'],
        },
      },
      orderBy: {
        viralScore: 'desc', // Prioriza produtos com maior score
      },
      take: 100, // Limita a 100 produtos por execução
    });
  }

  /**
   * Analisa um produto específico
   * 
   * Fluxo:
  * 1. Usa métricas reais do produto
   * 2. Calcula viralScore e crescimento
   * 3. Atualiza produto
   * 4. Cria snapshot histórico
   */
  private async analyzeProduct(product: any): Promise<void> {
    logger.info('🔍 Analisando produto', {
      id: product.id,
      name: product.title,
      currentScore: product.viralScore,
    });

    const newMetrics = {
      views: product.views,
      likes: product.likes,
      comments: product.comments,
      shares: product.shares,
      sales: product.sales,
    };

    logger.info('📊 Métricas atuais', {
      productId: product.id,
      views: Number(newMetrics.views),
      likes: Number(newMetrics.likes),
      sales: newMetrics.sales,
    });

    // 2. Analisa produto
    const analysis = await this.trendAnalyzer.analyzeProduct(
      product.id,
      newMetrics
    );

    // 3. Atualiza produto no banco
    await this.trendAnalyzer.updateProduct(product.id, newMetrics, analysis);

    // 4. Cria snapshot histórico
    await this.trendAnalyzer.createTrendSnapshot(
      product.id,
      product.nicheId,
      newMetrics,
      analysis
    );

    // Log de mudança de status
    if (product.status !== analysis.status) {
      logger.warn('🔄 Status alterado', {
        productId: product.id,
        oldStatus: product.status,
        newStatus: analysis.status,
      });
    }

    // Log de viralização
    if (analysis.status === 'VIRAL' && product.status !== 'VIRAL') {
      logger.success('🔥 PRODUTO VIRALIZADO!', {
        productId: product.id,
        name: product.title,
        viralScore: analysis.viralScore,
      });
    }
  }

  /**
   * Analisa produto específico (útil para testes)
   */
  async analyzeSpecificProduct(productId: string): Promise<void> {
    logger.info('🔍 Análise individual solicitada', { productId });

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new Error('Produto não encontrado');
    }

    await this.analyzeProduct(product);
  }

  /**
   * Obtém estatísticas gerais de tendências
   */
  async getStats(): Promise<any> {
    const [total, viral, monitoring, declined] = await Promise.all([
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.count({ where: { status: 'VIRAL', isActive: true } }),
      prisma.product.count({ where: { status: 'MONITORING', isActive: true } }),
      prisma.product.count({ where: { status: 'DECLINED', isActive: true } }),
    ]);

    // Média de viralScore
    const avgScore = await prisma.product.aggregate({
      where: { isActive: true },
      _avg: { viralScore: true },
    });

    // Top 5 produtos virais
    const topViral = await prisma.product.findMany({
      where: { status: 'VIRAL', isActive: true },
      orderBy: { viralScore: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        viralScore: true,
        views: true,
        sales: true,
      },
    });

    return {
      total,
      byStatus: {
        viral,
        monitoring,
        declined,
      },
      averageScore: avgScore._avg.viralScore?.toFixed(2) || 0,
      topViral,
    };
  }

  /**
   * Reprocessa produtos em DECLINED
   * Útil para dar uma segunda chance a produtos que podem ter se recuperado
   */
  async reanalyzeDeclinedProducts(): Promise<void> {
    logger.info('🔄 Reprocessando produtos em declínio');

    const declinedProducts = await prisma.product.findMany({
      where: {
        status: 'DECLINED',
        isActive: true,
      },
      take: 20,
    });

    logger.info(`📊 ${declinedProducts.length} produtos em declínio`);

    for (const product of declinedProducts) {
      await this.analyzeProduct(product);
      await this.delay(200);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Função auxiliar para executar o job manualmente
 */
export async function runTrendAnalysis() {
  const job = new AnalyzeTrendsJob();
  await job.execute();
}
