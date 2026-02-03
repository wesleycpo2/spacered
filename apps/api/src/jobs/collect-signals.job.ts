/**
 * COLLECT SIGNALS JOB (MVP)
 * 
 * Coleta sinais de hashtags/sons/vídeos e grava no banco.
 */

import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';
import { TikTokCollectorService } from '../services/tiktok-collector.service';

const collector = new TikTokCollectorService();

export async function runSignalCollector(limit = 30) {
  logger.info('🧩 Iniciando coleta de sinais', { limit });

  const signals = await collector.fetchSignals(limit);

  for (const signal of signals) {
    await prisma.trendSignal.create({
      data: {
        type: signal.type,
        value: signal.value,
        category: signal.category,
        region: signal.region,
        growthPercent: signal.growthPercent,
        source: signal.source,
      },
    });
  }

  logger.info('✅ Sinais coletados', { total: signals.length });

  return { total: signals.length };
}
