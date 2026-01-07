/**
 * Script para fixar Business sem slug
 * Executa: npm run fix-slug
 */

import { prisma } from '../lib/db'

async function main() {
  console.log('🔧 Fixando Business sem slug...')

  // Buscar businesses sem slug
  const businessesWithoutSlug = await prisma.business.findMany({
    where: {
      slug: null
    }
  })

  if (businessesWithoutSlug.length === 0) {
    console.log('✅ Todos os businesses já possuem slug')
    return
  }

  console.log(`Encontrados ${businessesWithoutSlug.length} business(es) sem slug`)

  for (const business of businessesWithoutSlug) {
    // Gerar slug a partir do nome
    const slug =
      business.name
        ?.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '') || `business-${Date.now()}`

    console.log(`  Atualizando "${business.name}" → slug: "${slug}"`)

    await prisma.business.update({
      where: { id: business.id },
      data: { slug }
    })
  }

  console.log('✅ Sucesso! Todos os businesses agora possuem slug')
}

main()
  .catch(err => {
    console.error('❌ Erro:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
