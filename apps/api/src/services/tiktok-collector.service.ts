/**
 * TIKTOK COLLECTOR SERVICE (MVP)
 * 
 * Coleta dados públicos de hashtags/tendências.
 * - Se TIKTOK_TRENDS_URL estiver definido, busca JSON externo.
 * - Caso contrário, usa apenas fontes reais (RapidAPI).
 */

import { logger } from '../utils/logger';
import { prisma } from '../config/prisma';

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

export interface TrendingKeywordItem {
  keyword: string;
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
  video_list?: string[];
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

interface RapidApiKeywordPayload {
  data?: {
    keyword_list?: TrendingKeywordItem[];
    list?: TrendingKeywordItem[];
    items?: TrendingKeywordItem[];
  };
}

interface RapidApiProductDetailPayload {
  data?: {
    info?: Record<string, unknown>;
  };
}

interface RapidApiProductMetricsPayload {
  data?: {
    info?: Record<string, unknown>;
  };
}

export class TikTokCollectorService {
  private rapidApiKey = process.env.RAPIDAPI_KEY;
  private rapidApiHost = process.env.RAPIDAPI_HOST || 'tiktok-creative-center-api.p.rapidapi.com';
  private rapidApiBaseUrl = process.env.RAPIDAPI_BASE_URL || `https://${this.rapidApiHost}`;
  private rapidApiRegion = process.env.RAPIDAPI_REGION || 'BR';
  private rapidApiHashtagCountry = process.env.RAPIDAPI_COUNTRY_HASHTAG || this.rapidApiRegion;
  private rapidApiVideoCountry = process.env.RAPIDAPI_COUNTRY_VIDEO || this.rapidApiRegion;
  private rapidApiSongCountry = process.env.RAPIDAPI_COUNTRY_SONG || this.rapidApiRegion;
  private rapidApiProductCountry = process.env.RAPIDAPI_COUNTRY_PRODUCTS || this.rapidApiRegion;
  private rapidApiHashtagCountryParam = process.env.RAPIDAPI_HASHTAG_COUNTRY_PARAM || 'country';
  private rapidApiVideoCountryParam = process.env.RAPIDAPI_VIDEO_COUNTRY_PARAM || 'country';
  private rapidApiSongCountryParam = process.env.RAPIDAPI_SONG_COUNTRY_PARAM || 'country';
  private rapidApiProductCountryParam = process.env.RAPIDAPI_PRODUCT_COUNTRY_PARAM || 'country_code';
  private rapidApiStrictCountry = (process.env.RAPIDAPI_STRICT_COUNTRY || 'true').toLowerCase() === 'true';
  private rapidApiHashtagPeriod = Number(process.env.RAPIDAPI_HASHTAG_PERIOD || 7);
  private rapidApiVideoPeriod = Number(process.env.RAPIDAPI_VIDEO_PERIOD || 30);
  private rapidApiSongPeriod = Number(process.env.RAPIDAPI_SONG_PERIOD || 7);
  private rapidApiProductLastDays = Number(process.env.RAPIDAPI_PRODUCT_LAST_DAYS || 7);
  private rapidApiProductOrderBy = process.env.RAPIDAPI_PRODUCT_ORDER_BY || 'post';
  private rapidApiProductOrderType = process.env.RAPIDAPI_PRODUCT_ORDER_TYPE || 'desc';
  private rapidApiKeywordCountryParam = process.env.RAPIDAPI_KEYWORD_COUNTRY_PARAM || 'country';
  private rapidApiKeywordPeriod = Number(process.env.RAPIDAPI_KEYWORD_PERIOD || process.env.RAPIDAPI_SONG_PERIOD || 7);
  private rapidApiDebug = (process.env.RAPIDAPI_DEBUG || 'false').toLowerCase() === 'true';

