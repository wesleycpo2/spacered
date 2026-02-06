import 'dotenv/config';
import { TikTokCollectorService } from '../services/tiktok-collector.service';
import { logger } from '../utils/logger';

async function main() {
  const collector = new TikTokCollectorService();

  logger.info('🔎 Verificando provedor TikTok (RapidAPI)');

  const limit = Number(process.env.RAPIDAPI_SMOKE_LIMIT || 5);

  const [hashtags, videos, products, keywords] = await Promise.all([
    collector.fetchTrends(limit),
    collector.fetchTrendingVideos(limit),
    collector.fetchTopProducts(limit),
    collector.fetchTrendingKeywords(limit),
  ]);

  logger.info('📈 Tendências de hashtags', {
    total: hashtags.length,
    sample: hashtags[0],
  });

  logger.info('🎬 Vídeos em alta', {
    total: videos.length,
    sample: videos[0],
  });

  logger.info('🛒 Produtos em alta', {
    total: products.length,
    sample: products[0],
  });

  logger.info('🔑 Keywords em alta', {
    total: keywords.length,
    sample: keywords[0],
  });

  const productId = (products[0] as any)?.product_id
    || (products[0] as any)?.productId
    || (products[0] as any)?.id
    || null;

  if (productId) {
    const [detail, metrics] = await Promise.all([
      collector.fetchProductDetail(String(productId)),
      collector.fetchProductMetrics(String(productId)),
    ]);

    logger.info('ℹ️ Detalhes do produto', {
      productId,
      detail,
    });

    logger.info('📊 Métricas históricas do produto', {
      productId,
      metrics,
    });
  } else {
    logger.warn('⚠️ Nenhum product_id encontrado no primeiro item da lista. Informe manualmente para testar detail/metrics.');
  }

  logger.success('✅ Teste rápido do provedor concluído');
}

main().catch((error) => {
  logger.error('❌ Falha no teste do provedor', { error });
  process.exit(1);
});
