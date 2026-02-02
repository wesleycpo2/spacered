/**
 * CONFIGURAÇÃO DO PRISMA CLIENT
 * 
 * Singleton do Prisma Client para evitar múltiplas instâncias
 * em modo desenvolvimento (hot reload)
 */

import { PrismaClient } from '@prisma/client';

// Estende o tipo global do Node.js
declare global {
  var prisma: PrismaClient | undefined;
}

// Cria ou reutiliza a instância do Prisma
export const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Em desenvolvimento, armazena a instância globalmente
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
