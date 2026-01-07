import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin, requireAuth } from '@/lib/auth'
import { checkMonthlyBudgetQuota } from '@/lib/plan'
import { randomUUID } from 'crypto'

// GET /api/budgets
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined

    const where: any = { businessId: (user as any).businessId }
    if (!user.isAdmin) {
      where.customerId = user.customerId
    }
    if (status) where.status = status

    const budgets = await prisma.budget.findMany({
      where,
      include: {
        customer: true,
        items: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(budgets)
  } catch (error) {
    console.error('Erro ao listar orçamentos', error)
    return NextResponse.json({ error: 'Erro ao listar orçamentos' }, { status: 500 })
  }
}

// POST /api/budgets
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    const body = await request.json()
    const { customerId, items, expiresAt, notes, status } = body

    if (!customerId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Cliente e itens são obrigatórios' }, { status: 400 })
    }

    await checkMonthlyBudgetQuota((admin as any).businessId)

    let total = 0
    const normalizedItems = items.map((item: any) => {
      const quantity = Number(item.quantity || 1)
      const unitPrice = Number(item.unitPrice || 0)
      const lineTotal = quantity * unitPrice
      total += lineTotal
      return {
        name: item.name,
        description: item.description || null,
        quantity,
        unitPrice,
        total: lineTotal,
        serviceId: item.serviceId || null,
      }
    })

    const budget = await prisma.budget.create({
      data: {
        businessId: (admin as any).businessId,
        customerId,
        status: status || 'SENT',
        total,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        notes,
        publicToken: randomUUID(),
        items: { createMany: { data: normalizedItems } },
      },
      include: {
        items: true
      }
    })

    return NextResponse.json(budget, { status: 201 })
  } catch (error: any) {
    console.error('Erro ao criar orçamento', error)
    const message = error?.message || 'Erro ao criar orçamento'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
