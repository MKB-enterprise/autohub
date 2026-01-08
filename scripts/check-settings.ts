import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function check() {
  console.log('🔍 Verificando configurações...\n')

  // Verificar BusinessSettings
  const businessSettings = await prisma.businessSettings.findMany()
  
  if (businessSettings.length > 0) {
    console.log('✅ BusinessSettings encontradas:')
    businessSettings.forEach((s, i) => {
      console.log(`\n📋 Configuração ${i + 1}:`)
      console.log(`   businessId: ${s.businessId}`)
      console.log(`   maxCarsPerSlot: ${s.maxCarsPerSlot} ${s.maxCarsPerSlot === 0 ? '⚠️  PROBLEMA!' : '✅'}`)
      console.log(`   Horário: ${s.openingTimeWeekday} - ${s.closingTimeWeekday}`)
      console.log(`   Timezone: ${s.timezone}`)
    })
  } else {
    console.log('⚠️  Nenhuma BusinessSettings encontrada')
  }

  // Verificar Settings (fallback antigo)
  const oldSettings = await prisma.settings.findFirst()
  if (oldSettings) {
    console.log('\n📋 Settings antiga (fallback):')
    console.log(`   maxCarsPerSlot: ${oldSettings.maxCarsPerSlot} ${oldSettings.maxCarsPerSlot === 0 ? '⚠️  PROBLEMA!' : '✅'}`)
    console.log(`   Horário: ${oldSettings.openingTimeWeekday} - ${oldSettings.closingTimeWeekday}`)
  }

  // Verificar agendamentos ativos
  const activeAppointments = await prisma.appointment.count({
    where: {
      status: {
        notIn: ['CANCELED', 'NO_SHOW']
      }
    }
  })
  console.log(`\n📊 Agendamentos ativos: ${activeAppointments}`)

  // Verificar agendamentos de hoje
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const todayAppointments = await prisma.appointment.findMany({
    where: {
      startDatetime: {
        gte: today,
        lt: tomorrow
      },
      status: {
        notIn: ['CANCELED', 'NO_SHOW']
      }
    },
    select: {
      startDatetime: true,
      endDatetime: true,
      customer: { select: { name: true } }
    }
  })

  console.log(`\n📅 Agendamentos de hoje: ${todayAppointments.length}`)
  todayAppointments.forEach((apt, i) => {
    console.log(`   ${i + 1}. ${apt.customer.name} - ${apt.startDatetime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} às ${apt.endDatetime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`)
  })

  await prisma.$disconnect()
}

check().catch(console.error)
