import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// GET /api/cars/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth()
    const car = await prisma.car.findUnique({
      where: { id: params.id },
      include: {
        customer: true
      }
    })

    if (!car) {
      return NextResponse.json(
        { error: 'Carro não encontrado' },
        { status: 404 }
      )
    }

    if (!auth.isAdmin && car.customerId !== auth.customerId) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    return NextResponse.json(car)
  } catch (error) {
    console.error('Erro ao buscar carro:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erro ao buscar carro' }, { status: 500 })
  }
}

// PATCH /api/cars/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth()
    const body = await request.json()
    const { plate, model, color, notes, year, vehicleType } = body

    const existing = await prisma.car.findUnique({
      where: { id: params.id },
      select: { customerId: true }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Carro não encontrado' }, { status: 404 })
    }

    if (!auth.isAdmin && existing.customerId !== auth.customerId) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const car = await prisma.car.update({
      where: { id: params.id },
      data: {
        ...(plate && { plate }),
        ...(model && { model }),
        ...(color !== undefined && { color }),
        ...(notes !== undefined && { notes }),
        ...(year !== undefined && { year }),
        ...(vehicleType && { vehicleType })
      },
      include: {
        customer: true
      }
    })

    return NextResponse.json(car)
  } catch (error) {
    console.error('Erro ao atualizar carro:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erro ao atualizar carro' }, { status: 500 })
  }
}

// PUT /api/cars/[id] - Alias for PATCH
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return PATCH(request, { params })
}

// DELETE /api/cars/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth()
    const existing = await prisma.car.findUnique({
      where: { id: params.id },
      select: { customerId: true }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Carro não encontrado' }, { status: 404 })
    }

    if (!auth.isAdmin && existing.customerId !== auth.customerId) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Verificar se tem agendamentos
    const appointments = await prisma.appointment.count({
      where: {
        carId: params.id,
        status: {
          in: ['PENDING', 'CONFIRMED_BY_CLIENT', 'CONFIRMED', 'IN_PROGRESS']
        }
      }
    })

    if (appointments > 0) {
      return NextResponse.json(
        { error: 'Carro possui agendamentos ativos' },
        { status: 400 }
      )
    }

    await prisma.car.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao deletar carro:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erro ao deletar carro' }, { status: 500 })
  }
}
