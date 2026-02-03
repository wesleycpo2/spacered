/**
 * AI ANALYZER SERVICE (OpenAI)
 * 
 * Analisa sinais de tendências e retorna resumo acionável.
 */

import OpenAI from 'openai';
import { TrendSignal } from '@prisma/client';

export class AiAnalyzerService {
  private client?: OpenAI;
  private model: string;
  private provider: 'openai' | 'ollama';
  private ollamaUrl: string;

  constructor() {
    const useOllama = (process.env.AI_PROVIDER || '').toLowerCase() === 'ollama';

    this.provider = useOllama ? 'ollama' : 'openai';
    this.model = useOllama
      ? (process.env.OLLAMA_MODEL || 'phi3:mini')
      : (process.env.OPENAI_MODEL || 'gpt-4o-mini');

    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';

    if (this.provider === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY não configurada');
      }
      this.client = new OpenAI({ apiKey });
    }
  }

  async analyzeSignals(signals: TrendSignal[]) {
    const compact = signals.map((s) => ({
      type: s.type,
      value: s.value,
      category: s.category,
      region: s.region,
      growthPercent: s.growthPercent,
      collectedAt: s.collectedAt,
    }));

    const system =
      'Você é um analista de tendências do TikTok. Gere um resumo claro e acionável.';

    const user = `
Sinais (JSON):
${JSON.stringify(compact)}

Retorne:
1) Resumo geral (2-3 frases)
2) Top 3 oportunidades
3) Alertas/Riscos
`;

    if (this.provider === 'ollama') {
      return this.callOllama(system, user);
    }

    const response = await this.client!.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.3,
      max_tokens: 450,
    });

    return response.choices[0]?.message?.content || 'Sem resposta.';
  }

  private async callOllama(system: string, user: string): Promise<string> {
    const response = await fetch(`${this.ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt: `${system}\n\n${user}`,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: HTTP ${response.status}`);
    }

    const data = (await response.json()) as { response?: string };
    return data.response || 'Sem resposta.';
  }
}
