import 'dotenv/config';
import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';
import { runVideoCollector } from '../jobs/collect-videos.job';
import { runProductCollector } from '../jobs/collect-products.job';
import { runSignalCollector } from '../jobs/collect-signals.job';

async function main() {
  const limit = Number(process.env.MANUAL_COLLECT_LIMIT || 30);

  logger.info('🚀 Executando coleta manual (vídeos, produtos, sinais)', { limit });

  try {
    const [videos, products, signals] = await Promise.all([
      runVideoCollector(limit),
      runProductCollector(limit),
      runSignalCollector(limit),
    ]);

    logger.success('✅ Coleta concluída', {
      videos: videos.total,
      products: products.total,
      signals: signals.total,
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  logger.error('❌ Falha na coleta manual', { error });
  await prisma.$disconnect();
  process.exit(1);
});
