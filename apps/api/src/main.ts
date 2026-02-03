/// <reference types="./types" />

/**
 * MAIN - PONTO DE ENTRADA DA API
 * 
 * Inicializa o servidor Fastify e conecta ao banco de dados
 */

import 'dotenv/config';
import { buildServer } from './http/server';
import { prisma } from './config/prisma';
import { startAutoCollector } from './jobs/auto-collector.job';

async function start() {
  try {
    // Testa conexão com o banco de dados
    await prisma.$connect();
    console.log('✅ Conectado ao banco de dados');

    // Constrói o servidor
    const fastify = await buildServer();

    // Define a porta
    const PORT = Number(process.env.PORT) || 3333;
    const HOST = '0.0.0.0';

    // Inicia o servidor
    await fastify.listen({ port: PORT, host: HOST });

    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📚 Health check: http://localhost:${PORT}/health`);

    // Inicia coleta automática
    await startAutoCollector();
  } catch (error) {
    console.error('❌ Erro ao iniciar o servidor:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⏳ Encerrando servidor...');
  await prisma.$disconnect();
  console.log('✅ Desconectado do banco de dados');
  process.exit(0);
});

// Inicia a aplicação
start();
