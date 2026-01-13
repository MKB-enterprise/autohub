import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin, validateTenantAccess } from '@/lib/auth'
import { resolveTenantFromRequest } from '@/lib/tenant-resolver'

// GET /api/products/[id]
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { context } = await resolveTenantFromRequest(request)
    const product = await prisma.product.findFirst({
      where: { id: params.id, businessId: context?.tenantId },
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
    await validateTenantAccess(request, admin)
    const body = await request.json()
    const { name, unit, cost, minStock, isActive } = body

    const { context } = await resolveTenantFromRequest(request)
    const businessId = context?.tenantId || (admin as any).businessId
    const existing = await prisma.product.findFirst({ where: { id: params.id, businessId } })
    if (!existing) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })

    const product = await prisma.product.update({
      where: { id: params.id, businessId },
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
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin()
    await validateTenantAccess(request, admin)
    const { context } = await resolveTenantFromRequest(request)
    const businessId = context?.tenantId || (admin as any).businessId

    const deleted = await prisma.product.delete({ where: { id: params.id, businessId } })
    if (!deleted) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro ao deletar produto', error)
    return NextResponse.json({ error: 'Erro ao deletar produto' }, { status: 500 })
  }
}
