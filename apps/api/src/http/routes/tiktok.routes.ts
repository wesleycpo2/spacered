/**
 * TIKTOK ROUTES (MVP)
 * 
 * Endpoint para disparar coleta de hashtags manualmente.
 */

import { FastifyInstance } from 'fastify';
import { runHashtagCollector } from '../../jobs/collect-hashtags.job';
import { runSignalCollector } from '../../jobs/collect-signals.job';

export async function tiktokRoutes(fastify: FastifyInstance) {
  fastify.post('/tiktok/collect', async (request, reply) => {
    const requiredToken = process.env.COLLECTOR_TOKEN;
    const provided = request.headers['x-collector-token'];

    if (requiredToken && provided !== requiredToken) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const limit = Number((request.body as { limit?: number })?.limit || 20);
    const result = await runHashtagCollector(limit);

    return reply.send({ success: true, ...result });
  });

  fastify.post('/tiktok/collect-all', async (request, reply) => {
    const requiredToken = process.env.COLLECTOR_TOKEN;
    const provided = request.headers['x-collector-token'];

    if (requiredToken && provided !== requiredToken) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const limit = Number((request.body as { limit?: number })?.limit || 30);
    const result = await runSignalCollector(limit);

    return reply.send({ success: true, ...result });
  });
}
