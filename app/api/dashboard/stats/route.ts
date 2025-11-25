import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { startOfDay, endOfDay, subDays, startOfMonth } from 'date-fns'

export async function GET() {
  try {
    const today = new Date()
    const yesterday = subDays(today, 1)
    const startOfCurrentMonth = startOfMonth(today)

    // Agendamentos hoje
    const appointmentsToday = await prisma.appointment.count({
      where: {
        startDatetime: {
          gte: startOfDay(today),
          lte: endOfDay(today)
        },
        status: { not: 'CANCELED' }
      }
    })

    // Agendamentos ontem
    const appointmentsYesterday = await prisma.appointment.count({
      where: {
        startDatetime: {
          gte: startOfDay(yesterday),
          lte: endOfDay(yesterday)
        },
        status: { not: 'CANCELED' }
      }
    })

    // Total de clientes
    const totalClients = await prisma.customer.count()

    // Clientes novos este mês
    const clientsThisMonth = await prisma.customer.count({
      where: {
        createdAt: { gte: startOfCurrentMonth }
      }
    })

    // Crescimento de clientes (%)
    const clientsGrowth = totalClients > 0 ? Math.round((clientsThisMonth / totalClients) * 100) : 0

    // Carros em serviço (agendamentos em andamento)
    const carsInService = await prisma.appointment.count({
      where: {
        status: 'IN_PROGRESS'
      }
    })

    // Receita hoje
    const appointmentsTodayWithPrice = await prisma.appointment.findMany({
      where: {
        startDatetime: {
          gte: startOfDay(today),
          lte: endOfDay(today)
        },
        status: { in: ['COMPLETED', 'IN_PROGRESS'] }
      },
      select: { totalPrice: true }
    })

    const revenueToday = appointmentsTodayWithPrice.reduce(
      (sum: number, apt: { totalPrice: any }) => sum + Number(apt.totalPrice), 
      0
    )

    // Receita média diária (últimos 30 dias)
    const thirtyDaysAgo = subDays(today, 30)
    const appointmentsLast30Days = await prisma.appointment.findMany({
      where: {
        startDatetime: {
          gte: thirtyDaysAgo,
          lte: endOfDay(today)
        },
        status: { in: ['COMPLETED'] }
      },
      select: { totalPrice: true }
    })

    const totalRevenue30Days = appointmentsLast30Days.reduce(
      (sum: number, apt: { totalPrice: any }) => sum + Number(apt.totalPrice), 
      0
    )
    const averageDaily = totalRevenue30Days / 30

    // Percentual vs média
    const revenueAverage = averageDaily > 0 ? Math.round(((revenueToday - averageDaily) / averageDaily) * 100) : 0

    return NextResponse.json({
      appointmentsToday,
      appointmentsYesterday,
      totalClients,
      clientsGrowth,
      carsInService,
      revenueToday,
      revenueAverage
    })
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar estatísticas' },
      { status: 500 }
    )
  }
}
