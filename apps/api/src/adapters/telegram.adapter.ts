/**
 * TELEGRAM ADAPTER (MOCK)
 * 
 * Simula envio de mensagens para Telegram
 * Em produção, usar biblioteca como node-telegram-bot-api
 */

import { logger } from '../utils/logger';

export interface TelegramMessage {
  chatId: string;
  text: string;
  parseMode?: 'HTML' | 'Markdown';
}

export class TelegramAdapter {
  private botToken: string;
  private publicChannelId: string; // Canal público para plano BASIC

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || 'mock-bot-token';
    this.publicChannelId = process.env.TELEGRAM_PUBLIC_CHANNEL || 'mock-public-channel';
  }

  /**
   * Envia mensagem para canal público (BASIC)
   */
  async sendToPublicChannel(text: string): Promise<boolean> {
    try {
      logger.info('📤 Enviando alerta para canal público Telegram', {
        channel: this.publicChannelId,
        messageLength: text.length,
      });

      // MOCK: Simula delay de rede
      await this.mockDelay(300);

      // MOCK: Simula sucesso (em produção, chamar API real)
      logger.success('✅ Alerta enviado para canal público', {
        channel: this.publicChannelId,
      });

      return true;
    } catch (error: any) {
      logger.error('❌ Erro ao enviar para canal público', {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Envia mensagem privada para usuário PREMIUM
   */
  async sendPrivateMessage(chatId: string, text: string): Promise<boolean> {
    try {
      logger.info('📤 Enviando alerta privado via Telegram', {
        chatId,
        messageLength: text.length,
      });

      // MOCK: Simula delay de rede
      await this.mockDelay(300);

      // MOCK: Simula sucesso (em produção, chamar API real)
      logger.success('✅ Alerta privado enviado via Telegram', {
        chatId,
      });

      return true;
    } catch (error: any) {
      logger.error('❌ Erro ao enviar mensagem privada Telegram', {
        chatId,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Formata mensagem de alerta viral
   */
  formatAlertMessage(product: {
    name: string;
    viralScore: number;
    views: bigint;
    sales: number;
    productUrl: string;
    niche?: string;
  }): string {
    return `
🔥 <b>PRODUTO VIRAL DETECTADO!</b>

📦 <b>${product.name}</b>
${product.niche ? `🎯 Nicho: ${product.niche}` : ''}

📊 <b>Métricas:</b>
• Score Viral: ${product.viralScore.toFixed(1)}/100
• Views: ${this.formatNumber(product.views)}
• Vendas Estimadas: ${product.sales}

🔗 <a href="${product.productUrl}">Ver Produto</a>

⚡ Alerta gerado por TikTok Trend Alert
    `.trim();
  }

  private formatNumber(num: bigint | number): string {
    const n = Number(num);
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
  }

  private mockDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
