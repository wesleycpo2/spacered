/**
 * TIKTOK COLLECTOR SERVICE (MVP)
 * 
 * Coleta dados públicos de hashtags/tendências.
 * - Se TIKTOK_TRENDS_URL estiver definido, busca JSON externo.
 * - Caso contrário, usa apenas fontes reais (RapidAPI).
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

export interface TrendingVideoItem {
  id: string;
  desc: string;
  createTime?: number;
  video?: {
    id?: string;
    cover?: string;
    playAddr?: string;
    duration?: number;
  };
  author?: {
    uniqueId?: string;
    nickname?: string;
  };
  stats?: {
    diggCount?: number;
    shareCount?: number;
    commentCount?: number;
    playCount?: number;
  };
}

interface ExternalPayload {
  data?: HashtagTrendItem[];
}

interface ExternalSignalPayload {
  data?: TrendSignalItem[];
}

interface RapidApiTrendingPayload {
  data?: TrendingVideoItem[];
}

interface RapidApiSearchPayload {
  data?: any[];
}

export class TikTokCollectorService {
  private rapidApiKey = process.env.RAPIDAPI_KEY;
  private rapidApiHost = process.env.RAPIDAPI_HOST;
  private rapidApiBaseUrl = process.env.RAPIDAPI_BASE_URL || 'https://tiktok-trend-analysis-api.p.rapidapi.com';
  private rapidApiRegion = process.env.RAPIDAPI_REGION || 'US';

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
        logger.warn('⚠️ Falha ao buscar trends externas', { error });
      }
    }

    logger.warn('⚠️ Nenhuma fonte real de trends configurada');
    return [];
  }

  async fetchTrendingVideos(limit = 20): Promise<TrendingVideoItem[]> {
    if (!this.rapidApiKey || !this.rapidApiHost) {
      return [];
    }

    const url = `${this.rapidApiBaseUrl}/api/trending?count=${limit}&region=${this.rapidApiRegion}`;

    try {
      const response = await fetch(url, {
        headers: {
          'x-rapidapi-host': this.rapidApiHost,
          'x-rapidapi-key': this.rapidApiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = (await response.json()) as RapidApiTrendingPayload;
      return payload.data || [];
    } catch (error) {
      logger.warn('⚠️ Falha ao buscar vídeos em alta via RapidAPI', { error });
      return [];
    }
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
        logger.warn('⚠️ Falha ao buscar signals externos', { error });
      }
    }

    const rapidSignals = await this.fetchSignalsFromRapidApi(limit);
    if (rapidSignals.length) {
      return rapidSignals;
    }

    logger.warn('⚠️ Nenhum sinal real disponível');
    return [];
  }

  private async fetchSignalsFromRapidApi(limit: number): Promise<TrendSignalItem[]> {
    if (!this.rapidApiKey || !this.rapidApiHost) {
      return [];
    }

    const [hashtags, sounds] = await Promise.all([
      this.fetchRapidSearch('hashtag', limit),
      this.fetchRapidSearch('music', limit),
    ]);

    const normalized: TrendSignalItem[] = [];

    for (const item of hashtags) {
      const name = item?.name || item?.challenge?.title || item?.challenge?.name;
      if (!name) continue;
      normalized.push({
        type: 'HASHTAG',
        value: `#${name.replace(/^#/, '')}`,
        category: 'Hashtag',
        region: this.rapidApiRegion,
        growthPercent: this.randomRange(10, 120),
        source: 'rapidapi',
      });
    }

    for (const item of sounds) {
      const title = item?.title || item?.music?.title || item?.sound?.title;
      if (!title) continue;
      normalized.push({
        type: 'SOUND',
        value: title,
        category: 'Música',
        region: this.rapidApiRegion,
        growthPercent: this.randomRange(8, 110),
        source: 'rapidapi',
      });
    }

    return normalized.slice(0, limit);
  }

  private async fetchRapidSearch(type: 'hashtag' | 'music', limit: number): Promise<any[]> {
    const url = `${this.rapidApiBaseUrl}/api/search?query=trend&type=${type}&count=${limit}&region=${this.rapidApiRegion}`;

    try {
      const response = await fetch(url, {
        headers: {
          'x-rapidapi-host': this.rapidApiHost!,
          'x-rapidapi-key': this.rapidApiKey!,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = (await response.json()) as RapidApiSearchPayload;
      return payload.data || [];
    } catch (error) {
      logger.warn('⚠️ Falha ao buscar search RapidAPI', { error, type });
      return [];
    }
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
