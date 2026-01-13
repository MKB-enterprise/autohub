import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin, validateTenantAccess } from '@/lib/auth'

// GET /api/products
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    
    // ⚠️ Validar que token pertence a este tenant
    await validateTenantAccess(request, admin)
    
    const { searchParams } = new URL(request.url)
    const lowStock = searchParams.get('lowStock') === 'true'

    const where: any = { businessId: (admin as any).businessId }

    let products = await prisma.product.findMany({
      where,
      orderBy: { name: 'asc' }
    })

    if (lowStock) {
      products = products.filter(p => p.currentStock < p.minStock)
    }

    return NextResponse.json(products)
  } catch (error) {
    console.error('Erro ao listar produtos', error)
    return NextResponse.json({ error: 'Erro ao listar produtos' }, { status: 500 })
  }
}

// POST /api/products
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    
    // ⚠️ Validar que token pertence a este tenant
    await validateTenantAccess(request, admin)
    
    const body = await request.json()
    const { name, unit, cost, currentStock = 0, minStock = 0, sku } = body

    if (!name || cost === undefined) {
      return NextResponse.json({ error: 'Nome e custo são obrigatórios' }, { status: 400 })
    }

    if (Number(cost) < 0) {
      return NextResponse.json({ error: 'Custo não pode ser negativo' }, { status: 400 })
    }

    const product = await prisma.product.create({
      data: {
        businessId: (admin as any).businessId,
        name,
        sku: sku || null,
        unit: unit || 'un',
        cost,
        currentStock: currentStock ?? 0,
        minStock: minStock ?? 0,
      }
    })

    if (currentStock && Number(currentStock) > 0) {
      await prisma.inventoryMovement.create({
        data: {
          businessId: (admin as any).businessId,
          productId: product.id,
          movementType: 'IN',
          quantity: currentStock,
          unitCost: cost,
          note: 'Saldo inicial',
        }
      })
    }

    return NextResponse.json(product, { status: 201 })
  } catch (error: any) {
    console.error('Erro ao criar produto', error)
    const message = error?.message?.includes('Unique constraint') ? 'SKU já existe' : 'Erro ao criar produto'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
