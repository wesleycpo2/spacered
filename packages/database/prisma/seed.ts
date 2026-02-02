/**
 * SEED - NICHOS
 * 
 * Popula banco com nichos de exemplo para testes
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const NICHES = [
  {
    name: 'Beleza e Skincare',
    slug: 'beleza-skincare',
    description: 'Produtos de beleza, maquiagem e cuidados com a pele',
  },
  {
    name: 'Fitness e Wellness',
    slug: 'fitness-wellness',
    description: 'Suplementos, equipamentos de treino e produtos wellness',
  },
  {
    name: 'Tech Gadgets',
    slug: 'tech-gadgets',
    description: 'Gadgets tecnológicos, acessórios e eletrônicos',
  },
  {
    name: 'Moda e Acessórios',
    slug: 'moda-acessorios',
    description: 'Roupas, bolsas, joias e acessórios fashion',
  },
  {
    name: 'Casa e Decoração',
    slug: 'casa-decoracao',
    description: 'Itens de decoração, organização e utilidades domésticas',
  },
  {
    name: 'Pet Shop',
    slug: 'pet-shop',
    description: 'Produtos para animais de estimação',
  },
  {
    name: 'Infantil',
    slug: 'infantil',
    description: 'Brinquedos, roupas e produtos para bebês e crianças',
  },
  {
    name: 'Cozinha e Utensílios',
    slug: 'cozinha-utensilios',
    description: 'Utensílios de cozinha, gadgets culinários e receitas',
  },
  {
    name: 'Livros e Educação',
    slug: 'livros-educacao',
    description: 'Livros, cursos e materiais educacionais',
  },
  {
    name: 'Games e Entretenimento',
    slug: 'games-entretenimento',
    description: 'Jogos, consoles, acessórios e entretenimento digital',
  },
];

async function seed() {
  console.log('🌱 Seeding nichos...');

  for (const niche of NICHES) {
    const existing = await prisma.niche.findFirst({
      where: { name: niche.name },
    });

    if (!existing) {
      await prisma.niche.create({ data: niche });
      console.log(`✓ ${niche.name}`);
    } else {
      console.log(`⊘ ${niche.name} (já existe)`);
    }
  }

  console.log('✅ Seed concluído!');
}

seed()
  .catch((error: Error) => {
    console.error('❌ Erro no seed:', error);
    throw error;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
