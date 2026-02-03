/**
 * TELEGRAM ADAPTER (MOCK)
 * 
 * Envia mensagens para Telegram
 * Suporta envio real via Bot API ou modo mock
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
  private provider: 'mock' | 'bot-api';

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || 'mock-bot-token';
    this.publicChannelId = process.env.TELEGRAM_PUBLIC_CHANNEL || 'mock-public-channel';
    this.provider = (process.env.TELEGRAM_PROVIDER || 'bot-api').toLowerCase() === 'mock' ? 'mock' : 'bot-api';
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

      if (this.provider === 'bot-api') {
        await this.sendTelegramMessage(this.publicChannelId, text, 'HTML');
      } else {
        // MOCK
        await this.mockDelay(300);
      }

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

      if (this.provider === 'bot-api') {
        await this.sendTelegramMessage(chatId, text, 'HTML');
      } else {
        // MOCK
        await this.mockDelay(300);
      }

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

  private async sendTelegramMessage(chatId: string, text: string, parseMode: 'HTML' | 'Markdown' = 'HTML'): Promise<void> {
    if (!this.botToken || this.botToken === 'mock-bot-token') {
      throw new Error('TELEGRAM_BOT_TOKEN ausente');
    }

    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
    const payload = {
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      disable_web_page_preview: false,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Telegram API error: ${response.status} ${errorText}`);
    }
  }

  private mockDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
