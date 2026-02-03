/**
 * ALERT PROCESSOR JOB
 * 
 * Job em background que:
 * 1. Busca produtos com viralScore alto
 * 2. Cria alertas para usuários elegíveis
 * 3. Envia notificações pelos canais
 * 
 * Este job pode ser executado via:
 * - Cron (node-cron, bull, agenda)
 * - Manualmente via endpoint
 * - Trigger externo
 */

import { prisma } from '../config/prisma';
import { AlertService } from '../services/alert.service';
import { NotificationService } from '../services/notification.service';
import { logger } from '../utils/logger';

export class AlertProcessorJob {
  private alertService: AlertService;
  private notificationService: NotificationService;

  constructor() {
    this.alertService = new AlertService();
    this.notificationService = new NotificationService();
  }

  /**
   * Executa o processamento completo
   * 
   * Fluxo:
   * 1. Busca produtos virais
   * 2. Cria alertas pendentes
   * 3. Envia notificações
   */
  async execute(): Promise<void> {
    const startTime = Date.now();

    logger.info('🚀 Iniciando processamento de alertas');

    try {
      // Etapa 1: Busca produtos virais
      const viralProducts = await this.findViralProducts();

      if (viralProducts.length === 0) {
        logger.info('ℹ️ Nenhum produto viral encontrado');
        return;
      }

      logger.info(`📦 ${viralProducts.length} produtos virais encontrados`);

      // Etapa 2: Cria alertas para cada produto
      const allAlertIds: string[] = [];

      for (const product of viralProducts) {
        const alertIds = await this.alertService.createAlertsForProduct({
          id: product.id,
          title: product.title,
          nicheId: product.nicheId,
          viralScore: product.viralScore,
          views: product.views,
          sales: product.sales,
          tiktokUrl: product.tiktokUrl,
          thumbnail: product.thumbnail,
        });

        allAlertIds.push(...alertIds);

        // Delay entre produtos
        await this.delay(100);
      }

      logger.info(`📝 Total de ${allAlertIds.length} alertas criados`);

      // Etapa 3: Envia notificações
      await this.sendPendingAlerts();

      // Estatísticas finais
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.success(`✅ Processamento concluído em ${duration}s`);
    } catch (error: any) {
      logger.error('❌ Erro no processamento de alertas', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Busca produtos com alto viralScore
   * 
   * Critérios:
   * - Status: VIRAL
   * - ViralScore >= 70
   * - Não enviou alerta recentemente (últimas 24h)
   */
  private async findViralProducts() {
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    const products = await prisma.product.findMany({
      where: {
        status: 'VIRAL',
        viralScore: { gte: 70 },
        isActive: true,
        // Produtos que não receberam alertas nas últimas 24h
        alerts: {
          none: {
            createdAt: { gte: yesterday },
          },
        },
      },
      orderBy: {
        viralScore: 'desc',
      },
      take: 50, // Limita a 50 produtos por execução
    });

    return products;
  }

  /**
   * Envia todos os alertas pendentes
   */
  private async sendPendingAlerts(): Promise<void> {
    logger.info('📤 Processando alertas pendentes');

    const pendingAlerts = await prisma.alert.findMany({
      where: {
        status: 'PENDING',
      },
      include: {
        user: {
          include: {
            notificationConfig: true,
            subscription: true,
          },
        },
        product: true,
      },
      take: 100, // Processa até 100 por vez
    });

    if (pendingAlerts.length === 0) {
      logger.info('ℹ️ Nenhum alerta pendente');
      return;
    }

    logger.info(`📊 ${pendingAlerts.length} alertas para enviar`);

    // Prepara payloads
    const payloads = pendingAlerts.map((alert) => {
      const config = alert.user.notificationConfig;
      const subscription = alert.user.subscription;

      return {
        alertId: alert.id,
        userId: alert.userId,
        channel: alert.channel,
        message: alert.message,
        chatId:
          subscription?.planType === 'PREMIUM'
            ? config?.telegramChatId || undefined
            : undefined,
        phoneNumber: config?.whatsappNumber || undefined,
      };
    });

    // Envia em lote
    const result = await this.notificationService.sendBatch(payloads);

    logger.success('📊 Envio concluído', result);
  }

  /**
   * Processa alertas falhados (retry)
   */
  async retryFailedAlerts(): Promise<void> {
    logger.info('🔄 Reprocessando alertas falhados');
    await this.notificationService.retryFailed(3);
  }

  /**
   * Limpa alertas antigos (manutenção)
   */
  async cleanupOldAlerts(daysOld: number = 30): Promise<void> {
    logger.info(`🧹 Limpando alertas com mais de ${daysOld} dias`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const deleted = await prisma.alert.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        status: { in: ['SENT', 'FAILED'] },
      },
    });

    logger.success(`🗑️ ${deleted.count} alertas removidos`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Função auxiliar para executar o job manualmente
 */
export async function runAlertProcessor() {
  const job = new AlertProcessorJob();
  await job.execute();
}
