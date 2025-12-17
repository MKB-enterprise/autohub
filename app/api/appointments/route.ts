import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { validateAppointmentSlot, calculateTotalPrice } from '@/lib/availability'
import { requireAdmin, requireAuth } from '@/lib/auth'

// GET /api/appointments - Listar agendamentos
export async function GET(request: NextRequest) {
  try {
    // Somente administradores podem listar todos os agendamentos
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const status = searchParams.get('status')

    console.log('GET appointments - Parâmetros:', { date, status })

    const where: any = {}

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
        startDatetime: 'asc'
      }
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

    console.log('Criando agendamento:', { customerId, carId, startDatetime, serviceIds })

    // Cliente não-admin só pode criar para si mesmo
    if (!user.isAdmin && customerId !== user.customerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
    const validation = await validateAppointmentSlot(start, serviceIds)
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
    const appointment = await prisma.appointment.create({
      data: {
        customerId,
        carId,
        startDatetime: start,
        endDatetime,
        status: 'PENDING',
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
