/**
 * API: Produto (detalhe) com suporte a diluição
 * PATCH/DELETE /api/products-dilution/:id
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

async function ensureOwnership(id: string, businessId: string) {
  const product = await prisma.product.findUnique({ where: { id }, select: { businessId: true } })
  return product?.businessId === businessId
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const businessId = req.headers.get('x-business-id')
    if (!businessId) {
      return NextResponse.json({ error: 'Business ID não fornecido' }, { status: 400 })
    }

    const id = params.id
    if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const allowed = await ensureOwnership(id, businessId)
    if (!allowed) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })

    const body = await req.json()
    const {
      categoryId,
      name,
      brand,
      sku,
      isConcentrated,
      baseUnit,
      packageSizeMl,
      costTotal,
      stockMinMl,
      isActive,
    } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Nome do produto é obrigatório' }, { status: 400 })
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        categoryId: categoryId || null,
        name: name.trim(),
        brand: brand?.trim() || null,
        sku: sku?.trim() || null,
        isConcentrated: isConcentrated ?? false,
        baseUnit: baseUnit || 'ml',
        packageSizeMl: packageSizeMl ?? 0,
        costTotal: costTotal ?? 0,
        stockMinMl: stockMinMl ?? 0,
        isActive: isActive ?? true,
        // legados
        unit: baseUnit || 'ml',
        cost: costTotal ?? 0,
      },
      include: { category: true },
    })

    return NextResponse.json({ product })
  } catch (error: any) {
    console.error('Erro ao atualizar produto:', error)
    return NextResponse.json({ error: error?.message || 'Erro ao atualizar produto' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const businessId = req.headers.get('x-business-id')
    if (!businessId) {
      return NextResponse.json({ error: 'Business ID não fornecido' }, { status: 400 })
    }

    const id = params.id
    if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const allowed = await ensureOwnership(id, businessId)
    if (!allowed) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })

    // Regra simples: permitir delete apenas se não houver receitas ou templates
    const ref = await prisma.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: { dilutionRecipes: true, usageTemplates: true, executionUsages: true },
        },
      },
    })

    if (!ref) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })

    const totalRefs = (ref._count?.dilutionRecipes || 0) + (ref._count?.usageTemplates || 0) + (ref._count?.executionUsages || 0)
    if (totalRefs > 0) {
      return NextResponse.json({ error: 'Produto já utilizado; desative ao invés de excluir.' }, { status: 409 })
    }

    await prisma.product.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('Erro ao deletar produto:', error)
    return NextResponse.json({ error: error?.message || 'Erro ao deletar produto' }, { status: 500 })
  }
}
