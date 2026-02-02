/**
 * EXEMPLOS DE USO DO SISTEMA DE ALERTAS
 * 
 * Este arquivo demonstra como usar os serviços de alertas e notificações
 */

import { AlertService } from '../services/alert.service';
import { NotificationService } from '../services/notification.service';
import { AlertProcessorJob, runAlertProcessor } from '../jobs/alert-processor.job';
import { prisma } from '../config/prisma';

// ============================================
// EXEMPLO 1: Criar alerta para produto viral
// ============================================

async function example1_CreateAlertForProduct() {
  const alertService = new AlertService();

  // Simula produto viral detectado
  const product = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Mini Ventilador Portátil USB',
    nicheId: 'niche-tech-gadgets-id',
    viralScore: 85.5,
    views: BigInt(2_500_000),
    sales: 1200,
    productUrl: 'https://tiktok.com/shop/product/123',
  };

  // Cria alertas para todos usuários elegíveis
  const alertIds = await alertService.createAlertsForProduct(product);

  console.log(`✅ ${alertIds.length} alertas criados`);
  console.log('IDs:', alertIds);
}

// ============================================
// EXEMPLO 2: Enviar alertas pendentes
// ============================================

async function example2_SendPendingAlerts() {
  const notificationService = new NotificationService();

  // Busca alertas pendentes
  const pendingAlerts = await prisma.alert.findMany({
    where: { status: 'PENDING' },
    include: {
      user: {
        include: {
          notificationConfig: true,
          subscription: true,
        },
      },
    },
    take: 10,
  });

  // Prepara payloads
  const payloads = pendingAlerts.map((alert) => ({
    alertId: alert.id,
    userId: alert.userId,
    channel: alert.channel,
    message: alert.message,
    chatId: alert.user.notificationConfig?.telegramChatId || undefined,
    phoneNumber: alert.user.notificationConfig?.whatsappNumber || undefined,
  }));

  // Envia em lote
  const result = await notificationService.sendBatch(payloads);

  console.log('📊 Resultado:', result);
}

// ============================================
// EXEMPLO 3: Executar job completo
// ============================================

async function example3_RunFullJob() {
  // Método simples
  await runAlertProcessor();

  // OU instanciar manualmente
  const job = new AlertProcessorJob();
  await job.execute();
}

// ============================================
// EXEMPLO 4: Reprocessar alertas falhados
// ============================================

async function example4_RetryFailedAlerts() {
  const job = new AlertProcessorJob();
  await job.retryFailedAlerts();
}

// ============================================
// EXEMPLO 5: Obter estatísticas
// ============================================

async function example5_GetAlertStats() {
  const alertService = new AlertService();

  // Estatísticas globais
  const globalStats = await alertService.getAlertStats();
  console.log('📊 Estatísticas Globais:', globalStats);

  // Estatísticas de um usuário
  const userId = 'user-id-here';
  const userStats = await alertService.getAlertStats(userId);
  console.log('📊 Estatísticas do Usuário:', userStats);
}

// ============================================
// EXEMPLO 6: Fluxo completo manual
// ============================================

async function example6_ManualFlow() {
  const alertService = new AlertService();
  const notificationService = new NotificationService();

  // 1. Criar produto viral mockado
  const product = await prisma.product.create({
    data: {
      tiktokId: 'tt-mock-' + Date.now(),
      name: 'Produto Viral Teste',
      nicheId: 'niche-id-here',
      price: 29.9,
      productUrl: 'https://example.com/product',
      viralScore: 88.5,
      views: BigInt(3_000_000),
      likes: BigInt(150_000),
      comments: BigInt(5_000),
      shares: BigInt(20_000),
      sales: 2000,
      status: 'VIRAL',
    },
  });

  console.log('✅ Produto criado:', product.id);

  // 2. Criar alertas
  const alertIds = await alertService.createAlertsForProduct({
    id: product.id,
    name: product.name,
    nicheId: product.nicheId,
    viralScore: product.viralScore,
    views: product.views,
    sales: product.sales,
    productUrl: product.productUrl,
  });

  console.log(`✅ ${alertIds.length} alertas criados`);

  // 3. Buscar alertas pendentes
  const alerts = await prisma.alert.findMany({
    where: {
      id: { in: alertIds },
      status: 'PENDING',
    },
    include: {
      user: {
        include: {
          notificationConfig: true,
        },
      },
    },
  });

  // 4. Enviar notificações
  for (const alert of alerts) {
    const config = alert.user.notificationConfig;

    await notificationService.send({
      alertId: alert.id,
      userId: alert.userId,
      channel: alert.channel,
      message: alert.message,
      chatId: config?.telegramChatId || undefined,
      phoneNumber: config?.whatsappNumber || undefined,
    });
  }

  console.log('✅ Fluxo completo executado');
}

// ============================================
// EXEMPLO 7: Simulação de cenários
// ============================================

async function example7_SimulateScenarios() {
  console.log('📋 Cenário 1: Usuário BASIC recebe alerta geral');
  // BASE recebe todos produtos (sem filtro de nicho)
  // Canal: Telegram público

  console.log('📋 Cenário 2: Usuário PREMIUM recebe alerta de nicho');
  // PREMIUM recebe apenas produtos dos nichos escolhidos
  // Canal: Telegram privado ou WhatsApp

  console.log('📋 Cenário 3: Horário silencioso ativo');
  // Alerta não é enviado durante quietHours

  console.log('📋 Cenário 4: Score abaixo do mínimo');
  // Produto com viralScore < minViralScore não gera alerta
}

// Exporta exemplos
export {
  example1_CreateAlertForProduct,
  example2_SendPendingAlerts,
  example3_RunFullJob,
  example4_RetryFailedAlerts,
  example5_GetAlertStats,
  example6_ManualFlow,
  example7_SimulateScenarios,
};
