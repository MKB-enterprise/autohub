import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/customers/[id] - Buscar cliente com histórico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        cars: true,
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
    })

    if (!customer) {
      return NextResponse.json(
        { error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(customer)
  } catch (error) {
    console.error('Erro ao buscar cliente:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar cliente' },
      { status: 500 }
    )
  }
}

// PATCH /api/customers/[id] - Atualizar cliente
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { name, phone, notes } = body

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
    return NextResponse.json(
      { error: 'Erro ao atualizar cliente' },
      { status: 500 }
    )
  }
}

// DELETE /api/customers/[id] - Deletar cliente
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
