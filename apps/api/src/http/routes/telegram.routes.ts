/**
 * TELEGRAM ROUTES
 *
 * Conexão do usuário com bot do Telegram
 */

import { FastifyInstance } from 'fastify';
import { NotificationChannel } from '@prisma/client';
import { requireAuth } from '../../middlewares/auth.middleware';
import { prisma } from '../../config/prisma';
import { TelegramAdapter } from '../../adapters/telegram.adapter';

export async function telegramRoutes(fastify: FastifyInstance) {
  // GET /me/telegram
  fastify.get(
    '/me/telegram',
    {
      onRequest: [requireAuth],
    },
    async (request, reply) => {
      const userId = request.user!.userId;

      const config = await prisma.notificationConfig.findUnique({
        where: { userId },
      });

      const enabled = config?.enabledChannels?.includes('TELEGRAM' as NotificationChannel) ?? false;

      return reply.send({
        success: true,
        data: {
          enabled,
          telegramChatId: config?.telegramChatId || null,
        },
      });
    }
  );

  // POST /me/telegram/connect
  fastify.post(
    '/me/telegram/connect',
    {
      onRequest: [requireAuth],
    },
    async (request, reply) => {
      const userId = request.user!.userId;
      const identifier = (request.body as { identifier?: string })?.identifier?.trim();

      if (!identifier) {
        return reply.status(400).send({
          success: false,
          message: 'Informe seu @username ou chat_id do Telegram.',
        });
      }

      let chatId: string | null = null;
      try {
        const adapter = new TelegramAdapter();
        chatId = await adapter.resolveChatId(identifier);
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: error?.message || 'Falha ao comunicar com Telegram.',
        });
      }

      if (!chatId) {
        return reply.status(400).send({
          success: false,
          message: 'Não foi possível localizar o chat. Envie /start para o bot ou adicione o bot no canal e tente novamente.',
        });
      }

      const existing = await prisma.notificationConfig.findUnique({
        where: { userId },
      });

      const enabledChannels = new Set(existing?.enabledChannels || []);
      enabledChannels.add('TELEGRAM');

      const data = {
        telegramChatId: chatId,
        enabledChannels: Array.from(enabledChannels),
      };

      const updated = existing
        ? await prisma.notificationConfig.update({
            where: { userId },
            data,
          })
        : await prisma.notificationConfig.create({
            data: {
              userId,
              ...data,
              maxAlertsPerDay: 50,
            },
          });

      return reply.send({
        success: true,
        data: {
          enabled: updated.enabledChannels.includes('TELEGRAM'),
          telegramChatId: updated.telegramChatId,
        },
      });
    }
  );

  // POST /me/telegram/disable
  fastify.post(
    '/me/telegram/disable',
    {
      onRequest: [requireAuth],
    },
    async (request, reply) => {
      const userId = request.user!.userId;

      const existing = await prisma.notificationConfig.findUnique({
        where: { userId },
      });

      if (!existing) {
        return reply.send({
          success: true,
          data: { enabled: false, telegramChatId: null },
        });
      }

      const enabledChannels = existing.enabledChannels.filter(
        (channel) => channel !== 'TELEGRAM'
      );

      const updated = await prisma.notificationConfig.update({
        where: { userId },
        data: {
          telegramChatId: null,
          enabledChannels,
        },
      });

      return reply.send({
        success: true,
        data: {
          enabled: updated.enabledChannels.includes('TELEGRAM'),
          telegramChatId: updated.telegramChatId,
        },
      });
    }
  );
}