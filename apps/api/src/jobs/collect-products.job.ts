/**
 * COLLECT PRODUCTS JOB
 *
 * Coleta produtos em alta (TikTok Shop) via RapidAPI e grava como produtos.
 */

import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';
import { TikTokCollectorService } from '../services/tiktok-collector.service';
import { TrendAnalyzerService } from '../services/trend-analyzer.service';

const collector = new TikTokCollectorService();
const analyzer = new TrendAnalyzerService();

function buildProductUrl(urlTitle?: string) {
  if (!urlTitle) {
    return 'https://www.tiktok.com';
  }

  const query = encodeURIComponent(urlTitle.replace(/\s+/g, ' ').trim());
  return `https://www.tiktok.com/search?q=${query}`;
}

function buildProductTitle(urlTitle?: string) {
  if (!urlTitle) {
    return 'Produto em alta no TikTok Shop';
  }

  return urlTitle.replace(/[-_]/g, ' ').trim();
}

export async function runProductCollector(limit = 20) {
  logger.info('🛒 Iniciando coleta de produtos em alta', { limit });

  const products = await collector.fetchTopProducts(limit);
  let missingProductId = 0;

  for (const item of products) {
    if (!((item as any).product_id || (item as any).productId || (item as any).id)) {
      missingProductId += 1;
    }
    const tiktokUrl = buildProductUrl(item.url_title);
    const title = buildProductTitle(item.url_title);
    const category =
      item.first_ecom_category?.value ||
      item.second_ecom_category?.value ||
      item.third_ecom_category?.value;

    const views = item.impression ?? 0;
    const likes = item.like ?? 0;
    const comments = item.comment ?? 0;
    const shares = item.share ?? 0;
    const impressions = item.impression ?? 0;
    const postCount = item.post ?? 0;
    const postChange = item.post_change ?? null;
    const cost = item.cost ?? null;
    const cpa = item.cpa ?? null;
    const ctr = item.ctr ?? null;
    const cvr = item.cvr ?? null;
    const playSixRate = item.play_six_rate ?? null;
    const ecomCategory1 = item.first_ecom_category?.value || null;
    const ecomCategory2 = item.second_ecom_category?.value || null;
    const ecomCategory3 = item.third_ecom_category?.value || null;

    const product = await prisma.product.upsert({
      where: { tiktokUrl },
      create: {
        tiktokUrl,
        title,
        description: category
          ? `Produto em alta no TikTok Shop • ${category}`
          : 'Produto em alta no TikTok Shop',
        thumbnail: item.cover_url || null,
        views: BigInt(views),
        likes: BigInt(likes),
        comments: BigInt(comments),
        shares: BigInt(shares),
        sales: 0,
        impressions: BigInt(impressions),
        ctr,
        cvr,
        cpa,
        cost,
        postCount,
        postChange,
        playSixRate,
        urlTitle: item.url_title || null,
        ecomCategory1,
        ecomCategory2,
        ecomCategory3,
        lastScrapedAt: new Date(),
      } as any,
      update: {
        title,
        description: category
          ? `Produto em alta no TikTok Shop • ${category}`
          : 'Produto em alta no TikTok Shop',
        thumbnail: item.cover_url || null,
        views: BigInt(views),
        likes: BigInt(likes),
        comments: BigInt(comments),
        shares: BigInt(shares),
        impressions: BigInt(impressions),
        ctr,
        cvr,
        cpa,
        cost,
        postCount,
        postChange,
        playSixRate,
        urlTitle: item.url_title || null,
        ecomCategory1,
        ecomCategory2,
        ecomCategory3,
        lastScrapedAt: new Date(),
      } as any,
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
        impressions: BigInt(impressions),
        ctr,
        cvr,
        cpa,
        cost,
        postCount,
        postChange,
        playSixRate,
        viralScore: Math.round(analysis.viralScore),
        status: analysis.status,
      } as any,
    });
  }

  logger.info('✅ Produtos coletados', { total: products.length });
  if (missingProductId > 0) {
    logger.warn('⚠️ Alguns products retornaram sem product_id', { missing: missingProductId });
  }
  return { total: products.length };
}
