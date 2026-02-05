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
  async register(data: { phone: string; password: string; name?: string; email?: string | null }) {
    const trimmedPhone = data.phone.trim();
    const trimmedEmail = data.email?.trim() || null;

    // Verifica se o telefone já existe
    const existingByPhone = await prisma.user.findUnique({
      where: { phone: trimmedPhone } as any,
    });

    if (existingByPhone) {
      throw new Error('Celular já cadastrado');
    }

    if (trimmedEmail) {
      const existingByEmail = await prisma.user.findUnique({
        where: { email: trimmedEmail },
      });

      if (existingByEmail) {
        throw new Error('Email já cadastrado');
      }
    }

    // Hash da senha (salt = 10)
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Cria usuário + assinatura em uma transação
    const user = await prisma.user.create({
      data: {
        ...(trimmedEmail ? { email: trimmedEmail } : {}),
        phone: trimmedPhone,
        password: hashedPassword,
        name: data.name,
        // Cria assinatura BASE com status PENDING
        subscription: {
          create: {
            planType: 'BASE',
            status: 'PENDING', // Aguardando confirmação de pagamento
          },
        },
        // Cria configuração de notificação padrão
        notificationConfig: {
          create: {
            enabledChannels: [],
            maxAlertsPerDay: 50,
          },
        },
      } as any,
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        createdAt: true,
        subscription: {
          select: {
            planType: true,
            status: true,
          },
        },
      } as any,
    });

    return user;
  }

  /**
   * LOGIN DO USUÁRIO
   * 
   * Valida email e senha, retorna dados do usuário se válido
   */
  async login(phone: string, password: string) {
    // Busca usuário com assinatura
    const user = await prisma.user.findUnique({
      where: { phone: phone.trim() } as any,
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


    // Retorna dados (sem a senha)
    return {
      id: user.id,
      email: user.email,
      phone: (user as any).phone,
      name: user.name,
      subscription: (user as any).subscription,
    };
  }

  /**
   * DEFINIR SENHA (PÓS-PAGAMENTO)
   * 
   * Cria/atualiza usuário e ativa assinatura PREMIUM
   */
  async setPassword(data: { phone: string; password: string; name?: string; email?: string | null; paymentMethod?: string }) {
    const trimmedPhone = data.phone.trim();
    const trimmedEmail = data.email?.trim() || null;

    if (trimmedEmail) {
      const existingByEmail = await prisma.user.findUnique({
        where: { email: trimmedEmail } as any,
      });

        if (existingByEmail && (existingByEmail as any).phone !== trimmedPhone) {
        throw new Error('Email já cadastrado');
      }
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const existingUser = await prisma.user.findUnique({
      where: { phone: trimmedPhone } as any,
      include: { subscription: true },
    });

    let userId: string;

    if (existingUser) {
      const updated = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          password: hashedPassword,
          name: data.name || existingUser.name,
          ...(trimmedEmail ? { email: trimmedEmail } : {}),
        },
        select: { id: true },
      });
      userId = updated.id;
    } else {
      const created = (await prisma.user.create({
        data: {
          phone: trimmedPhone,
          ...(trimmedEmail ? { email: trimmedEmail } : {}),
          password: hashedPassword,
          name: data.name,
          notificationConfig: {
            create: {
              enabledChannels: [],
              maxAlertsPerDay: 50,
            },
          },
        } as any,
        select: { id: true } as any,
      })) as any;
      userId = created.id as string;
    }

    const periodStart = new Date();
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const subscription = await prisma.subscription.upsert({
      where: { userId },
      update: {
        status: 'ACTIVE',
        planType: 'PREMIUM',
        paymentMethod: data.paymentMethod,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
      create: {
        userId,
        status: 'ACTIVE',
        planType: 'PREMIUM',
        paymentMethod: data.paymentMethod,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    return {
      id: userId,
      email: (user as any)?.email || null,
      phone: (user as any)?.phone || trimmedPhone,
      name: (user as any)?.name || null,
      subscription,
    };
  }

  /**
   * GERAR TOKENS JWT
   * 
   * Cria Access Token (curta duração) e Refresh Token (longa duração)
   */
  generateTokens(fastify: FastifyInstance, userId: string, phone: string, email?: string | null) {
    // Access Token (15 minutos)
    const accessToken = fastify.jwt.sign(
      { userId, phone, email: email || null },
      { expiresIn: '15m' }
    );

    // Refresh Token (7 dias) - usa o mesmo secret por padrão
    // Para usar secret diferente, configurar no registro do plugin
    const refreshToken = fastify.jwt.sign(
      { userId, phone, email: email || null },
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
      const decoded = fastify.jwt.verify<{ userId: string; phone: string; email?: string | null }>(refreshToken);

      // Verifica se o usuário ainda existe e está ativo
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { subscription: true },
      });

      if (!user) {
        throw new Error('Usuário inválido');
      }

      // Gera novos tokens
      return this.generateTokens(fastify, user.id, (user as any).phone, user.email);
    } catch (error) {
      throw new Error('Refresh token inválido');
    }
  }
}
