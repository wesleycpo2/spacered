/**
 * ROTAS DA API
 * 
 * Centralizador de todas as rotas da aplicação
 */

import { FastifyInstance } from 'fastify';
import { register, login, refreshToken } from './controllers/auth.controller';
import { requireAuth, requirePlan } from '../middlewares/auth.middleware';
import { subscriptionRoutes } from './routes/subscription.routes';
import { nicheRoutes } from './routes/niche.routes';

export async function routes(fastify: FastifyInstance) {
  // ========================================
  // ROTAS PÚBLICAS (sem autenticação)
  // ========================================

  fastify.get('/health', async () => {
    return {
      success: true,
      message: 'TikTok Trend Alert API is running',
      timestamp: new Date().toISOString(),
    };
  });

  // ========================================
  // ROTAS DE AUTENTICAÇÃO
  // ========================================

  fastify.post('/auth/register', register);
  fastify.post('/auth/login', login);
  fastify.post('/auth/refresh', refreshToken);

  // ========================================
  // ROTAS DE ASSINATURA E NICHOS
  // ========================================

  await subscriptionRoutes(fastify);
  await nicheRoutes(fastify);

  // ========================================
  // ROTAS PRIVADAS - QUALQUER ASSINANTE
  // ========================================

  // Exemplo: Rota acessível para BASE e PREMIUM
  fastify.get(
    '/me',
    {
      onRequest: [requireAuth],
    },
    async (request, reply) => {
      return reply.send({
        success: true,
        data: {
          user: {
            id: request.user!.userId,
            email: request.user!.email,
            subscription: request.user!.subscription,
          },
        },
      });
    }
  );

  // Exemplo: Dashboard básico (BASE + PREMIUM)
  fastify.get(
    '/dashboard',
    {
      onRequest: [requireAuth],
    },
    async (request, reply) => {
      const { subscription } = request.user!;

      return reply.send({
        success: true,
        data: {
          message: 'Bem-vindo ao dashboard',
          plan: subscription.planType,
          limits: {
            maxAlertsPerDay: subscription.maxAlertsPerDay,
            maxNiches: subscription.maxNiches,
          },
        },
      });
    }
  );

  // ========================================
  // ROTAS PRIVADAS - APENAS PREMIUM
  // ========================================

  // Exemplo: Análise avançada (apenas PREMIUM)
  fastify.get(
    '/analytics/advanced',
    {
      onRequest: [requireAuth, requirePlan('PREMIUM')],
    },
    async (request, reply) => {
      return reply.send({
        success: true,
        data: {
          message: 'Análise avançada disponível',
          feature: 'Premium Analytics',
          plan: request.user!.subscription.planType,
        },
      });
    }
  );

  // Exemplo: Exportar relatórios (apenas PREMIUM)
  fastify.get(
    '/reports/export',
    {
      onRequest: [requireAuth, requirePlan('PREMIUM')],
    },
    async (request, reply) => {
      return reply.send({
        success: true,
        data: {
          message: 'Exportação de relatórios',
          format: 'PDF/Excel disponível para PREMIUM',
        },
      });
    }
  );
}
