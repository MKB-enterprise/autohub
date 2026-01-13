import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin, validateTenantAccess } from '@/lib/auth'
import { assertIaAllowed } from '@/lib/plan'
import { resolveTenantFromRequest } from '@/lib/tenant-resolver'

// POST /api/ai/insights
export async function POST(request: NextRequest) {
  const started = Date.now()
  try {
    const admin = await requireAdmin()
    await validateTenantAccess(request, admin)
    const { context } = await resolveTenantFromRequest(request)
    if (!context) {
      return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 400 })
    }
    const businessId: string = context.tenantId

    await assertIaAllowed(businessId)

    const body = await request.json()
    const { periodStart, periodEnd } = body

    const from = periodStart ? new Date(periodStart) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const to = periodEnd ? new Date(periodEnd) : new Date()

    const [revenue, expenses, lowStock] = await Promise.all([
      prisma.financialTransaction.aggregate({
        where: { businessId, type: 'REVENUE', occurredAt: { gte: from, lte: to } },
        _sum: { amount: true }
      }),
      prisma.financialTransaction.aggregate({
        where: { businessId, type: 'EXPENSE', occurredAt: { gte: from, lte: to } },
        _sum: { amount: true }
      }),
      prisma.product.findMany({ where: { businessId }, select: { name: true, currentStock: true, minStock: true } })
    ])

    const lowStockItems = lowStock.filter(p => p.currentStock < p.minStock).map(p => p.name)
    const revenueTotal = Number(revenue._sum.amount ?? 0)
    const expenseTotal = Number(expenses._sum.amount ?? 0)
    const profit = revenueTotal - expenseTotal

    const insights = [
      revenueTotal > expenseTotal
        ? `Faturamento líquido estimado positivo de R$ ${profit.toFixed(2)} no período.`
        : `Atenção: despesas superaram receitas em R$ ${Math.abs(profit).toFixed(2)} no período.`,
      lowStockItems.length > 0
        ? `Reposição sugerida para: ${lowStockItems.join(', ')}.`
        : 'Estoque dentro dos níveis mínimos em todos os itens mapeados.',
      'Considere oferecer upsell de estética premium para elevar ticket médio em horários ociosos.'
    ]

    const latency = Date.now() - started
    await prisma.aiInsightLog.create({
      data: {
        businessId,
        userId: (admin as any).customerId || null,
        prompt: JSON.stringify({ periodStart: from.toISOString(), periodEnd: to.toISOString() }),
        response: insights.join('\n'),
        latencyMs: latency,
      }
    })

    return NextResponse.json({ insights, revenueTotal, expenseTotal, profit, latencyMs: latency })
  } catch (error: any) {
    console.error('Erro IA', error)
    const message = error?.message || 'Erro ao gerar insights'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
