/**
 * API: Detalhe do Template de Consumo
 * PATCH/DELETE /api/service-product-templates/:id
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const businessId = req.headers.get('x-business-id')
    if (!businessId) {
      return NextResponse.json({ error: 'Business ID não fornecido' }, { status: 400 })
    }

    const id = params.id
    if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const owns = await ensureOwnership(id, businessId)
    if (!owns) return NextResponse.json({ error: 'Template não encontrado' }, { status: 404 })

    const body = await req.json()

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

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const businessId = req.headers.get('x-business-id')
    if (!businessId) {
      return NextResponse.json({ error: 'Business ID não fornecido' }, { status: 400 })
    }

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
