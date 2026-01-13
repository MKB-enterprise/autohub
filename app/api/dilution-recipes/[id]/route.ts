/**
 * API: Detalhe da Receita de Diluição
 * PATCH/DELETE /api/dilution-recipes/:id
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { updateDilutionRecipe, deleteDilutionRecipe } from '@/lib/services/dilution-service'
import { requireAdmin, validateTenantAccess } from '@/lib/auth'
import { resolveTenantFromRequest } from '@/lib/tenant-resolver'

async function ensureOwnership(id: string, businessId: string) {
  const recipe = await prisma.dilutionRecipe.findUnique({ where: { id }, select: { businessId: true }})
  if (!recipe || recipe.businessId !== businessId) {
    return false
  }
  return true
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    await validateTenantAccess(request, admin);
    const { context } = await resolveTenantFromRequest(request);
    if (!context) {
      return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 400 })
    }
    const businessId: string = context.tenantId;

    const id = params.id
    if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const owns = await ensureOwnership(id, businessId)
    if (!owns) return NextResponse.json({ error: 'Receita não encontrada' }, { status: 404 })

    const body = await request.json()

    const updated = await updateDilutionRecipe(id, {
      name: body.name,
      ratioProduct: body.ratioProduct !== undefined ? Number(body.ratioProduct) : undefined,
      ratioWater: body.ratioWater !== undefined ? Number(body.ratioWater) : undefined,
      targetBottleMl: body.targetBottleMl !== undefined ? Number(body.targetBottleMl) : undefined,
      isActive: body.isActive,
    })

    return NextResponse.json({ recipe: updated })
  } catch (error: any) {
    console.error('Erro ao atualizar receita:', error)
    return NextResponse.json({ error: error?.message || 'Erro ao atualizar receita' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    await validateTenantAccess(request, admin);
    const { context } = await resolveTenantFromRequest(request);
    if (!context) {
      return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 400 })
    }
    const businessId: string = context.tenantId;

    const id = params.id
    if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const owns = await ensureOwnership(id, businessId)
    if (!owns) return NextResponse.json({ error: 'Receita não encontrada' }, { status: 404 })

    await deleteDilutionRecipe(id)
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('Erro ao deletar receita:', error)
    return NextResponse.json({ error: error?.message || 'Erro ao deletar receita' }, { status: 500 })
  }
}
