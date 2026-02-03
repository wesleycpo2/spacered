/**
 * ADMIN ROUTES (MVP)
 * 
 * Dashboard para acompanhar coletas e enviar teste WhatsApp.
 */

import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/prisma';
import { runHashtagCollector } from '../../jobs/collect-hashtags.job';
import { runSignalCollector } from '../../jobs/collect-signals.job';
import { WhatsAppAdapter } from '../../adapters/whatsapp.adapter';

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

    const signals = await prisma.trendSignal.findMany({
      orderBy: { collectedAt: 'desc' },
      take: 20,
    });

    return reply.send({
      success: true,
      products,
      signals,
    });
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
    const result = await runSignalCollector(limit);

    return reply.send({ success: true, ...result });
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
}
