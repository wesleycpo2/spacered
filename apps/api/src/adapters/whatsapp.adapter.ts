/**
 * WHATSAPP ADAPTER (MOCK)
 * 
 * Envia mensagens para WhatsApp
 * Suporta provider real via Twilio ou modo mock
 */

import { logger } from '../utils/logger';
import twilio from 'twilio';

export interface WhatsAppMessage {
  phoneNumber: string;
  text: string;
}

export class WhatsAppAdapter {
  private provider: 'mock' | 'twilio';
  private accountSid: string | undefined;
  private authToken: string | undefined;
  private fromNumber: string | undefined;
  private defaultCountry: string;

  constructor() {
    this.provider = (process.env.WHATSAPP_PROVIDER || 'mock').toLowerCase() === 'twilio' ? 'twilio' : 'mock';
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_WHATSAPP_FROM;
    this.defaultCountry = process.env.WHATSAPP_DEFAULT_COUNTRY || '55';
  }

  /**
   * Envia mensagem via WhatsApp
   */
  async sendMessage(phoneNumber: string, text: string): Promise<boolean> {
    try {
      logger.info('📤 Enviando alerta via WhatsApp', {
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        messageLength: text.length,
      });

      if (this.provider === 'twilio') {
        if (!this.accountSid || !this.authToken || !this.fromNumber) {
          throw new Error('Credenciais Twilio ausentes');
        }

        const client = twilio(this.accountSid, this.authToken);
        const to = this.formatToE164(phoneNumber);

        await client.messages.create({
          from: this.normalizeTwilioFrom(this.fromNumber),
          to: `whatsapp:${to}`,
          body: text,
        });

        logger.success('✅ Alerta enviado via WhatsApp (Twilio)', {
          phoneNumber: this.maskPhoneNumber(phoneNumber),
        });

        return true;
      }

      // MOCK
      await this.mockDelay(500);

      // MOCK: Simula sucesso (em produção, chamar API real)
      logger.success('✅ Alerta enviado via WhatsApp', {
        phoneNumber: this.maskPhoneNumber(phoneNumber),
      });

      return true;
    } catch (error: any) {
      logger.error('❌ Erro ao enviar mensagem WhatsApp', {
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Formata mensagem para WhatsApp (sem HTML)
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
🔥 *PRODUTO VIRAL DETECTADO!*

📦 *${product.name}*
${product.niche ? `🎯 Nicho: ${product.niche}` : ''}

📊 *Métricas:*
• Score Viral: ${product.viralScore.toFixed(1)}/100
• Views: ${this.formatNumber(product.views)}
• Vendas Estimadas: ${product.sales}

🔗 ${product.productUrl}

⚡ Alerta gerado por TikTok Trend Alert
    `.trim();
  }

  private formatNumber(num: bigint | number): string {
    const n = Number(num);
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
  }

  private maskPhoneNumber(phone: string): string {
    return phone.replace(/(\d{2})\d+(\d{4})/, '$1****$2');
  }

  private formatToE164(phone: string): string {
    const digits = phone.replace(/\D+/g, '');
    if (digits.startsWith('0')) {
      return `+${digits.replace(/^0+/, '')}`;
    }
    if (phone.trim().startsWith('+')) {
      return `+${digits}`;
    }
    return `+${this.defaultCountry}${digits}`;
  }

  private normalizeTwilioFrom(from: string): string {
    if (from.startsWith('whatsapp:')) return from;
    if (from.trim().startsWith('+')) return `whatsapp:${from}`;
    return `whatsapp:+${from.replace(/\D+/g, '')}`;
  }

  private mockDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
