import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// GET /api/services/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin()
    const service = await prisma.service.findFirst({
      where: { id: params.id },
      include: {
        category: true
      }
    })

    if (!service) {
      return NextResponse.json(
        { error: 'Serviço não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(service)
  } catch (error) {
    console.error('Erro ao buscar serviço:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar serviço' },
      { status: 500 }
    )
  }
}

// PATCH /api/services/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin()
    const body = await request.json()
    const { name, description, durationMinutes, price, isActive, serviceGroup, categoryId } = body

    if (durationMinutes !== undefined && durationMinutes <= 0) {
      return NextResponse.json(
        { error: 'Duração deve ser maior que zero' },
        { status: 400 }
      )
    }

    if (price !== undefined && price <= 0) {
      return NextResponse.json(
        { error: 'Preço deve ser maior que zero' },
        { status: 400 }
      )
    }

    if (categoryId) {
      const categoryExists = await prisma.category.findUnique({ where: { id: categoryId } })
      if (!categoryExists) {
        return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 400 })
      }
    }

    const service = await prisma.service.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(durationMinutes && { durationMinutes }),
        ...(price && { price }),
        ...(isActive !== undefined && { isActive }),
        ...(serviceGroup !== undefined && { serviceGroup: serviceGroup || null }),
        ...(categoryId !== undefined && { categoryId: categoryId || null })
      },
      include: {
        category: true
      }
    })

    return NextResponse.json(service)
  } catch (error) {
    console.error('Erro ao atualizar serviço:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar serviço' },
      { status: 500 }
    )
  }
}

// DELETE /api/services/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()
    // Verificar se está sendo usado em agendamentos
    const appointmentServices = await prisma.appointmentService.count({
      where: {
        serviceId: params.id
      }
    })

    if (appointmentServices > 0) {
      // Ao invés de deletar, desativar o serviço
      const service = await prisma.service.update({
        where: { id: params.id },
        data: { isActive: false }
      })

      return NextResponse.json({
        message: 'Serviço desativado pois possui agendamentos associados',
        service
      })
    }

    await prisma.service.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao deletar serviço:', error)
    return NextResponse.json(
      { error: 'Erro ao deletar serviço' },
      { status: 500 }
    )
  }
}