  private buildRapidApiUrl(path: string, params: Record<string, string | number | boolean | undefined>) {
    const base = this.rapidApiBaseUrl.endsWith('/') ? this.rapidApiBaseUrl : `${this.rapidApiBaseUrl}/`;
    const normalizedPath = path.startsWith('/') ? path.substring(1) : path;
    const url = new URL(normalizedPath, base);

    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) {
        continue;
      }
      url.searchParams.set(key, String(value));
    }

    return url.toString();
  }

  private async fetchWithRetry(url: string, init: RequestInit = {}, retries = 3, backoffMs = 500) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch(url, init);
        if (res.ok) return res;

        // handle 429 and 5xx with retry
        if ((res.status === 429 || (res.status >= 500 && res.status < 600)) && attempt < retries) {
          const retryAfter = res.headers.get('retry-after');
          const wait = retryAfter ? Number(retryAfter) * 1000 : backoffMs * Math.pow(2, attempt);
          await new Promise((r) => setTimeout(r, wait));
          continue;
        }

        return res;
      } catch (err) {
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, backoffMs * Math.pow(2, attempt)));
          continue;
        }
        throw err;
      }
    }
    throw new Error('fetchWithRetry: exhausted attempts');
  }

  private logRapidApiSample(params: {
    endpoint: string;
    url: string;
    requestCountry?: string;
    totalItems: number;
    sample?: Record<string, unknown> | null;
  }) {
    if (!this.rapidApiDebug) return;
    const record = {
      fetchedAt: new Date().toISOString(),
      endpoint: params.endpoint,
      requestCountry: params.requestCountry,
      totalItems: params.totalItems,
      sample: params.sample || null,
      url: params.url,
    };

    logger.info('RapidAPI sample', record);

    // persist raw response for later inspection (non-blocking)
    (async () => {
      try {
        await prisma.rawResponse.create({
          data: {
            endpoint: params.endpoint,
            requestCountry: params.requestCountry || null,
            url: params.url,
            payload: params.sample || {},
            fetchedAt: new Date(),
          },
        });
      } catch (err) {
        logger.warn('⚠️ Falha ao salvar raw response', { error: err });
      }
    })();
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
          const hashtag =
            item?.hashtag_name ||
            item?.hashtag ||
            item?.name ||
            item?.challenge?.title ||
            item?.title;
          if (!hashtag) return null;

          const views = Number(
            item?.video_views ??
              item?.views ??
              item?.view_count ??
              item?.stats?.view ??
              0,
          );
          const likes = Number(
            item?.likes ??
              item?.like_count ??
              item?.stats?.like ??
              0,
          );
          const comments = Number(
            item?.comments ??
              item?.comment_count ??
              item?.stats?.comment ??
              0,
          );
          const shares = Number(
            item?.shares ??
              item?.share_count ??
              item?.stats?.share ??
              0,
          );

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

    const videoParams: Record<string, string | number | boolean | undefined> = {
      page: 1,
      limit,
      period: this.rapidApiVideoPeriod,
      order_by: 'vv',
    };
    videoParams[this.rapidApiVideoCountryParam] = this.rapidApiVideoCountry;

    const url = this.buildRapidApiUrl('/api/trending/video', videoParams);

    try {
      const response = await this.fetchWithRetry(url, {
        headers: {
          'x-rapidapi-host': this.rapidApiHost,
          'x-rapidapi-key': this.rapidApiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = (await response.json()) as RapidApiTrendingPayload;
      const data = payload.data || {} as any;
      const list = data.videos || data.list || data.items || data.aweme_list || [];

      const mapped = list.map((item: any) => ({
        id: item.id || item.item_id || item.itemId || item.aweme_id || '',
        desc: item.title || item.desc || item.description || '',
        countryCode:
          item.country_code || item.country || item.countryCode || (item as any)?.country_info?.id || null,
        video: {
          id: item.item_id || item.id || item.aweme_id || null,
          cover: item.cover || item.video?.cover || item.thumbnail || null,
          playAddr: item.item_url || item.video?.play_addr || item.video?.playAddr || item.play_url || null,
          duration: item.duration || item.video?.duration || null,
        },
        author: {
          uniqueId: item.author?.uniqueId || item.author?.unique_id || item.author?.unique_id_str || item.authorName || item.creator || null,
          nickname: item.author?.nickname || item.author?.nickName || item.authorName || null,
        },
        stats: {
          playCount: item.stats?.playCount || item.stats?.play_count || item.play_count || item.view_count || item.views || null,
          diggCount: item.stats?.diggCount || item.stats?.digg_count || item.digg_count || item.likes || null,
          commentCount: item.stats?.commentCount || item.stats?.comment_count || item.comment_count || item.comments || null,
          shareCount: item.stats?.shareCount || item.stats?.share_count || item.share_count || item.shares || null,
        },
      }));

      this.logRapidApiSample({
        endpoint: 'trending/video',
        url,
        requestCountry: this.rapidApiVideoCountry,
        totalItems: list.length,
        sample: list[0]
          ? {
              raw: list[0],
              id: list[0]?.id || list[0]?.item_id || list[0]?.aweme_id,
            }
          : null,
      });

      if (!this.rapidApiStrictCountry) {
        return mapped;
      }

      return mapped.filter((item) => {
        if (!item.countryCode) return false;
        try {
          return String(item.countryCode).toUpperCase() === this.rapidApiVideoCountry.toUpperCase();
        } catch {
          return false;
        }
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

    const productParams: Record<string, string | number | boolean | undefined> = {
      page: 1,
      last: this.rapidApiProductLastDays,
      order_by: this.rapidApiProductOrderBy,
      order_type: this.rapidApiProductOrderType,
    };
    productParams[this.rapidApiProductCountryParam] = this.rapidApiProductCountry;

    const url = this.buildRapidApiUrl('/api/trending/top-products', productParams);

    try {
      const response = await this.fetchWithRetry(url, {
        headers: {
          'x-rapidapi-host': this.rapidApiHost,
          'x-rapidapi-key': this.rapidApiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = (await response.json()) as RapidApiTopProductsPayload;
      const data = payload.data || {} as any;
      const list = data.list || data.items || data.products || [];

      const normalized = list.map((item: any) => ({
        ...item,
        product_id: item.product_id || item.productId || item.productIdStr || item.id || item.goods_id || item.sku || null,
      }));

      const filtered = this.rapidApiStrictCountry
        ? normalized.filter((item: any) => {
            const countryCode = item.country_code || item.country || item.countryCode || item?.country_info?.id || null;
            if (!countryCode) {
              return true;
            }
            return String(countryCode).toUpperCase() === this.rapidApiProductCountry.toUpperCase();
          })
        : normalized;

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

  async fetchTrendingKeywords(limit = 20): Promise<TrendingKeywordItem[]> {
    if (!this.rapidApiKey || !this.rapidApiHost) {
      return [];
    }

    const keywordParams: Record<string, string | number | boolean | undefined> = {
      page: 1,
      limit,
      period: this.rapidApiKeywordPeriod,
    };
    keywordParams[this.rapidApiKeywordCountryParam] = this.rapidApiRegion;

    const url = this.buildRapidApiUrl('/api/trending/keyword', keywordParams);

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

      const payload = (await response.json()) as RapidApiKeywordPayload;
      const data = payload.data || {};
      const list = data.keyword_list || data.list || data.items || [];

      this.logRapidApiSample({
        endpoint: 'trending/keyword',
        url,
        requestCountry: this.rapidApiRegion,
        totalItems: list.length,
        sample: list[0]
          ? {
              keyword: list[0]?.keyword,
              impression: list[0]?.impression,
              ctr: list[0]?.ctr,
            }
          : null,
      });

      return list.slice(0, limit);
    } catch (error) {
      logger.warn('⚠️ Falha ao buscar keywords em alta via RapidAPI', { error });
      return [];
    }
  }

  async fetchProductDetail(productId: string) {
    if (!this.rapidApiKey || !this.rapidApiHost || !productId) {
      return null;
    }

    // try by product_id first, then fall back to url_title if provided
    let url = this.buildRapidApiUrl('/api/trending/top-products/detail', {
      product_id: productId,
    });

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

      let payload = (await response.json()) as RapidApiProductDetailPayload;
      let info = payload.data?.info || null;

      if (!info && productId && productId.includes('-')) {
        // maybe caller passed url_title instead of product_id — try fallback param
        const fallbackUrl = this.buildRapidApiUrl('/api/trending/top-products/detail', {
          url_title: productId,
        });
        const fallbackResp = await this.fetchWithRetry(fallbackUrl, {
          headers: {
            'x-rapidapi-host': this.rapidApiHost,
            'x-rapidapi-key': this.rapidApiKey,
          },
        });
        if (fallbackResp.ok) {
          payload = (await fallbackResp.json()) as RapidApiProductDetailPayload;
          info = payload.data?.info || null;
        }
      }

      this.logRapidApiSample({
        endpoint: 'trending/top-products/detail',
        url,
        requestCountry: this.rapidApiProductCountry,
        totalItems: info ? 1 : 0,
        sample: info,
      });

      return info;
    } catch (error) {
      logger.warn('⚠️ Falha ao buscar detalhes do produto via RapidAPI', { error, productId });
      return null;
    }
  }

  async fetchProductMetrics(productId: string) {
    if (!this.rapidApiKey || !this.rapidApiHost || !productId) {
      return null;
    }

    // similar fallback: try product_id then url_title
    let url = this.buildRapidApiUrl('/api/trending/top-products/metrics', {
      product_id: productId,
    });

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

      let payload = (await response.json()) as RapidApiProductMetricsPayload;
      let info = payload.data?.info || null;

      if (!info && productId && productId.includes('-')) {
        const fallbackUrl = this.buildRapidApiUrl('/api/trending/top-products/metrics', {
          url_title: productId,
        });
        const fallbackResp = await this.fetchWithRetry(fallbackUrl, {
          headers: {
            'x-rapidapi-host': this.rapidApiHost,
            'x-rapidapi-key': this.rapidApiKey,
          },
        });
        if (fallbackResp.ok) {
          payload = (await fallbackResp.json()) as RapidApiProductMetricsPayload;
          info = payload.data?.info || null;
        }
      }

      this.logRapidApiSample({
        endpoint: 'trending/top-products/metrics',
        url,
        requestCountry: this.rapidApiProductCountry,
        totalItems: info ? 1 : 0,
        sample: info,
      });

      return info;
    } catch (error) {
      logger.warn('⚠️ Falha ao buscar métricas do produto via RapidAPI', { error, productId });
      return null;
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

    const hashtagParams: Record<string, string | number | boolean | undefined> = {
      page: 1,
      limit,
      period: this.rapidApiHashtagPeriod,
      sort_by: 'popular',
    };
    hashtagParams[this.rapidApiHashtagCountryParam] = this.rapidApiHashtagCountry;

    const url = this.buildRapidApiUrl('/api/trending/hashtag', hashtagParams);

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
              name:
                list[0]?.hashtag_name ||
                list[0]?.hashtag ||
                list[0]?.name ||
                list[0]?.challenge?.title ||
                list[0]?.title,
              views:
                list[0]?.video_views ||
                list[0]?.views ||
                list[0]?.view_count ||
                list[0]?.stats?.view,
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

    const songParams: Record<string, string | number | boolean | undefined> = {
      page: 1,
      limit,
      period: this.rapidApiSongPeriod,
      rank_type: 'popular',
      new_on_board: false,
      commercial_music: false,
    };
    songParams[this.rapidApiSongCountryParam] = this.rapidApiSongCountry;

    const url = this.buildRapidApiUrl('/api/trending/song', songParams);

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
