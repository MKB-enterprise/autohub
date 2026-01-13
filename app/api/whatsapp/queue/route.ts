import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin, validateTenantAccess } from '@/lib/auth'
import { assertWhatsAppAllowed } from '@/lib/plan'
import { resolveTenantFromRequest } from '@/lib/tenant-resolver'

// GET /api/whatsapp/queue
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    await validateTenantAccess(request, admin)
    const { context } = await resolveTenantFromRequest(request)
    if (!context) {
      return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 400 })
    }
    const businessId: string = context.tenantId

    const queue = await prisma.whatsAppMessageQueue.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: 50
    })
    return NextResponse.json(queue)
  } catch (error) {
    console.error('Erro ao listar fila WA', error)
    return NextResponse.json({ error: 'Erro ao listar fila' }, { status: 500 })
  }
}

// POST /api/whatsapp/queue
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    await validateTenantAccess(request, admin)
    const { context } = await resolveTenantFromRequest(request)
    if (!context) {
      return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 400 })
    }
    const businessId: string = context.tenantId

    await assertWhatsAppAllowed(businessId)

    const body = await request.json()
    const { customerId, phone, templateKey, payload, scheduledAt } = body

    if (!phone || !templateKey) {
      return NextResponse.json({ error: 'phone e templateKey são obrigatórios' }, { status: 400 })
    }

    const message = await prisma.whatsAppMessageQueue.create({
      data: {
        businessId,
        customerId: customerId || null,
        phone,
        templateKey,
        payload: payload || {},
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      }
    })

    return NextResponse.json(message, { status: 201 })
  } catch (error: any) {
    console.error('Erro ao enfileirar WA', error)
    const message = error?.message || 'Erro ao enfileirar mensagem'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
