/**
 * MIDDLEWARES DE AUTENTICAÇÃO E AUTORIZAÇÃO
 * 
 * Sistema de controle de acesso baseado em JWT + Planos de assinatura
 * Apenas planos BASE e PREMIUM são permitidos (sistema 100% pago)
 */

import { FastifyReply, FastifyRequest } from 'fastify';
import { PlanType } from '@prisma/client';
import { prisma } from '../config/prisma';

/**
 * REQUIRE AUTH
 * 
 * Valida JWT + carrega subscription + bloqueia se não estiver ACTIVE
 * Deve ser aplicado em TODAS as rotas privadas
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    // Valida JWT
    await request.jwtVerify();

    const { userId } = request.user as { userId: string; email: string };

    // Busca usuário + subscription
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        isActive: true,
        subscription: {
          select: {
            id: true,
            status: true,
            planType: true,
            maxAlertsPerDay: true,
            maxNiches: true,
            canAccessPremium: true,
          },
        },
      },
    });

    if (!user) {
      return reply.status(401).send({
        success: false,
        message: 'Usuário não encontrado',
      });
    }

    if (!user.isActive) {
      return reply.status(403).send({
        success: false,
        message: 'Usuário desativado',
      });
    }

    if (!user.subscription) {
      return reply.status(403).send({
        success: false,
        message: 'Nenhuma assinatura encontrada',
      });
    }

    // ⚠️ BLOQUEIO: Apenas assinaturas ACTIVE podem acessar
    if (user.subscription.status !== 'ACTIVE') {
      return reply.status(403).send({
        success: false,
        message: 'Assinatura inativa. Complete o pagamento para acessar.',
        subscriptionStatus: user.subscription.status,
      });
    }

    // Anexa dados completos no request
    request.user = {
      userId: user.id,
      email: user.email,
      subscription: user.subscription,
    };
  } catch (error) {
    return reply.status(401).send({
      success: false,
      message: 'Token inválido ou expirado',
    });
  }
}

/**
 * REQUIRE PLAN
 * 
 * Factory que retorna middleware validador de plano específico
 * Deve ser usado APÓS requireAuth
 * 
 * @param requiredPlan - "BASE" ou "PREMIUM"
 */
export function requirePlan(requiredPlan: PlanType) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user?.subscription) {
      return reply.status(401).send({
        success: false,
        message: 'Usuário não autenticado',
      });
    }

    const { planType } = request.user.subscription;

    // Se precisa de PREMIUM, bloqueia BASE
    if (requiredPlan === 'PREMIUM' && planType !== 'PREMIUM') {
      return reply.status(403).send({
        success: false,
        message: 'Esta funcionalidade é exclusiva para plano PREMIUM',
        currentPlan: planType,
        requiredPlan: 'PREMIUM',
      });
    }

    // BASE tem acesso a tudo que é BASE (PREMIUM também pode acessar)
    // Sem bloqueio adicional
  };
}
