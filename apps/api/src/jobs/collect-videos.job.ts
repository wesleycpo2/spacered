/**
 * COLLECT VIDEOS JOB
 *
 * Coleta vídeos em alta via RapidAPI e grava como produtos.
 */

import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';
import { TikTokCollectorService } from '../services/tiktok-collector.service';
import { TrendAnalyzerService } from '../services/trend-analyzer.service';

const collector = new TikTokCollectorService();
const analyzer = new TrendAnalyzerService();

function buildVideoUrl(videoId?: string, authorId?: string, fallback?: string) {
  if (authorId && videoId) {
    return `https://www.tiktok.com/@${authorId}/video/${videoId}`;
  }
  return fallback || '';
}

export async function runVideoCollector(limit = 20) {
  logger.info('🎬 Iniciando coleta de vídeos em alta', { limit });

  const videos = await collector.fetchTrendingVideos(limit);

  for (const item of videos) {
    const videoId = item.video?.id || item.id;
    const authorId = item.author?.uniqueId;
    const tiktokUrl = buildVideoUrl(videoId, authorId, item.video?.playAddr);
    const title = item.desc || `Vídeo em alta ${videoId}`;

    const views = item.stats?.playCount ?? 0;
    const likes = item.stats?.diggCount ?? 0;
    const comments = item.stats?.commentCount ?? 0;
    const shares = item.stats?.shareCount ?? 0;

    const product = await prisma.product.upsert({
      where: { tiktokUrl },
      create: {
        tiktokUrl,
        title,
        description: 'Vídeo em alta no TikTok',
        thumbnail: item.video?.cover,
        views: BigInt(views),
        likes: BigInt(likes),
        comments: BigInt(comments),
        shares: BigInt(shares),
        sales: 0,
        lastScrapedAt: new Date(),
      },
      update: {
        title,
        thumbnail: item.video?.cover,
        views: BigInt(views),
        likes: BigInt(likes),
        comments: BigInt(comments),
        shares: BigInt(shares),
        lastScrapedAt: new Date(),
      },
    });

    const analysis = await analyzer.analyzeProduct(product.id, {
      views: BigInt(views),
      likes: BigInt(likes),
      comments: BigInt(comments),
      shares: BigInt(shares),
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
        views: BigInt(views),
        likes: BigInt(likes),
        comments: BigInt(comments),
        shares: BigInt(shares),
        sales: 0,
        viralScore: Math.round(analysis.viralScore),
        status: analysis.status,
      },
    });
  }

  logger.info('✅ Vídeos coletados', { total: videos.length });
  return { total: videos.length };
}