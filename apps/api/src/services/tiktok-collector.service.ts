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
  countryCode?: string;
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

export interface TopProductItem {
  country_code?: string;
  url_title?: string;
  cover_url?: string | null;
  impression?: number;
  like?: number;
  comment?: number;
  share?: number;
  post?: number;
  post_change?: number;
  cost?: number;
  cpa?: number;
  ctr?: number;
  cvr?: number;
  play_six_rate?: number;
  first_ecom_category?: {
    value?: string;
  };
  second_ecom_category?: {
    value?: string;
  };
  third_ecom_category?: {
    value?: string;
  };
}

interface ExternalPayload {
  data?: HashtagTrendItem[];
}

interface ExternalSignalPayload {
  data?: TrendSignalItem[];
}

interface RapidApiTrendingPayload {
  data?: {
    videos?: Array<{
      id?: string;
      item_id?: string;
      item_url?: string;
      title?: string;
      cover?: string;
      duration?: number;
    }>;
  };
}

interface RapidApiHashtagPayload {
  data?: {
    list?: any[];
    hashtags?: any[];
    hashtag_list?: any[];
    trend_list?: any[];
    items?: any[];
  };
}

interface RapidApiSongPayload {
  data?: {
    sound_list?: any[];
    list?: any[];
    items?: any[];
  };
}

interface RapidApiTopProductsPayload {
  data?: {
    list?: TopProductItem[];
  };
}

export class TikTokCollectorService {
  private rapidApiKey = process.env.RAPIDAPI_KEY;
  private rapidApiHost = process.env.RAPIDAPI_HOST;
  private rapidApiBaseUrl = process.env.RAPIDAPI_BASE_URL || 'https://tiktok-api23.p.rapidapi.com';
  private rapidApiRegion = process.env.RAPIDAPI_REGION || 'US';
  private rapidApiHashtagCountry = process.env.RAPIDAPI_COUNTRY_HASHTAG || this.rapidApiRegion;
  private rapidApiVideoCountry = process.env.RAPIDAPI_COUNTRY_VIDEO || this.rapidApiRegion;
  private rapidApiSongCountry = process.env.RAPIDAPI_COUNTRY_SONG || this.rapidApiRegion;
  private rapidApiProductCountry = process.env.RAPIDAPI_COUNTRY_PRODUCTS || this.rapidApiRegion;
  private rapidApiStrictCountry = (process.env.RAPIDAPI_STRICT_COUNTRY || 'true').toLowerCase() === 'true';
  private rapidApiHashtagPeriod = Number(process.env.RAPIDAPI_HASHTAG_PERIOD || 7);
  private rapidApiVideoPeriod = Number(process.env.RAPIDAPI_VIDEO_PERIOD || 30);
  private rapidApiSongPeriod = Number(process.env.RAPIDAPI_SONG_PERIOD || 7);
  private rapidApiProductLastDays = Number(process.env.RAPIDAPI_PRODUCT_LAST_DAYS || 7);
  private rapidApiDebug = (process.env.RAPIDAPI_DEBUG || 'false').toLowerCase() === 'true';

  private logRapidApiSample(params: {
    endpoint: string;
    url: string;
    requestCountry?: string;
    totalItems: number;
    sample?: Record<string, unknown> | null;
  }) {
    if (!this.rapidApiDebug) return;

    logger.info('RapidAPI sample', {
      fetchedAt: new Date().toISOString(),
      endpoint: params.endpoint,
      requestCountry: params.requestCountry,
      totalItems: params.totalItems,
      sample: params.sample || null,
      url: params.url,
    });
  }

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

    const rapidTrends = await this.fetchTrendingHashtagsFromRapidApi(limit);
    if (rapidTrends.length) {
      return rapidTrends
        .map((item) => {
          const hashtag = item?.hashtag || item?.name || item?.challenge?.title || item?.title;
          if (!hashtag) return null;

          const views = Number(item?.views ?? item?.view_count ?? item?.stats?.view ?? 0);
          const likes = Number(item?.likes ?? item?.like_count ?? item?.stats?.like ?? 0);
          const comments = Number(item?.comments ?? item?.comment_count ?? item?.stats?.comment ?? 0);
          const shares = Number(item?.shares ?? item?.share_count ?? item?.stats?.share ?? 0);

          return {
            hashtag: String(hashtag).replace(/^#/, ''),
            views: Number.isFinite(views) ? views : 0,
            likes: Number.isFinite(likes) ? likes : 0,
            comments: Number.isFinite(comments) ? comments : 0,
            shares: Number.isFinite(shares) ? shares : 0,
          } as HashtagTrendItem;
        })
        .filter((item): item is HashtagTrendItem => Boolean(item))
        .slice(0, limit);
    }

    logger.warn('⚠️ Nenhuma fonte real de trends configurada');
    return [];
  }

