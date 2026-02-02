/**
 * SUBSCRIPTION ROUTES
 * 
 * Endpoints para consultar status da assinatura
 */

import { FastifyInstance, FastifyRequest } from 'fastify';
import { requireAuth } from '../../middlewares/auth.middleware';

export async function subscriptionRoutes(fastify: FastifyInstance) {
  // GET /subscription/status - Retorna status da assinatura do usuário autenticado
  fastify.get(
    '/subscription/status',
    { preHandler: requireAuth },
    async (request: FastifyRequest) => {
      const userId = request.user!.userId;

      const subscription = await fastify.prisma.subscription.findUnique({
        where: { userId },
      });

      if (!subscription) {
        return { error: 'Assinatura não encontrada' };
      }

      // Calcula limites baseado no plano
      const limits = {
        BASE: { maxAlertsPerDay: 50, maxNiches: 0 },
        PREMIUM: { maxAlertsPerDay: 200, maxNiches: 10 },
      };

      return {
        id: subscription.id,
        status: subscription.status,
        planType: subscription.planType,
        maxAlertsPerDay: limits[subscription.planType].maxAlertsPerDay,
        maxNiches: limits[subscription.planType].maxNiches,
      };
    }
  );
}
