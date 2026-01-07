import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fix() {
  console.log('🔧 Corrigindo maxCarsPerSlot...\n')

  // Atualizar BusinessSettings
  const result = await prisma.businessSettings.updateMany({
    where: {
      maxCarsPerSlot: {
        lt: 2 // menor que 2
      }
    },
    data: {
      maxCarsPerSlot: 3
    }
  })

  console.log(`✅ ${result.count} configuração(ões) atualizada(s) para maxCarsPerSlot = 3`)

  // Verificar
  const updated = await prisma.businessSettings.findMany({
    select: {
      businessId: true,
      maxCarsPerSlot: true
    }
  })

  console.log('\n📋 Configurações atualizadas:')
  updated.forEach(s => {
    console.log(`   Business ${s.businessId}: maxCarsPerSlot = ${s.maxCarsPerSlot}`)
  })

  await prisma.$disconnect()
}

fix().catch(console.error)
