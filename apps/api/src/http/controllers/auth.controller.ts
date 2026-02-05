/**
 * AUTH CONTROLLER
 * 
 * Controlador HTTP para endpoints de autenticação
 * Define as rotas: /auth/register, /auth/login, /auth/refresh
 */

import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AuthService } from '../../services/auth.service';

// Instância do serviço de autenticação
const authService = new AuthService();

/**
 * REGISTRO DE NOVO USUÁRIO
 * POST /auth/register
 */
export async function register(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Schema de validação com Zod
  const registerSchema = z.object({
    phone: z.string().min(8, 'Celular inválido'),
    email: z.string().email('Email inválido').optional(),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    name: z.string().optional(),
  });

  try {
    // Valida o body da requisição
    const { phone, email, password, name } = registerSchema.parse(request.body);

    // Chama o service para registrar
    const user = await authService.register({ phone, email, password, name });

    const tokens = authService.generateTokens(request.server, user.id, user.phone, user.email);

    // Retorna sucesso
    return reply.status(201).send({
      success: true,
      message: 'Usuário registrado com sucesso. Complete o pagamento para ativar sua assinatura.',
      data: {
        user,
        tokens,
      },
    });
  } catch (error: any) {
    // Tratamento de erros
    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        success: false,
        message: 'Dados inválidos',
        errors: error.errors,
      });
    }

    return reply.status(400).send({
      success: false,
      message: error.message || 'Erro ao registrar usuário',
    });
  }
}

/**
 * LOGIN DO USUÁRIO
 * POST /auth/login
 */
export async function login(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Schema de validação
  const loginSchema = z.object({
    phone: z.string().min(8, 'Celular inválido'),
    password: z.string().min(1, 'Senha é obrigatória'),
  });

  try {
    // Valida o body
    const { phone, password } = loginSchema.parse(request.body);

    // Autentica o usuário
    const user = await authService.login(phone, password);

    // Gera os tokens JWT
    const tokens = authService.generateTokens(request.server, user.id, user.phone, user.email);

    // Retorna tokens e dados do usuário
    return reply.status(200).send({
      success: true,
      message: 'Login realizado com sucesso',
      data: {
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          name: user.name,
          subscription: user.subscription,
        },
        tokens,
      },
    });
  } catch (error: any) {
    // Tratamento de erros
    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        success: false,
        message: 'Dados inválidos',
        errors: error.errors,
      });
    }

    return reply.status(401).send({
      success: false,
      message: error.message || 'Erro ao fazer login',
    });
  }
}

/**
 * REFRESH TOKEN
 * POST /auth/refresh
 */
export async function refreshToken(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Schema de validação
  const refreshSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token é obrigatório'),
  });

  try {
    // Valida o body
    const { refreshToken } = refreshSchema.parse(request.body);

    // Verifica o refresh token e gera novos tokens
    const newTokens = await authService.verifyRefreshToken(
      request.server,
      refreshToken
    );

    // Retorna novos tokens
    return reply.status(200).send({
      success: true,
      message: 'Token renovado com sucesso',
      data: newTokens,
    });
  } catch (error: any) {
    // Tratamento de erros
    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        success: false,
        message: 'Dados inválidos',
        errors: error.errors,
      });
    }

    return reply.status(401).send({
      success: false,
      message: error.message || 'Refresh token inválido',
    });
  }
}

/**
 * SET PASSWORD (PÓS-PAGAMENTO)
 * POST /auth/set-password
 */
export async function setPassword(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const schema = z.object({
    phone: z.string().min(8, 'Celular inválido'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    name: z.string().optional(),
    email: z.string().email('Email inválido').optional(),
    paymentMethod: z.string().optional(),
  });

  try {
    const { phone, password, name, email, paymentMethod } = schema.parse(request.body);
    const user = await authService.setPassword({ phone, password, name, email, paymentMethod });
    const tokens = authService.generateTokens(request.server, user.id, user.phone, user.email);

    return reply.status(200).send({
      success: true,
      message: 'Senha definida com sucesso',
      data: {
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          name: user.name,
          subscription: user.subscription,
        },
        tokens,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        success: false,
        message: 'Dados inválidos',
        errors: error.errors,
      });
    }

    return reply.status(400).send({
      success: false,
      message: error.message || 'Erro ao definir senha',
    });
  }
}
