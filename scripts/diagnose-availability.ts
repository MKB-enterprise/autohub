import { PrismaClient } from '@prisma/client'
import { format } from 'date-fns'
import { utcToZonedTime } from 'date-fns-tz'

const prisma = new PrismaClient()

async function diagnose() {
  console.log('=== DIAGNÓSTICO DE DISPONIBILIDADE ===\n')

  // 1. Verificar configurações
  console.log('1️⃣  VERIFICANDO CONFIGURAÇÕES...')
  const businessSettings = await prisma.businessSettings.findMany({
    select: {
      id: true,
      businessId: true,
      maxCarsPerSlot: true,
      openingTimeWeekday: true,
      closingTimeWeekday: true,
      timezone: true,
      business: {
        select: {
          name: true,
          email: true
        }
      }
    }
  })

  if (businessSettings.length === 0) {
    console.log('❌ PROBLEMA: Nenhuma configuração de negócio encontrada!')
    
    const oldSettings = await prisma.settings.findFirst()
    if (oldSettings) {
      console.log('\n⚠️  Encontrada configuração antiga (Settings):')
      console.log(`   maxCarsPerSlot: ${oldSettings.maxCarsPerSlot}`)
      console.log(`   openingTimeWeekday: ${oldSettings.openingTimeWeekday}`)
      console.log(`   closingTimeWeekday: ${oldSettings.closingTimeWeekday}`)
      console.log(`   timezone: ${oldSettings.timezone}`)
    }
  } else {
    console.log(`✅ ${businessSettings.length} configuração(ões) encontrada(s):\n`)
    businessSettings.forEach((setting, idx) => {
      console.log(`   Negócio ${idx + 1}: ${setting.business.name} (${setting.business.email})`)
      console.log(`   - maxCarsPerSlot: ${setting.maxCarsPerSlot}`)
      console.log(`   - Horário: ${setting.openingTimeWeekday} - ${setting.closingTimeWeekday}`)
      console.log(`   - Timezone: ${setting.timezone}`)
      
      if (setting.maxCarsPerSlot === 0) {
        console.log(`   ⚠️  PROBLEMA: maxCarsPerSlot está em 0! Nenhum agendamento será aceito.`)
      }
      console.log()
    })
  }

  // 2. Verificar agendamentos ativos
  console.log('\n2️⃣  VERIFICANDO AGENDAMENTOS ATIVOS...')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const activeAppointments = await prisma.appointment.findMany({
    where: {
      startDatetime: {
        gte: today
      },
      status: {
        notIn: ['CANCELED', 'NO_SHOW']
      }
    },
    select: {
      id: true,
      startDatetime: true,
      endDatetime: true,
      status: true,
      businessId: true,
      customer: {
        select: {
          name: true
        }
      }
    },
    orderBy: {
      startDatetime: 'asc'
    },
    take: 20
  })

  console.log(`✅ ${activeAppointments.length} agendamento(s) ativo(s) a partir de hoje:\n`)
  
  if (activeAppointments.length > 0) {
    const timezone = businessSettings[0]?.timezone || 'America/Sao_Paulo'
    
    activeAppointments.forEach((apt, idx) => {
      const localStart = utcToZonedTime(apt.startDatetime, timezone)
      const localEnd = utcToZonedTime(apt.endDatetime, timezone)
      
      console.log(`   ${idx + 1}. ${apt.customer.name}`)
      console.log(`      ${format(localStart, 'dd/MM/yyyy HH:mm')} - ${format(localEnd, 'HH:mm')}`)
      console.log(`      Status: ${apt.status}`)
      console.log(`      BusinessId: ${apt.businessId || 'null'}`)
      console.log()
    })
  }

  // 3. Verificar agendamentos no passado que ainda não foram marcados como concluídos
  console.log('\n3️⃣  VERIFICANDO AGENDAMENTOS ANTIGOS NÃO FINALIZADOS...')
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  const oldPendingAppointments = await prisma.appointment.findMany({
    where: {
      startDatetime: {
        lt: yesterday
      },
      status: {
        in: ['PENDING', 'CONFIRMED']
      }
    },
    select: {
      id: true,
      startDatetime: true,
      status: true,
      customer: {
        select: {
          name: true
        }
      }
    },
    orderBy: {
      startDatetime: 'desc'
    },
    take: 10
  })

  if (oldPendingAppointments.length > 0) {
    console.log(`⚠️  ${oldPendingAppointments.length} agendamento(s) antigo(s) ainda pendente(s):\n`)
    const timezone = businessSettings[0]?.timezone || 'America/Sao_Paulo'
    
    oldPendingAppointments.forEach((apt, idx) => {
      const localStart = utcToZonedTime(apt.startDatetime, timezone)
      console.log(`   ${idx + 1}. ${apt.customer.name} - ${format(localStart, 'dd/MM/yyyy HH:mm')} (${apt.status})`)
    })
    console.log('\n   💡 Considere atualizar esses agendamentos para COMPLETED ou NO_SHOW')
  } else {
    console.log(`✅ Nenhum agendamento antigo pendente encontrado`)
  }

  // 4. Resumo de agendamentos por dia
  console.log('\n4️⃣  RESUMO DE AGENDAMENTOS POR DIA (próximos 7 dias)...')
  const next7Days = new Date(today)
  next7Days.setDate(next7Days.getDate() + 7)
  
  const upcomingAppointments = await prisma.appointment.findMany({
    where: {
      startDatetime: {
        gte: today,
        lt: next7Days
      },
      status: {
        notIn: ['CANCELED', 'NO_SHOW']
      }
    },
    select: {
      startDatetime: true,
      endDatetime: true
    },
    orderBy: {
      startDatetime: 'asc'
    }
  })

  const appointmentsByDay = new Map<string, number>()
  const timezone = businessSettings[0]?.timezone || 'America/Sao_Paulo'
  
  upcomingAppointments.forEach(apt => {
    const localStart = utcToZonedTime(apt.startDatetime, timezone)
    const dateKey = format(localStart, 'dd/MM/yyyy (EEE)')
    appointmentsByDay.set(dateKey, (appointmentsByDay.get(dateKey) || 0) + 1)
  })

  if (appointmentsByDay.size > 0) {
    appointmentsByDay.forEach((count, date) => {
      console.log(`   ${date}: ${count} agendamento(s)`)
    })
  } else {
    console.log(`   Nenhum agendamento nos próximos 7 dias`)
  }

  console.log('\n=== FIM DO DIAGNÓSTICO ===')
  
  await prisma.$disconnect()
}

diagnose().catch(console.error)
