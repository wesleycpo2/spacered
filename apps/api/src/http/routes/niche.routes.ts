/**
 * NICHE ROUTES
 * 
 * Endpoints para gerenciar nichos (apenas PREMIUM)
 */

import { FastifyInstance, FastifyRequest } from 'fastify';
import { requireAuth, requirePlan } from '../../middlewares/auth.middleware';

export async function nicheRoutes(fastify: FastifyInstance) {
  // GET /niches - Lista todos os nichos disponíveis
  fastify.get(
    '/niches',
    { preHandler: requireAuth },
    async () => {
      const niches = await fastify.prisma.niche.findMany({
        select: {
          id: true,
          name: true,
          description: true,
        },
        orderBy: { name: 'asc' },
      });

      return niches;
    }
  );

  // GET /niches/me - Lista nichos do usuário autenticado
  fastify.get(
    '/niches/me',
    { preHandler: requireAuth },
    async (request: FastifyRequest) => {
      const userId = request.user!.userId;

      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        include: {
          niches: {
            select: {
              id: true,
              name: true,
              description: true,
            },
            orderBy: { name: 'asc' },
          },
        },
      });

      return user?.niches || [];
    }
  );

  // POST /niches/:id/subscribe - Adiciona nicho (apenas PREMIUM)
  fastify.post<{ Params: { id: string } }>(
    '/niches/:id/subscribe',
    { preHandler: [requireAuth, requirePlan('PREMIUM')] },
    async (request) => {
      const userId = request.user!.userId;
      const nicheId = request.params.id;

      // Verifica se nicho existe
      const niche = await fastify.prisma.niche.findUnique({
        where: { id: nicheId },
      });

      if (!niche) {
        return { error: 'Nicho não encontrado' };
      }

      // Verifica limite de nichos
      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        include: { niches: true, subscription: true },
      });

      if (!user || !user.subscription) {
        return { error: 'Usuário ou assinatura não encontrada' };
      }

      const maxNiches = user.subscription.planType === 'PREMIUM' ? 10 : 0;

      if (user.niches.length >= maxNiches) {
        return { error: `Limite de ${maxNiches} nichos atingido` };
      }

      // Adiciona nicho
      await fastify.prisma.user.update({
        where: { id: userId },
        data: {
          niches: {
            connect: { id: nicheId },
          },
        },
      });

      return { success: true, message: 'Nicho adicionado' };
    }
  );

  // DELETE /niches/:id/unsubscribe - Remove nicho
  fastify.delete<{ Params: { id: string } }>(
    '/niches/:id/unsubscribe',
    { preHandler: [requireAuth, requirePlan('PREMIUM')] },
    async (request) => {
      const userId = request.user!.userId;
      const nicheId = request.params.id;

      await fastify.prisma.user.update({
        where: { id: userId },
        data: {
          niches: {
            disconnect: { id: nicheId },
          },
        },
      });

      return { success: true, message: 'Nicho removido' };
    }
  );
}
