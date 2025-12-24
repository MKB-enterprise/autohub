import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// GET /api/customers/[id] - Buscar cliente com histórico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth()
    const isSelf = auth.customerId === params.id
    const isAdmin = auth.isAdmin

    console.log('=== GET /api/customers/[id] ===')
    console.log('Requested ID:', params.id)
    console.log('Auth customerId:', auth.customerId)
    console.log('Is Admin:', isAdmin)
    console.log('Is Self:', isSelf)

    const customer = await prisma.customer.findFirst({
      where: { id: params.id },
      include: {
        cars: true,
        // Retorna appointments para admin OU para o próprio cliente
        ...(isAdmin || isSelf
          ? {
              appointments: {
                include: {
                  car: true,
                  appointmentServices: {
                    include: {
                      service: true
                    }
                  }
                },
                orderBy: {
                  startDatetime: 'desc'
                }
              }
            }
          : {})
      }
    })

    console.log('Customer found:', !!customer)
    console.log('Appointments count:', customer?.appointments?.length)
    console.log('================================')

    if (!customer) {
      return NextResponse.json(
        { error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    return NextResponse.json(customer)
  } catch (error) {
    console.error('Erro ao buscar cliente:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erro ao buscar cliente' }, { status: 500 })
  }
}

// PATCH /api/customers/[id] - Atualizar cliente
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth()
    const isSelf = auth.customerId === params.id
    const isAdmin = auth.isAdmin

    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await request.json()
    const { name, phone, notes } = body

    if (phone) {
      const normalizedPhone = String(phone).replace(/\D/g, '')
      if (normalizedPhone.length < 10 || normalizedPhone.length > 11) {
        return NextResponse.json({ error: 'Telefone inválido' }, { status: 400 })
      }
      body.phone = normalizedPhone
    }

    const customer = await prisma.customer.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(notes !== undefined && { notes })
      },
      include: {
        cars: true
      }
    })

    return NextResponse.json(customer)
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erro ao atualizar cliente' }, { status: 500 })
  }
}

// PUT alias
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return PATCH(request, { params })
}

// DELETE /api/customers/[id] - Deletar cliente
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth()
    if (!auth.isAdmin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Verificar se tem agendamentos ativos
    const activeAppointments = await prisma.appointment.count({
      where: {
        customerId: params.id,
        status: {
          in: ['PENDING', 'CONFIRMED_BY_CLIENT', 'CONFIRMED', 'RESCHEDULED', 'IN_PROGRESS']
        }
      }
    })

    if (activeAppointments > 0) {
      return NextResponse.json(
        { error: 'Cliente possui agendamentos ativos' },
        { status: 400 }
      )
    }

    await prisma.customer.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao deletar cliente:', error)
    return NextResponse.json(
      { error: 'Erro ao deletar cliente' },
      { status: 500 }
    )
  }
}
