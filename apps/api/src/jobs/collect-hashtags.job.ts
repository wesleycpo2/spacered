/**
 * COLLECT HASHTAGS JOB (MVP)
 * 
 * Coleta tendências de hashtags e grava snapshots no banco.
 */

import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';
import { TikTokCollectorService } from '../services/tiktok-collector.service';
import { TrendAnalyzerService } from '../services/trend-analyzer.service';

const collector = new TikTokCollectorService();
const analyzer = new TrendAnalyzerService();

export async function runHashtagCollector(limit = 20) {
  logger.info('🔎 Iniciando coleta de hashtags', { limit });

  const trends = await collector.fetchTrends(limit);

  for (const trend of trends) {
    const slug = trend.hashtag
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const tiktokUrl = `https://www.tiktok.com/tag/${slug}`;

    const product = await prisma.product.upsert({
      where: { tiktokUrl },
      create: {
        tiktokUrl,
        title: `#${trend.hashtag}`,
        description: 'Hashtag em tendência no TikTok',
        views: BigInt(trend.views),
        likes: BigInt(trend.likes),
        comments: BigInt(trend.comments),
        shares: BigInt(trend.shares),
        sales: 0,
        lastScrapedAt: new Date(),
      },
      update: {
        views: BigInt(trend.views),
        likes: BigInt(trend.likes),
        comments: BigInt(trend.comments),
        shares: BigInt(trend.shares),
        lastScrapedAt: new Date(),
      },
    });

    const analysis = await analyzer.analyzeProduct(product.id, {
      views: BigInt(trend.views),
      likes: BigInt(trend.likes),
      comments: BigInt(trend.comments),
      shares: BigInt(trend.shares),
      sales: 0,
    });

    await prisma.product.update({
      where: { id: product.id },
      data: {
        viralScore: Math.round(analysis.viralScore),
        status: analysis.status,
      },
    });

    await prisma.trend.create({
      data: {
        productId: product.id,
        views: BigInt(trend.views),
        likes: BigInt(trend.likes),
        comments: BigInt(trend.comments),
        shares: BigInt(trend.shares),
        sales: 0,
        viralScore: Math.round(analysis.viralScore),
        status: analysis.status,
      },
    });
  }

  logger.info('✅ Coleta concluída', { total: trends.length });

  return { total: trends.length };
}
