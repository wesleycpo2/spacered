/**
 * ADMIN ROUTES (MVP)
 * 
 * Dashboard para acompanhar coletas e enviar teste WhatsApp.
 */

import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/prisma';
import { runHashtagCollector } from '../../jobs/collect-hashtags.job';
import { runSignalCollector } from '../../jobs/collect-signals.job';
import { runVideoCollector } from '../../jobs/collect-videos.job';
import { isAutoCollectorRunning, startAutoCollector, stopAutoCollector } from '../../jobs/auto-collector.job';
import { WhatsAppAdapter } from '../../adapters/whatsapp.adapter';
import { AiAnalyzerService } from '../../services/ai-analyzer.service';
import { TelegramAdapter } from '../../adapters/telegram.adapter';

function requireAdmin(requestToken?: string): boolean {
  const required = process.env.ADMIN_TOKEN;
  if (!required) return true;
  return requestToken === required;
}

export async function adminRoutes(fastify: FastifyInstance) {
  // GET /admin/overview
  fastify.get('/admin/overview', async (request, reply) => {
    const token = request.headers['x-admin-token'] as string | undefined;
    if (!requireAdmin(token)) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

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
      autoCollectorRunning: isAutoCollectorRunning(),
    });
  });

  // POST /admin/auto-collector/start
  fastify.post('/admin/auto-collector/start', async (request, reply) => {
    const token = request.headers['x-admin-token'] as string | undefined;
    if (!requireAdmin(token)) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    await startAutoCollector();
    return reply.send({ success: true, running: isAutoCollectorRunning() });
  });

  // POST /admin/auto-collector/stop
  fastify.post('/admin/auto-collector/stop', async (request, reply) => {
    const token = request.headers['x-admin-token'] as string | undefined;
    if (!requireAdmin(token)) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    await stopAutoCollector();
    return reply.send({ success: true, running: isAutoCollectorRunning() });
  });

  // GET /admin/auto-collector/status
  fastify.get('/admin/auto-collector/status', async (request, reply) => {
    const token = request.headers['x-admin-token'] as string | undefined;
    if (!requireAdmin(token)) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    return reply.send({ success: true, running: isAutoCollectorRunning() });
  });

  // POST /admin/collect
  fastify.post('/admin/collect', async (request, reply) => {
    const token = request.headers['x-admin-token'] as string | undefined;
    if (!requireAdmin(token)) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const limit = Number((request.body as { limit?: number })?.limit || 20);
    const result = await runHashtagCollector(limit);

    return reply.send({ success: true, ...result });
  });

  fastify.post('/admin/collect-all', async (request, reply) => {
    const token = request.headers['x-admin-token'] as string | undefined;
    if (!requireAdmin(token)) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const limit = Number((request.body as { limit?: number })?.limit || 30);
    const [videoResult, signalResult] = await Promise.all([
      runVideoCollector(limit),
      runSignalCollector(limit),
    ]);

    return reply.send({
      success: true,
      videos: videoResult.total,
      signals: signalResult.total,
    });
  });

  // POST /admin/whatsapp-test
  fastify.post('/admin/whatsapp-test', async (request, reply) => {
    const token = request.headers['x-admin-token'] as string | undefined;
    if (!requireAdmin(token)) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const phoneNumber = (request.body as { phoneNumber?: string })?.phoneNumber;
    if (!phoneNumber) {
      return reply.status(400).send({ error: 'phoneNumber obrigatório' });
    }

    const product = await prisma.product.findFirst({
      orderBy: { viralScore: 'desc' },
    });

    if (!product) {
      return reply.status(404).send({ error: 'Nenhum produto encontrado' });
    }

    const adapter = new WhatsAppAdapter();
    const message = adapter.formatAlertMessage({
      name: product.title,
      viralScore: product.viralScore,
      views: product.views,
      sales: product.sales,
      productUrl: product.tiktokUrl,
    });

    const sent = await adapter.sendMessage(phoneNumber, message);

    return reply.send({ success: sent });
  });

  // POST /admin/telegram/connect
  fastify.post('/admin/telegram/connect', async (request, reply) => {
    const token = request.headers['x-admin-token'] as string | undefined;
    if (!requireAdmin(token)) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const body = request.body as { email?: string; identifier?: string };
    const email = body?.email?.trim();
    const identifier = body?.identifier?.trim();

    if (!email || !identifier) {
      return reply.status(400).send({ error: 'Email e identifier são obrigatórios' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return reply.status(404).send({ error: 'Usuário não encontrado' });
    }

    const adapter = new TelegramAdapter();
    const chatId = await adapter.resolveChatId(identifier);
    if (!chatId) {
      return reply.status(400).send({ error: 'Não foi possível localizar o chat. Envie /start para o bot e tente novamente.' });
    }

    const existing = await prisma.notificationConfig.findUnique({
      where: { userId: user.id },
    });

    const enabledChannels = new Set(existing?.enabledChannels || []);
    enabledChannels.add('TELEGRAM');

    const data = {
      telegramChatId: chatId,
      enabledChannels: Array.from(enabledChannels),
    };

    const updated = existing
      ? await prisma.notificationConfig.update({
          where: { userId: user.id },
          data,
        })
      : await prisma.notificationConfig.create({
          data: {
            userId: user.id,
            ...data,
            maxAlertsPerDay: 50,
          },
        });

    return reply.send({
      success: true,
      data: {
        email: user.email,
        enabled: updated.enabledChannels.includes('TELEGRAM'),
        telegramChatId: updated.telegramChatId,
      },
    });
  });

  // POST /admin/telegram/disable
  fastify.post('/admin/telegram/disable', async (request, reply) => {
    const token = request.headers['x-admin-token'] as string | undefined;
    if (!requireAdmin(token)) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const body = request.body as { email?: string };
    const email = body?.email?.trim();
    if (!email) {
      return reply.status(400).send({ error: 'Email é obrigatório' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return reply.status(404).send({ error: 'Usuário não encontrado' });
    }

    const existing = await prisma.notificationConfig.findUnique({
      where: { userId: user.id },
    });

    if (!existing) {
      return reply.send({
        success: true,
        data: { email: user.email, enabled: false, telegramChatId: null },
      });
    }

    const enabledChannels = existing.enabledChannels.filter(
      (channel) => channel !== 'TELEGRAM'
    );

    const updated = await prisma.notificationConfig.update({
      where: { userId: user.id },
      data: {
        telegramChatId: null,
        enabledChannels,
      },
    });

    return reply.send({
      success: true,
      data: {
        email: user.email,
        enabled: updated.enabledChannels.includes('TELEGRAM'),
        telegramChatId: updated.telegramChatId,
      },
    });
  });

  // POST /admin/ai-evaluate
  fastify.post('/admin/ai-evaluate', async (request, reply) => {
    const token = request.headers['x-admin-token'] as string | undefined;
    if (!requireAdmin(token)) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const signals = await prisma.trendSignal.findMany({
      orderBy: { collectedAt: 'desc' },
      take: 30,
    });

    if (signals.length === 0) {
      return reply.send({ success: false, message: 'Sem sinais para analisar.' });
    }

    const ai = new AiAnalyzerService();
    const summary = await ai.analyzeSignals(signals);

    return reply.send({ success: true, summary });
  });
}
