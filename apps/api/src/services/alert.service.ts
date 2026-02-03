/**
 * ALERT SERVICE
 * 
 * Lógica de negócio para criação e distribuição de alertas
 * Decide quem deve receber alertas baseado em:
 * - Plano (BASE/PREMIUM)
 * - Nichos escolhidos
 * - Configurações de notificação
 */

import { NotificationChannel, PlanType } from '@prisma/client';
import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';
import { TelegramAdapter } from '../adapters/telegram.adapter';
import { WhatsAppAdapter } from '../adapters/whatsapp.adapter';

interface ProductData {
  id: string;
  title: string;
  nicheId: string;
  viralScore: number;
  views: bigint;
  sales: number;
  tiktokUrl: string;
}

export class AlertService {
  private telegramAdapter: TelegramAdapter;
  private whatsAppAdapter: WhatsAppAdapter;

  constructor() {
    this.telegramAdapter = new TelegramAdapter();
    this.whatsAppAdapter = new WhatsAppAdapter();
  }

  /**
   * Cria alertas para um produto viral
   * Retorna lista de alertas criados
   */
  async createAlertsForProduct(product: ProductData): Promise<string[]> {
    logger.info('🔔 Criando alertas para produto viral', {
      productId: product.id,
      productName: product.title,
      viralScore: product.viralScore,
    });

    // Busca niche do produto
    const niche = await prisma.niche.findUnique({
      where: { id: product.nicheId },
    });

    if (!niche) {
      logger.warn('⚠️ Nicho não encontrado', { nicheId: product.nicheId });
      return [];
    }

    // Busca usuários elegíveis
    const eligibleUsers = await this.findEligibleUsers(product, niche.id);

    logger.info(`📊 Usuários elegíveis encontrados: ${eligibleUsers.length}`);

    // Cria alertas
    const alertIds: string[] = [];

    for (const user of eligibleUsers) {
      try {
        const alertId = await this.createAlert(user, product, niche.name);
        alertIds.push(alertId);
      } catch (error: any) {
        logger.error('❌ Erro ao criar alerta', {
          userId: user.id,
          error: error.message,
        });
      }
    }

    logger.success(`✅ ${alertIds.length} alertas criados`);

    return alertIds;
  }

  /**
   * Encontra usuários que devem receber o alerta
   * 
   * Regras:
   * - BASE: recebe alertas gerais (sem filtro de nicho)
   * - PREMIUM: recebe apenas dos nichos escolhidos
   */
  private async findEligibleUsers(product: ProductData, nicheId: string) {
    // Busca todos usuários com subscription ACTIVE
    const users = await prisma.user.findMany({
      where: {
        subscription: {
          status: 'ACTIVE',
        },
      },
      include: {
        subscription: true,
        notificationConfig: true,
        niches: true,
      },
    });

    // Filtra usuários elegíveis
    const eligible = users.filter((user) => {
      if (!user.subscription || !user.notificationConfig) return false;

      const { subscription, notificationConfig } = user;

      // Verifica horário silencioso
      if (this.isQuietHours(notificationConfig)) {
        return false;
      }

      // REGRA: BASIC recebe alertas gerais (todos os produtos)
      if (subscription.planType === 'BASE') {
        return true;
      }

      // REGRA: PREMIUM recebe apenas dos nichos escolhidos
      if (subscription.planType === 'PREMIUM') {
        const hasNiche = user.niches.some((n) => n.id === nicheId);
        return hasNiche;
      }

      return false;
    });

    return eligible;
  }

  /**
   * Cria um alerta no banco de dados
   */
  private async createAlert(
    user: any,
    product: ProductData,
    nicheName: string
  ): Promise<string> {
    const config = user.notificationConfig!;
    const subscription = user.subscription!;

    // Define canal preferencial
    const channel = this.selectChannel(config, subscription.planType);

    // Formata mensagem
    const message = this.formatMessage(product, nicheName, channel);

    // Cria registro no banco
    const alert = await prisma.alert.create({
      data: {
        userId: user.id,
        productId: product.id,
        channel,
        status: 'PENDING',
        message,
      },
    });

    logger.info('📝 Alerta criado', {
      alertId: alert.id,
      userId: user.id,
      channel,
      planType: subscription.planType,
    });

    return alert.id;
  }

  /**
   * Seleciona canal de notificação baseado em preferências
   * 
   * BASE: sempre Telegram (canal público)
   * PREMIUM: respeita preferências (Telegram privado ou WhatsApp)
   */
  private selectChannel(
    config: any,
    planType: PlanType
  ): NotificationChannel {
    // BASE: sempre canal público Telegram
    if (planType === 'BASE') {
      return 'TELEGRAM';
    }

    // PREMIUM: verifica preferências
    if (config.whatsappEnabled && config.whatsappNumber) {
      return 'WHATSAPP';
    }

    if (config.telegramEnabled && config.telegramChatId) {
      return 'TELEGRAM';
    }

    // Fallback: Telegram
    return 'TELEGRAM';
  }

  /**
   * Formata mensagem do alerta
   */
  private formatMessage(
    product: ProductData,
    nicheName: string,
    channel: NotificationChannel
  ): string {
    const productData = {
      name: product.title,
      viralScore: product.viralScore,
      views: product.views,
      sales: product.sales,
      productUrl: product.tiktokUrl,
      niche: nicheName,
    };

    if (channel === 'WHATSAPP') {
      return this.whatsAppAdapter.formatAlertMessage(productData);
    }

    return this.telegramAdapter.formatAlertMessage(productData);
  }

  /**
   * Verifica se está em horário silencioso
   */
  private isQuietHours(config: any): boolean {
    if (!config.quietHoursStart || !config.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const currentHour = now.getHours();

    const start = config.quietHoursStart;
    const end = config.quietHoursEnd;

    // Horário normal (ex: 22h às 8h)
    if (start > end) {
      return currentHour >= start || currentHour < end;
    }

    // Horário simples (ex: 12h às 14h)
    return currentHour >= start && currentHour < end;
  }

  /**
   * Obtém estatísticas de alertas
   */
  async getAlertStats(userId?: string): Promise<any> {
    const where = userId ? { userId } : {};

    const [total, sent, failed, pending] = await Promise.all([
      prisma.alert.count({ where }),
      prisma.alert.count({ where: { ...where, status: 'SENT' } }),
      prisma.alert.count({ where: { ...where, status: 'FAILED' } }),
      prisma.alert.count({ where: { ...where, status: 'PENDING' } }),
    ]);

    return {
      total,
      sent,
      failed,
      pending,
      successRate: total > 0 ? ((sent / total) * 100).toFixed(2) + '%' : '0%',
    };
  }
}
