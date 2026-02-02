/**
 * SERVIDOR FASTIFY
 * 
 * Configuração e inicialização do servidor Fastify
 * com plugins e middlewares globais
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { routes } from './routes';
import { jwtConfig } from '../config/jwt';

export async function buildServer() {
  // Cria instância do Fastify
  const fastify = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'development' ? 'info' : 'error',
      transport: process.env.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
    },
  });

  // ========================================
  // PLUGINS GLOBAIS
  // ========================================

  // CORS - permite requisições do frontend
  await fastify.register(cors, {
    origin: true, // Em produção, especificar domínios permitidos
    credentials: true,
  });

  // JWT - autenticação com tokens
  await fastify.register(jwt, {
    secret: jwtConfig.accessToken.secret,
    sign: {
      expiresIn: jwtConfig.accessToken.expiresIn,
    },
  });

  // ========================================
  // HANDLER GLOBAL DE ERROS
  // ========================================

  fastify.setErrorHandler((error, request, reply) => {
    // Log do erro
    fastify.log.error(error);

    // Retorna erro formatado
    return reply.status(error.statusCode || 500).send({
      success: false,
      message: error.message || 'Erro interno do servidor',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    });
  });

  // ========================================
  // REGISTRA ROTAS
  // ========================================

  await fastify.register(routes);

  return fastify;
}
