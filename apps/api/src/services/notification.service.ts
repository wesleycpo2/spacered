/**
 * NOTIFICATION SERVICE
 * 
 * Dispatcher responsável por enviar notificações pelos canais
 * e atualizar status dos alertas no banco
 */

import { NotificationChannel } from '@prisma/client';
import { prisma } from '../config/prisma';
import { TelegramAdapter } from '../adapters/telegram.adapter';
import { WhatsAppAdapter } from '../adapters/whatsapp.adapter';
import { logger } from '../utils/logger';

interface NotificationPayload {
  alertId: string;
  userId: string;
  channel: NotificationChannel;
  message: string;
  chatId?: string; // Telegram
  phoneNumber?: string; // WhatsApp
}

export class NotificationService {
  private telegramAdapter: TelegramAdapter;
  private whatsAppAdapter: WhatsAppAdapter;

  constructor() {
    this.telegramAdapter = new TelegramAdapter();
    this.whatsAppAdapter = new WhatsAppAdapter();
  }

  /**
   * Envia notificação e atualiza status do alerta
   */
  async send(payload: NotificationPayload): Promise<boolean> {
    const { alertId, channel, message, chatId, phoneNumber } = payload;

    try {
      let success = false;

      // Seleciona canal de envio
      switch (channel) {
        case 'TELEGRAM':
          if (chatId) {
            success = await this.telegramAdapter.sendPrivateMessage(chatId, message);
          } else {
            // Canal público para BASIC
            success = await this.telegramAdapter.sendToPublicChannel(message);
          }
          break;

        case 'WHATSAPP':
          if (!phoneNumber) {
            throw new Error('Número do WhatsApp não fornecido');
          }
          success = await this.whatsAppAdapter.sendMessage(phoneNumber, message);
          break;

        case 'EMAIL':
          // TODO: Implementar adapter de email
          logger.warn('⚠️ Email não implementado ainda', { alertId });
          success = false;
          break;

        default:
          throw new Error(`Canal não suportado: ${channel}`);
      }

      // Atualiza status do alerta
      if (success) {
        await this.markAsSent(alertId);
        logger.success('✅ Alerta enviado com sucesso', {
          alertId,
          channel,
        });
      } else {
        await this.markAsFailed(alertId, 'Falha no envio');
        logger.error('❌ Falha ao enviar alerta', {
          alertId,
          channel,
        });
      }

      return success;
    } catch (error: any) {
      logger.error('❌ Erro ao processar notificação', {
        alertId,
        error: error.message,
      });

      await this.markAsFailed(alertId, error.message);
      return false;
    }
  }

  /**
   * Envia múltiplas notificações em lote
   */
  async sendBatch(payloads: NotificationPayload[]): Promise<{
    sent: number;
    failed: number;
  }> {
    logger.info('📤 Enviando lote de notificações', {
      total: payloads.length,
    });

    let sent = 0;
    let failed = 0;

    for (const payload of payloads) {
      const success = await this.send(payload);
      if (success) {
        sent++;
      } else {
        failed++;
      }

      // Delay entre envios para evitar rate limit
      await this.delay(200);
    }

    logger.info('📊 Lote processado', { sent, failed });

    return { sent, failed };
  }

  /**
   * Marca alerta como enviado
   */
  private async markAsSent(alertId: string): Promise<void> {
    await prisma.alert.update({
      where: { id: alertId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    });
  }

  /**
   * Marca alerta como falho
   */
  private async markAsFailed(alertId: string, reason: string): Promise<void> {
    await prisma.alert.update({
      where: { id: alertId },
      data: {
        status: 'FAILED',
        failedReason: reason,
        retryCount: { increment: 1 },
      },
    });
  }

  /**
   * Reprocessa alertas falhados
   */
  async retryFailed(maxRetries: number = 3): Promise<void> {
    logger.info('🔄 Reprocessando alertas falhados');

    const failedAlerts = await prisma.alert.findMany({
      where: {
        status: 'FAILED',
        retryCount: { lt: maxRetries },
      },
      include: {
        user: {
          include: {
            notificationConfig: true,
          },
        },
        product: true,
      },
      take: 50, // Limita processamento
    });

    logger.info(`📊 Encontrados ${failedAlerts.length} alertas para retry`);

    for (const alert of failedAlerts) {
      const config = alert.user.notificationConfig;
      if (!config) continue;

      const payload: NotificationPayload = {
        alertId: alert.id,
        userId: alert.userId,
        channel: alert.channel,
        message: alert.message,
        chatId: config.telegramChatId || undefined,
        phoneNumber: config.whatsappNumber || undefined,
      };

      await this.send(payload);
      await this.delay(500); // Delay maior para retries
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
