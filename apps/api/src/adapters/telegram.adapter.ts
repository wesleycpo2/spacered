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
  private channelId?: string; // Canal privado de assinantes
  private provider: 'mock' | 'bot-api';

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || 'mock-bot-token';
    this.publicChannelId = process.env.TELEGRAM_PUBLIC_CHANNEL || 'mock-public-channel';
    this.channelId = process.env.TELEGRAM_CHANNEL_ID;
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

  async resolveChatId(identifier: string): Promise<string | null> {
    const trimmed = identifier.trim();
    if (!trimmed) return null;

    if (/^-?\d+$/.test(trimmed)) {
      return trimmed;
    }

    const normalized = trimmed
      .replace(/^https?:\/\/t\.me\//i, '')
      .replace(/^t\.me\//i, '')
      .replace(/^@/, '')
      .trim();

    if (!normalized) return null;

    const updates = await this.getUpdates();

    for (const update of updates) {
      const message = update.message || update.channel_post || update.edited_message;
      if (!message) continue;

      const fromUsername = message.from?.username;
      const chatUsername = message.chat?.username;

      if (fromUsername && fromUsername.toLowerCase() === normalized.toLowerCase()) {
        return String(message.chat?.id);
      }

      if (chatUsername && chatUsername.toLowerCase() === normalized.toLowerCase()) {
        return String(message.chat?.id);
      }
    }

    const directChatId = await this.getChatIdByUsername(normalized);
    if (directChatId) return directChatId;

    return null;
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
    thumbnail?: string | null;
    growth48h?: number;
    saturationLabel?: 'Baixa' | 'Média' | 'Alta';
    engagementLabel?: 'Alto' | 'Médio' | 'Baixo';
    probability?: number;
  }): string {
    const growth = typeof product.growth48h === 'number' ? `${product.growth48h}% (48h)` : 'n/d';
    const saturation = product.saturationLabel || 'n/d';
    const engagement = product.engagementLabel || 'n/d';
    const probability = typeof product.probability === 'number' ? `${product.probability}%` : 'n/d';

    return `
🚨🔥📈 <b>PRODUTO EM ALTA</b>

<b>Produto:</b> ${product.name}
${product.niche ? `<b>Nicho:</b> ${product.niche}` : ''}

<b>Crescimento:</b> ${growth}
<b>Saturação:</b> ${saturation}
<b>Engajamento:</b> ${engagement}
<b>Probabilidade de alta na semana:</b> ${probability}

<b>Score de tendência:</b> ${product.viralScore.toFixed(1)}/100
<b>Views:</b> ${this.formatNumber(product.views)}
<b>Vendas estimadas:</b> ${product.sales}

🔗 <a href="${product.productUrl}">Ver produto</a>
${product.thumbnail ? `🖼️ <a href="${product.thumbnail}">Print do vídeo</a>` : ''}

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

  private async getUpdates(): Promise<any[]> {
    if (!this.botToken || this.botToken === 'mock-bot-token') {
      throw new Error('TELEGRAM_BOT_TOKEN ausente');
    }

    const url = `https://api.telegram.org/bot${this.botToken}/getUpdates?limit=100&allowed_updates=message,channel_post,edited_message`;
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Telegram API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return Array.isArray(data.result) ? data.result : [];
  }

  async createChannelInviteLink(params: {
    memberLimit?: number;
    expireSeconds?: number;
    name?: string;
  }): Promise<string> {
    if (!this.botToken || this.botToken === 'mock-bot-token') {
      throw new Error('TELEGRAM_BOT_TOKEN ausente');
    }

    if (!this.channelId) {
      throw new Error('TELEGRAM_CHANNEL_ID ausente');
    }

    const now = Math.floor(Date.now() / 1000);
    const expireDate = params.expireSeconds ? now + params.expireSeconds : undefined;

    const payload = {
      chat_id: this.channelId,
      member_limit: params.memberLimit || 1,
      expire_date: expireDate,
      name: params.name,
    };

    const url = `https://api.telegram.org/bot${this.botToken}/createChatInviteLink`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Telegram API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const inviteLink = data?.result?.invite_link;
    if (!inviteLink) {
      throw new Error('Falha ao gerar invite_link');
    }

    return inviteLink;
  }

  async revokeChannelInviteLink(inviteLink: string): Promise<void> {
    if (!this.botToken || this.botToken === 'mock-bot-token') {
      throw new Error('TELEGRAM_BOT_TOKEN ausente');
    }

    if (!this.channelId) {
      throw new Error('TELEGRAM_CHANNEL_ID ausente');
    }

    const url = `https://api.telegram.org/bot${this.botToken}/revokeChatInviteLink`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: this.channelId, invite_link: inviteLink }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Telegram API error: ${response.status} ${errorText}`);
    }
  }

  private async getChatIdByUsername(username: string): Promise<string | null> {
    if (!this.botToken || this.botToken === 'mock-bot-token') {
      throw new Error('TELEGRAM_BOT_TOKEN ausente');
    }

    const url = `https://api.telegram.org/bot${this.botToken}/getChat?chat_id=@${encodeURIComponent(username)}`;
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }

    const data = await response.json().catch(() => null);
    const chatId = data?.result?.id;
    return chatId ? String(chatId) : null;
  }

  private mockDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
