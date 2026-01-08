import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// GET /api/inventory/movements
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId') || undefined

    const movements = await prisma.inventoryMovement.findMany({
      where: {
        businessId: (admin as any).businessId,
        ...(productId ? { productId } : {})
      },
      include: {
        product: true,
        appointment: true,
        budget: true
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    })

    return NextResponse.json(movements)
  } catch (error) {
    console.error('Erro ao listar movimentações', error)
    return NextResponse.json({ error: 'Erro ao listar movimentações' }, { status: 500 })
  }
}

// POST /api/inventory/movements
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    const body = await request.json()
    const { productId, movementType, quantity, unitCost, note } = body

    if (!productId || !movementType || quantity === undefined) {
      return NextResponse.json({ error: 'productId, movementType e quantity são obrigatórios' }, { status: 400 })
    }

    const qty = Number(quantity)
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json({ error: 'Quantidade deve ser positiva' }, { status: 400 })
    }

    const product = await prisma.product.findFirst({ where: { id: productId, businessId: (admin as any).businessId } })
    if (!product) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })

    const isOutbound = movementType === 'MANUAL_OUT' || movementType === 'SERVICE_OUT'

    const result = await prisma.$transaction(async (tx) => {
      const newStock = isOutbound ? product.currentStock - qty : product.currentStock + qty
      if (newStock < 0) {
        throw new Error('Estoque insuficiente para realizar a saída')
      }

      const movement = await tx.inventoryMovement.create({
        data: {
          businessId: (admin as any).businessId,
          productId,
          movementType,
          quantity: qty,
          unitCost: unitCost ?? product.cost,
          note,
        }
      })

      await tx.product.update({
        where: { id: productId },
        data: { currentStock: newStock }
      })

      return movement
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    console.error('Erro ao registrar movimentação', error)
    const message = error?.message || 'Erro ao registrar movimentação'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
