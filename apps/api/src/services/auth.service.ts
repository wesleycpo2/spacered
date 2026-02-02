/**
 * AUTH SERVICE
 * 
 * Responsável pela lógica de negócio da autenticação:
 * - Registro de novos usuários
 * - Login e validação de senha
 * - Geração de tokens JWT (access e refresh)
 */

import bcrypt from 'bcrypt';
import { prisma } from '../config/prisma';
import { FastifyInstance } from 'fastify';

export class AuthService {
  /**
   * REGISTRO DE NOVO USUÁRIO
   * 
   * Cria um novo usuário e uma assinatura BASE com status PENDING
   * (usuário precisa ativar assinatura via pagamento)
   */
  async register(data: { email: string; password: string; name?: string }) {
    // Verifica se o email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error('Email já cadastrado');
    }

    // Hash da senha (salt = 10)
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Cria usuário + assinatura em uma transação
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        // Cria assinatura BASE com status PENDING
        subscription: {
          create: {
            planType: 'BASE',
            status: 'PENDING', // Aguardando confirmação de pagamento
            maxAlertsPerDay: 10,
            maxNiches: 3,
            canAccessPremium: false,
          },
        },
        // Cria configuração de notificação padrão
        notificationConfig: {
          create: {
            emailEnabled: true,
            minViralScore: 70.0,
            alertFrequency: 4,
            timezone: 'America/Sao_Paulo',
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        subscription: {
          select: {
            planType: true,
            status: true,
          },
        },
      },
    });

    return user;
  }

  /**
   * LOGIN DO USUÁRIO
   * 
   * Valida email e senha, retorna dados do usuário se válido
   */
  async login(email: string, password: string) {
    // Busca usuário com assinatura
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        subscription: true,
      },
    });

    // Verifica se usuário existe
    if (!user) {
      throw new Error('Credenciais inválidas');
    }

    // Verifica se a senha está correta
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      throw new Error('Credenciais inválidas');
    }

    // Verifica se o usuário está ativo
    if (!user.isActive) {
      throw new Error('Usuário desativado');
    }

    // Retorna dados (sem a senha)
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      subscription: user.subscription,
    };
  }

  /**
   * GERAR TOKENS JWT
   * 
   * Cria Access Token (curta duração) e Refresh Token (longa duração)
   */
  generateTokens(fastify: FastifyInstance, userId: string, email: string) {
    // Access Token (15 minutos)
    const accessToken = fastify.jwt.sign(
      { userId, email },
      { expiresIn: '15m' }
    );

    // Refresh Token (7 dias) - usa o mesmo secret por padrão
    // Para usar secret diferente, configurar no registro do plugin
    const refreshToken = fastify.jwt.sign(
      { userId, email },
      { expiresIn: '7d' }
    );

    return { accessToken, refreshToken };
  }

  /**
   * VERIFICAR REFRESH TOKEN
   * 
   * Valida o refresh token e retorna novo access token
   */
  async verifyRefreshToken(fastify: FastifyInstance, refreshToken: string) {
    try {
      // Verifica o refresh token
      const decoded = fastify.jwt.verify<{ userId: string; email: string }>(refreshToken);

      // Verifica se o usuário ainda existe e está ativo
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { subscription: true },
      });

      if (!user || !user.isActive) {
        throw new Error('Usuário inválido');
      }

      // Gera novos tokens
      return this.generateTokens(fastify, user.id, user.email);
    } catch (error) {
      throw new Error('Refresh token inválido');
    }
  }
}
