import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// GET /api/categories/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin()
    const category = await prisma.category.findFirst({
      where: { id: params.id },
      include: {
        services: {
          orderBy: { name: 'asc' }
        }
      }
    })

    if (!category) {
      return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 })
    }

    return NextResponse.json(category)
  } catch (error) {
    console.error('Erro ao buscar categoria:', error)
    return NextResponse.json({ error: 'Erro ao buscar categoria' }, { status: 500 })
  }
}

// PATCH /api/categories/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin()
    const body = await request.json()
    const { name, description } = body

    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      return NextResponse.json({ error: 'Nome inválido' }, { status: 400 })
    }

    if (name) {
      const existing = await prisma.category.findFirst({
        where: { name, id: { not: params.id } }
      })
      if (existing) {
        return NextResponse.json({ error: 'Categoria já existe' }, { status: 409 })
      }
    }

    const category = await prisma.category.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null })
      }
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error('Erro ao atualizar categoria:', error)
    return NextResponse.json({ error: 'Erro ao atualizar categoria' }, { status: 500 })
  }
}

// DELETE /api/categories/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()
    const serviceCount = await prisma.service.count({ where: { categoryId: params.id } })
    if (serviceCount > 0) {
      return NextResponse.json(
        { error: 'Não é possível excluir uma categoria com serviços associados' },
        { status: 400 }
      )
    }

    await prisma.category.delete({ where: { id: params.id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao deletar categoria:', error)
    return NextResponse.json({ error: 'Erro ao deletar categoria' }, { status: 500 })
  }
}
