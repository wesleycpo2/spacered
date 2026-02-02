/**
 * EXEMPLOS DE USO DOS MIDDLEWARES DE AUTORIZAÇÃO
 * 
 * Este arquivo demonstra como usar os middlewares requireAuth e requirePlan
 */

import { FastifyInstance } from 'fastify';
import { requireAuth, requirePlan } from '../../middlewares/auth.middleware';

export async function exampleRoutes(fastify: FastifyInstance) {
  
  // ============================================
  // PADRÃO 1: Rota para qualquer assinante
  // ============================================
  
  fastify.get('/products', {
    onRequest: [requireAuth] // Apenas valida JWT + subscription ACTIVE
  }, async (request, reply) => {
    // Qualquer usuário com subscription ACTIVE (BASE ou PREMIUM) acessa
    const { subscription } = request.user!;
    
    return reply.send({
      success: true,
      data: {
        products: [],
        userPlan: subscription.planType
      }
    });
  });

  // ============================================
  // PADRÃO 2: Rota exclusiva para PREMIUM
  // ============================================
  
  fastify.get('/analytics/trends', {
    onRequest: [
      requireAuth,              // 1º: Valida autenticação
      requirePlan('PREMIUM')    // 2º: Valida se é PREMIUM
    ]
  }, async (request, reply) => {
    // Apenas PREMIUM acessa
    return reply.send({
      success: true,
      data: {
        trends: [],
        message: 'Análise exclusiva PREMIUM'
      }
    });
  });

  // ============================================
  // PADRÃO 3: Rota com lógica condicional
  // ============================================
  
  fastify.get('/alerts/history', {
    onRequest: [requireAuth]
  }, async (request, reply) => {
    const { subscription } = request.user!;
    
    // BASE: últimos 30 dias
    // PREMIUM: histórico completo
    const daysLimit = subscription.planType === 'PREMIUM' ? 365 : 30;
    
    return reply.send({
      success: true,
      data: {
        alerts: [],
        daysLimit,
        plan: subscription.planType
      }
    });
  });

  // ============================================
  // PADRÃO 4: Rota BASE explícita (redundante)
  // ============================================
  
  fastify.post('/alerts/create', {
    onRequest: [
      requireAuth,
      requirePlan('BASE') // Na prática, BASE já passa por requireAuth
    ]
  }, async (request, reply) => {
    const { subscription } = request.user!;
    
    return reply.send({
      success: true,
      message: 'Alerta criado',
      limits: {
        maxAlertsPerDay: subscription.maxAlertsPerDay
      }
    });
  });
}
