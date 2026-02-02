/**
 * EXTENSÃO DOS TIPOS DO FASTIFY
 * 
 * Adiciona propriedades customizadas ao Request do Fastify
 * para incluir dados do usuário autenticado
 */

import { PlanType, SubscriptionStatus, PrismaClient } from '@prisma/client';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }

  interface FastifyRequest {
    user?: {
      userId: string;
      email: string;
      subscription: {
        id: string;
        status: SubscriptionStatus;
        planType: PlanType;
        maxAlertsPerDay: number;
        maxNiches: number;
        canAccessPremium: boolean;
      };
    };
  }
}

// Payload do JWT
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      userId: string;
      email: string;
    };
    user: {
      userId: string;
      email: string;
    };
  }
}
