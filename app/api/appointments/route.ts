import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { validateAppointmentSlot, calculateTotalPrice } from '@/lib/availability'
import { requireAdmin, requireAuth } from '@/lib/auth'

// GET /api/appointments - Listar agendamentos
export async function GET(request: NextRequest) {
  try {
    // Somente administradores podem listar todos os agendamentos
    const auth = await requireAdmin()

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const status = searchParams.get('status')
    const q = searchParams.get('q')?.trim()
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined

    console.log('GET appointments - Parâmetros:', { date, status, limit })

    const where: any = { businessId: (auth as any).businessId }

    // Filtrar por data (dia completo)
    if (date) {
      // Parse da data no formato YYYY-MM-DD
      const [year, month, day] = date.split('-').map(Number)
      
      const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0)
      const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999)

      where.startDatetime = {
        gte: startOfDay,
        lte: endOfDay
      }

      console.log('Filtro de data:', { 
        dateParam: date,
        startOfDay: startOfDay.toISOString(), 
        endOfDay: endOfDay.toISOString() 
      })
    }

    // Filtrar por status
    if (status) {
      where.status = status
    }

    // Filtro por intervalo de data (histórico)
    if (from) {
      const start = new Date(from)
      if (!where.startDatetime) where.startDatetime = {}
      where.startDatetime.gte = start
    }

    if (to) {
      const end = new Date(to)
      end.setHours(23, 59, 59, 999)
      if (!where.startDatetime) where.startDatetime = {}
      where.startDatetime.lte = end
    }

    // Busca textual por cliente, veículo ou serviço
    if (q) {
      where.OR = [
        { customer: { name: { contains: q, mode: 'insensitive' } } },
        { customer: { phone: { contains: q, mode: 'insensitive' } } },
        { car: { model: { contains: q, mode: 'insensitive' } } },
        { car: { plate: { contains: q, mode: 'insensitive' } } },
        { car: { color: { contains: q, mode: 'insensitive' } } },
        { appointmentServices: { some: { service: { name: { contains: q, mode: 'insensitive' } } } } }
      ]
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        customer: true,
        car: true,
        appointmentServices: {
          include: {
            service: true
          }
        }
      },
      orderBy: {
        startDatetime: 'desc'
      },
      take: limit
    })

    console.log('Agendamentos encontrados:', appointments.length)
    if (appointments.length > 0) {
      console.log('Primeiro agendamento:', {
        id: appointments[0].id,
        startDatetime: appointments[0].startDatetime,
        customer: appointments[0].customer.name
      })
    }

    return NextResponse.json(appointments)
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar agendamentos' },
      { status: 500 }
    )
  }
}

// POST /api/appointments - Criar novo agendamento
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    const body = await request.json()
    const { customerId, carId, startDatetime, serviceIds, notes } = body

    console.log('Criando agendamento:', { customerId, carId, startDatetime, serviceIds, user })

    // Cliente não-admin só pode criar para si mesmo
    if (!user.isAdmin && customerId !== user.customerId) {
      console.log('Forbidden: customerId mismatch', { 
        requestCustomerId: customerId, 
        tokenCustomerId: user.customerId,
        isAdmin: user.isAdmin
      })
      return NextResponse.json({ error: 'Forbidden: Você só pode criar agendamentos para si mesmo' }, { status: 403 })
    }

    // Validações básicas
    if (!customerId || !carId || !startDatetime || !serviceIds || serviceIds.length === 0) {
      return NextResponse.json(
        { error: 'Campos obrigatórios faltando' },
        { status: 400 }
      )
    }

    const start = new Date(startDatetime)
    console.log('Data de início:', start)

    // Validar disponibilidade
    console.log('Validando disponibilidade...')
    const validation = await validateAppointmentSlot(start, serviceIds, undefined, (user as any).businessId)
    console.log('Resultado validação:', validation)
    
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // Buscar serviços e calcular totais
    const services = await prisma.service.findMany({
      where: {
        businessId: (user as any).businessId,
        id: { in: serviceIds },
        isActive: true
      }
    })

    if (services.length !== serviceIds.length) {
      return NextResponse.json(
        { error: 'Um ou mais serviços não encontrados ou inativos' },
        { status: 400 }
      )
    }

    const totalDuration = services.reduce((sum: number, s: any) => sum + s.durationMinutes, 0)
    const totalPrice = await calculateTotalPrice(serviceIds)

    const endDatetime = new Date(start)
    endDatetime.setMinutes(endDatetime.getMinutes() + totalDuration)

    // Criar agendamento com serviços
    const now = new Date()

    const appointment = await prisma.appointment.create({
      data: {
        businessId: (user as any).businessId,
        customerId,
        carId,
        startDatetime: start,
        endDatetime,
        status: 'CONFIRMED',
        confirmedByBusinessAt: now,
        totalPrice,
        notes,
        appointmentServices: {
          create: services.map((service: any) => ({
            serviceId: service.id,
            price: service.price
          }))
        }
      },
      include: {
        customer: true,
        car: true,
        appointmentServices: {
          include: {
            service: true
          }
        }
      }
    })

    return NextResponse.json(appointment, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar agendamento:', error)
    return NextResponse.json(
      { error: 'Erro ao criar agendamento' },
      { status: 500 }
    )
  }
}
