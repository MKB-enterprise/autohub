/**
 * API: Detalhe do Template de Consumo
 * PATCH/DELETE /api/service-product-templates/:id
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin, validateTenantAccess } from '@/lib/auth'
import { resolveTenantFromRequest } from '@/lib/tenant-resolver'

async function ensureOwnership(id: string, businessId: string) {
  const template = await prisma.serviceProductUsageTemplate.findUnique({
    where: { id },
    select: { businessId: true }
  })
  if (!template || template.businessId !== businessId) {
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
    if (!owns) return NextResponse.json({ error: 'Template não encontrado' }, { status: 404 })

    const body = await request.json()

    const template = await prisma.serviceProductUsageTemplate.update({
      where: { id },
      data: {
        ...(body.quantityMl !== undefined && { quantityMl: Number(body.quantityMl) }),
        ...(body.vehicleType !== undefined && { vehicleType: body.vehicleType }),
      },
      include: {
        service: { select: { id: true, name: true } },
        recipe: { 
          select: { 
            id: true, 
            name: true, 
            ratioProduct: true,
            ratioWater: true,
            product: { select: { id: true, name: true } }
          } 
        },
      },
    })

    return NextResponse.json({ template })
  } catch (error: any) {
    console.error('Erro ao atualizar template:', error)
    return NextResponse.json({ error: error?.message || 'Erro ao atualizar template' }, { status: 500 })
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
    if (!owns) return NextResponse.json({ error: 'Template não encontrado' }, { status: 404 })

    await prisma.serviceProductUsageTemplate.delete({
      where: { id }
    })

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('Erro ao deletar template:', error)
    return NextResponse.json({ error: error?.message || 'Erro ao deletar template' }, { status: 500 })
  }
}
