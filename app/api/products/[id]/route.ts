import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// GET /api/products/[id]
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        movements: { orderBy: { createdAt: 'desc' }, take: 10 }
      }
    })
    if (!product) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    return NextResponse.json(product)
  } catch (error) {
    console.error('Erro ao buscar produto', error)
    return NextResponse.json({ error: 'Erro ao buscar produto' }, { status: 500 })
  }
}

// PATCH /api/products/[id]
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin()
    const body = await request.json()
    const { name, unit, cost, minStock, isActive } = body

    const existing = await prisma.product.findFirst({ where: { id: params.id, businessId: (admin as any).businessId } })
    if (!existing) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })

    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        name,
        unit,
        cost,
        minStock,
        isActive,
      }
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error('Erro ao atualizar produto', error)
    return NextResponse.json({ error: 'Erro ao atualizar produto' }, { status: 500 })
  }
}

// DELETE /api/products/[id]
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const deleted = await prisma.product.delete({ where: { id: params.id } })
    if (!deleted) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro ao deletar produto', error)
    return NextResponse.json({ error: 'Erro ao deletar produto' }, { status: 500 })
  }
}
