/**
 * WHATSAPP ADAPTER (MOCK)
 * 
 * Simula envio de mensagens para WhatsApp
 * Em produção, usar API como Twilio, Evolution API, ou Baileys
 */

import { logger } from '../utils/logger';

export interface WhatsAppMessage {
  phoneNumber: string;
  text: string;
}

export class WhatsAppAdapter {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.WHATSAPP_API_KEY || 'mock-api-key';
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

      // MOCK: Simula delay de rede
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

  private mockDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