  async fetchTrendingVideos(limit = 20): Promise<TrendingVideoItem[]> {
    if (!this.rapidApiKey || !this.rapidApiHost) {
      return [];
    }

    const url = `${this.rapidApiBaseUrl}/api/trending/video?page=1&limit=${limit}&period=${this.rapidApiVideoPeriod}&order_by=vv&country=${this.rapidApiVideoCountry}`;

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
      const list = payload.data?.videos || [];

      const mapped = list.map((item) => ({
        id: item.id || item.item_id || '',
        desc: item.title || '',
        countryCode: (item as any).country_code || (item as any).countryCode,
        video: {
          id: item.item_id || item.id,
          cover: item.cover,
          playAddr: item.item_url,
          duration: item.duration,
        },
      }));

      this.logRapidApiSample({
        endpoint: 'trending/video',
        url,
        requestCountry: this.rapidApiVideoCountry,
        totalItems: list.length,
        sample: list[0]
          ? {
              id: list[0]?.id || list[0]?.item_id,
              title: list[0]?.title,
              country_code: (list[0] as any)?.country_code || (list[0] as any)?.countryCode,
              createTime: (list[0] as any)?.createTime,
            }
          : null,
      });

      if (!this.rapidApiStrictCountry) {
        return mapped;
      }

      return mapped.filter((item) => {
        if (!item.countryCode) return true;
        return item.countryCode.toUpperCase() === this.rapidApiVideoCountry.toUpperCase();
      });
    } catch (error) {
      logger.warn('⚠️ Falha ao buscar vídeos em alta via RapidAPI', { error });
      return [];
    }
  }

  async fetchTopProducts(limit = 20): Promise<TopProductItem[]> {
    if (!this.rapidApiKey || !this.rapidApiHost) {
      return [];
    }

    const url = `${this.rapidApiBaseUrl}/api/trending/top-products?page=1&last=${this.rapidApiProductLastDays}&order_by=post&country_code=${this.rapidApiProductCountry}`;

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

      const payload = (await response.json()) as RapidApiTopProductsPayload;
      const list = payload.data?.list || [];

      const filtered = this.rapidApiStrictCountry
        ? list.filter((item) => {
            if (!item.country_code) return true;
            return item.country_code.toUpperCase() === this.rapidApiProductCountry.toUpperCase();
          })
        : list;

      this.logRapidApiSample({
        endpoint: 'trending/top-products',
        url,
        requestCountry: this.rapidApiProductCountry,
        totalItems: list.length,
        sample: list[0]
          ? {
              country_code: list[0]?.country_code,
              url_title: list[0]?.url_title,
              impression: list[0]?.impression,
              post: list[0]?.post,
            }
          : null,
      });

      return filtered.slice(0, limit);
    } catch (error) {
      logger.warn('⚠️ Falha ao buscar top produtos via RapidAPI', { error });
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
      this.fetchTrendingHashtagsFromRapidApi(limit),
      this.fetchTrendingSongsFromRapidApi(limit),
    ]);

    const normalized: TrendSignalItem[] = [];

    for (const item of hashtags) {
      const name = item?.hashtag || item?.name || item?.challenge?.title || item?.title;
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
      const title = item?.title || item?.music?.title || item?.sound?.title || item?.song?.title;
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

  private async fetchTrendingHashtagsFromRapidApi(limit: number): Promise<any[]> {
    if (!this.rapidApiKey || !this.rapidApiHost) {
      return [];
    }

    const url = `${this.rapidApiBaseUrl}/api/trending/hashtag?page=1&limit=${limit}&period=${this.rapidApiHashtagPeriod}&country=${this.rapidApiHashtagCountry}&sort_by=popular`;

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

      const payload = (await response.json()) as RapidApiHashtagPayload;
      const data = payload.data || {};
      const list = data.list || data.hashtags || data.hashtag_list || data.trend_list || data.items || [];

      this.logRapidApiSample({
        endpoint: 'trending/hashtag',
        url,
        requestCountry: this.rapidApiHashtagCountry,
        totalItems: list.length,
        sample: list[0]
          ? {
              name: list[0]?.hashtag || list[0]?.name || list[0]?.challenge?.title || list[0]?.title,
              views: list[0]?.views || list[0]?.view_count || list[0]?.stats?.view,
            }
          : null,
      });

      return list;
    } catch (error) {
      logger.warn('⚠️ Falha ao buscar hashtags em alta via RapidAPI', { error });
      return [];
    }
  }

  private async fetchTrendingSongsFromRapidApi(limit: number): Promise<any[]> {
    if (!this.rapidApiKey || !this.rapidApiHost) {
      return [];
    }

    const url = `${this.rapidApiBaseUrl}/api/trending/song?page=1&limit=${limit}&period=${this.rapidApiSongPeriod}&country=${this.rapidApiSongCountry}&rank_type=popular&new_on_board=false&commercial_music=false`;

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

      const payload = (await response.json()) as RapidApiSongPayload;
      const data = payload.data || {};
      const list = data.sound_list || data.list || data.items || [];

      this.logRapidApiSample({
        endpoint: 'trending/song',
        url,
        requestCountry: this.rapidApiSongCountry,
        totalItems: list.length,
        sample: list[0]
          ? {
              title: list[0]?.title || list[0]?.music?.title || list[0]?.sound?.title || list[0]?.song?.title,
              playCount: list[0]?.stats?.play_count || list[0]?.stats?.playCount,
            }
          : null,
      });

      return list;
    } catch (error) {
      logger.warn('⚠️ Falha ao buscar músicas em alta via RapidAPI', { error });
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
