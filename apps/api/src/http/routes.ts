/**
 * ROTAS DA API
 * 
 * Centralizador de todas as rotas da aplicação
 */

import { FastifyInstance } from 'fastify';
import { register, login, refreshToken, setPassword } from './controllers/auth.controller';
import { requireAuth, requirePlan } from '../middlewares/auth.middleware';
import { prisma } from '../config/prisma';
import { subscriptionRoutes } from './routes/subscription.routes';
import { nicheRoutes } from './routes/niche.routes';
import { tiktokRoutes } from './routes/tiktok.routes';
import { adminRoutes } from './routes/admin.routes';
import { telegramRoutes } from './routes/telegram.routes';

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
  fastify.post('/auth/set-password', setPassword);

  // ========================================
  // ROTAS DE ASSINATURA E NICHOS
  // ========================================

  await subscriptionRoutes(fastify);
  await nicheRoutes(fastify);
  await tiktokRoutes(fastify);
  await adminRoutes(fastify);
  await telegramRoutes(fastify);

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
            phone: request.user!.phone,
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
  // OVERVIEW DO CLIENTE (BASE + PREMIUM)
  // ========================================

  fastify.get(
    '/me/overview',
    {
      onRequest: [requireAuth],
    },
    async (request, reply) => {
      const products = await prisma.product.findMany({
        orderBy: { viralScore: 'desc' },
        take: 10,
        include: {
          trends: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      const since = new Date();
      since.setHours(since.getHours() - 48);

      const serializedProducts = await Promise.all(
        products.map(async (product) => {
          const trends = await prisma.trend.findMany({
            where: {
              productId: product.id,
              createdAt: { gte: since },
            },
            orderBy: { createdAt: 'asc' },
            take: 200,
          });

          const first = trends[0];
          const last = trends[trends.length - 1];

          const baseViews = first ? Number(first.views) : Number(product.views);
          const latestViews = last ? Number(last.views) : Number(product.views);

          const growth48h = baseViews > 0
            ? Math.round(((latestViews - baseViews) / baseViews) * 100)
            : 0;

          const latestLikes = last ? Number(last.likes) : 0;
          const latestComments = last ? Number(last.comments) : 0;
          const latestShares = last ? Number(last.shares) : 0;

          const engagementRatio = latestViews > 0
            ? (latestLikes + latestComments + latestShares) / latestViews
            : 0;

          const engagementLabel =
            engagementRatio >= 0.08 ? 'Alto' : engagementRatio >= 0.04 ? 'Médio' : 'Baixo';

          const saturationLabel =
            growth48h >= 120 ? 'Baixa' : growth48h >= 40 ? 'Média' : 'Alta';

          const growthScore = Math.min(Math.max(growth48h, 0), 200) / 200 * 100;
          const engagementScore = Math.min(1, engagementRatio / 0.1) * 100;
          const probability = Math.round(
            Math.min(
              100,
              Math.max(0, product.viralScore * 0.5 + growthScore * 0.3 + engagementScore * 0.2)
            )
          );

          return {
            ...product,
            views: Number(product.views),
            likes: Number(product.likes),
            comments: Number(product.comments),
            shares: Number(product.shares),
            trends: product.trends.map((trend) => ({
              ...trend,
              views: Number(trend.views),
              likes: Number(trend.likes),
              comments: Number(trend.comments),
              shares: Number(trend.shares),
            })),
            insights: {
              growth48h,
              engagementLabel,
              saturationLabel,
              probability,
            },
          };
        })
      );

      const signals = await prisma.trendSignal.findMany({
        orderBy: { collectedAt: 'desc' },
        take: 20,
      });

      const latestReport = await prisma.aiReport.findFirst({
        orderBy: { createdAt: 'desc' },
      });

      const aiReports = await prisma.aiReport.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      return reply.send({
        success: true,
        products: serializedProducts,
        signals,
        aiReport: latestReport,
        aiReports,
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
