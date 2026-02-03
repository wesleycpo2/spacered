/**
 * TIKTOK COLLECTOR SERVICE (MVP)
 * 
 * Coleta dados públicos de hashtags/tendências.
 * - Se TIKTOK_TRENDS_URL estiver definido, busca JSON externo.
 * - Caso contrário, usa dados mockados (MVP).
 */

import { logger } from '../utils/logger';

export interface HashtagTrendItem {
  hashtag: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
}

export interface TrendSignalItem {
  type: 'HASHTAG' | 'SOUND' | 'VIDEO';
  value: string;
  category?: string;
  region?: string;
  growthPercent: number;
  source?: string;
}

interface ExternalPayload {
  data?: HashtagTrendItem[];
}

interface ExternalSignalPayload {
  data?: TrendSignalItem[];
}

export class TikTokCollectorService {
  async fetchTrends(limit = 20): Promise<HashtagTrendItem[]> {
    const sourceUrl = process.env.TIKTOK_TRENDS_URL;

    if (sourceUrl) {
      try {
        const response = await fetch(sourceUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0',
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = (await response.json()) as HashtagTrendItem[] | ExternalPayload;
        const list = Array.isArray(payload)
          ? payload
          : payload.data || [];

        return list.slice(0, limit);
      } catch (error) {
        logger.warn('⚠️ Falha ao buscar trends externas, usando mock', { error });
      }
    }

    return this.buildMockTrends(limit);
  }

  async fetchSignals(limit = 30): Promise<TrendSignalItem[]> {
    const sourceUrl = process.env.TIKTOK_TRENDS_URL;

    if (sourceUrl) {
      try {
        const response = await fetch(sourceUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0',
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = (await response.json()) as TrendSignalItem[] | ExternalSignalPayload | ExternalPayload;
        const list = Array.isArray(payload)
          ? payload
          : payload.data || [];

        const normalized = list.map((item) => this.toSignal(item));

        return normalized.slice(0, limit);
      } catch (error) {
        logger.warn('⚠️ Falha ao buscar signals externos, usando mock', { error });
      }
    }

    return this.buildMockSignals(limit);
  }

  private buildMockTrends(limit: number): HashtagTrendItem[] {
    const base = [
      'tiktokmademebuyit',
      'achadinhos',
      'viralproduct',
      'skincare',
      'gadgets',
      'modafeminina',
      'casaedecor',
      'fitness',
      'beleza',
      'petshop',
      'cozinha',
      'infantil',
      'ofertas',
      'trendalert',
      'produtoviral',
      'tiktokshop',
      'diy',
      'organização',
      'perfumaria',
      'presentes',
    ];

    const items = base.slice(0, limit).map((tag) => {
      const views = this.randomRange(80_000, 2_500_000);
      const likes = this.randomRange(6_000, 180_000);
      const comments = this.randomRange(500, 25_000);
      const shares = this.randomRange(400, 45_000);

      return {
        hashtag: tag,
        views,
        likes,
        comments,
        shares,
      };
    });

    return items;
  }

  private buildMockSignals(limit: number): TrendSignalItem[] {
    const hashtags = [
      'tiktokmademebuyit',
      'achadinhos',
      'viralproduct',
      'moda',
      'beleza',
      'fitness',
      'casaedecor',
      'cozinha',
      'petshop',
    ];

    const sounds = [
      'Som viral 01',
      'Som viral 02',
      'Som viral 03',
      'Som viral 04',
    ];

    const videos = [
      'Vídeo demo 01',
      'Vídeo demo 02',
      'Vídeo demo 03',
    ];

    const signals: TrendSignalItem[] = [];
    const max = Math.max(1, limit);

    for (let i = 0; i < max; i++) {
      const bucket = i % 3;
      if (bucket === 0) {
        signals.push({
          type: 'HASHTAG',
          value: `#${hashtags[i % hashtags.length]}`,
          category: 'Geral',
          region: 'BR',
          growthPercent: this.randomRange(12, 180),
          source: 'mock',
        });
      } else if (bucket === 1) {
        signals.push({
          type: 'SOUND',
          value: sounds[i % sounds.length],
          category: 'Sons',
          region: 'BR',
          growthPercent: this.randomRange(10, 140),
          source: 'mock',
        });
      } else {
        signals.push({
          type: 'VIDEO',
          value: videos[i % videos.length],
          category: 'Vídeos',
          region: 'BR',
          growthPercent: this.randomRange(8, 120),
          source: 'mock',
        });
      }
    }

    return signals.slice(0, limit);
  }

  private toSignal(item: HashtagTrendItem | TrendSignalItem): TrendSignalItem {
    if ('type' in item && 'value' in item && 'growthPercent' in item) {
      return item;
    }

    return {
      type: 'HASHTAG',
      value: `#${item.hashtag}`,
      category: 'Geral',
      region: 'BR',
      growthPercent: 0,
      source: 'external',
    };
  }

  private randomRange(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
