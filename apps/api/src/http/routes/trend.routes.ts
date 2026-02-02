/**
 * ROTAS DO TREND ENGINE
 * 
 * Endpoints para executar análises e obter estatísticas
 */

import { FastifyInstance } from 'fastify';
import { requireAuth, requirePlan } from '../../middlewares/auth.middleware';
import { AnalyzeTrendsJob } from '../../jobs/analyze-trends.job';
import { TrendAnalyzerService } from '../../services/trend-analyzer.service';

export async function trendRoutes(fastify: FastifyInstance) {
  const job = new AnalyzeTrendsJob();
  const analyzer = new TrendAnalyzerService();

  // ============================================
  // ENDPOINT: Executar análise de tendências (admin)
  // ============================================

  fastify.post(
    '/admin/trends/analyze',
    {
      onRequest: [requireAuth, requirePlan('PREMIUM')],
    },
    async (request, reply) => {
      try {
        await job.execute();

        return reply.send({
          success: true,
          message: 'Análise de tendências executada com sucesso',
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: 'Erro ao executar análise',
          error: error.message,
        });
      }
    }
  );

  // ============================================
  // ENDPOINT: Analisar produto específico
  // ============================================

  fastify.post<{ Params: { productId: string } }>(
    '/admin/trends/analyze/:productId',
    {
      onRequest: [requireAuth, requirePlan('PREMIUM')],
    },
    async (request, reply) => {
      try {
        const { productId } = request.params;

        await job.analyzeSpecificProduct(productId);

        return reply.send({
          success: true,
          message: 'Produto analisado com sucesso',
          productId,
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: error.message,
        });
      }
    }
  );

  // ============================================
  // ENDPOINT: Estatísticas gerais
  // ============================================

  fastify.get(
    '/trends/stats',
    {
      onRequest: [requireAuth],
    },
    async (request, reply) => {
      const stats = await job.getStats();

      return reply.send({
        success: true,
        data: stats,
      });
    }
  );

  // ============================================
  // ENDPOINT: Histórico de tendências de um produto
  // ============================================

  fastify.get<{ Params: { productId: string } }>(
    '/trends/history/:productId',
    {
      onRequest: [requireAuth],
    },
    async (request, reply) => {
      const { productId } = request.params;

      const trends = await fastify.prisma.trend.findMany({
        where: { productId },
        orderBy: { recordedAt: 'desc' },
        take: 30, // Últimos 30 snapshots
      });

      return reply.send({
        success: true,
        data: trends,
      });
    }
  );
}
