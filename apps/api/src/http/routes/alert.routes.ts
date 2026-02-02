/**
 * ENDPOINT PARA EXECUTAR JOB DE ALERTAS MANUALMENTE
 * 
 * Adicionar estas rotas ao routes.ts para testar o sistema
 */

import { FastifyInstance } from 'fastify';
import { requireAuth, requirePlan } from '../../middlewares/auth.middleware';
import { runAlertProcessor } from '../../jobs/alert-processor.job';
import { AlertService } from '../../services/alert.service';

export async function alertRoutes(fastify: FastifyInstance) {
  const alertService = new AlertService();

  // ============================================
  // ENDPOINT: Executar job de alertas (admin)
  // ============================================
  
  fastify.post(
    '/admin/alerts/process',
    {
      onRequest: [requireAuth, requirePlan('PREMIUM')], // Apenas PREMIUM pode executar
    },
    async (request, reply) => {
      try {
        await runAlertProcessor();

        return reply.send({
          success: true,
          message: 'Job de alertas executado com sucesso',
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: 'Erro ao executar job',
          error: error.message,
        });
      }
    }
  );

  // ============================================
  // ENDPOINT: Estatísticas de alertas
  // ============================================
  
  fastify.get(
    '/alerts/stats',
    {
      onRequest: [requireAuth],
    },
    async (request, reply) => {
      const userId = request.user!.userId;

      const stats = await alertService.getAlertStats(userId);

      return reply.send({
        success: true,
        data: stats,
      });
    }
  );

  // ============================================
  // ENDPOINT: Histórico de alertas
  // ============================================
  
  fastify.get(
    '/alerts/history',
    {
      onRequest: [requireAuth],
    },
    async (request, reply) => {
      const userId = request.user!.userId;

      // TODO: Implementar paginação
      const alerts = await fastify.prisma.alert.findMany({
        where: { userId },
        include: {
          product: {
            select: {
              name: true,
              viralScore: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 20,
      });

      return reply.send({
        success: true,
        data: alerts,
      });
    }
  );
}
