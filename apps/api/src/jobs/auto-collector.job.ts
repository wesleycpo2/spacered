/**
 * AUTO COLLECTOR JOB
 *
 * Coleta periódica de hashtags/sinais e análise por IA.
 */

import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';
import { runHashtagCollector } from './collect-hashtags.job';
import { runSignalCollector } from './collect-signals.job';
import { AiAnalyzerService } from '../services/ai-analyzer.service';

let intervalHandle: NodeJS.Timeout | null = null;

export async function runAutoCollectorOnce() {
  const hashtagLimit = Number(process.env.AUTO_HASHTAG_LIMIT || 20);
  const signalLimit = Number(process.env.AUTO_SIGNAL_LIMIT || 30);

  logger.info('🤖 Auto-collector: iniciando ciclo', {
    hashtagLimit,
    signalLimit,
  });

  await runHashtagCollector(hashtagLimit);
  await runSignalCollector(signalLimit);

  const enableAi = (process.env.AUTO_AI_ENABLED || 'true').toLowerCase() === 'true';
  if (enableAi) {
    const signals = await prisma.trendSignal.findMany({
      orderBy: { collectedAt: 'desc' },
      take: 30,
    });

    if (signals.length) {
      const ai = new AiAnalyzerService();
      const summary = await ai.analyzeSignals(signals);
      await prisma.aiReport.create({ data: { summary } });
      logger.success('🧠 IA: resumo gerado', { length: summary.length });
    }
  }

  logger.success('✅ Auto-collector: ciclo concluído');
}

export function startAutoCollector() {
  const enabled = (process.env.AUTO_COLLECT_ENABLED || 'true').toLowerCase() === 'true';
  if (!enabled) {
    logger.warn('⚠️ Auto-collector desabilitado');
    return;
  }

  if (intervalHandle) {
    logger.warn('⏱️ Auto-collector já está ativo');
    return;
  }

  const minutes = Number(process.env.AUTO_COLLECT_INTERVAL_MINUTES || 30);
  const intervalMs = Math.max(5, minutes) * 60 * 1000;

  logger.info('⏱️ Auto-collector ativo', { minutes });

  // Rodar uma vez ao iniciar
  runAutoCollectorOnce().catch((error) => logger.error('❌ Auto-collector error', { error }));

  intervalHandle = setInterval(() => {
    runAutoCollectorOnce().catch((error) => logger.error('❌ Auto-collector error', { error }));
  }, intervalMs);
}

export function stopAutoCollector() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    logger.warn('⏸️ Auto-collector pausado');
  }
}

export function isAutoCollectorRunning() {
  return intervalHandle !== null;
}
