import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/budgets/public/[token]
export async function GET(_request: NextRequest, { params }: { params: { token: string } }) {
  try {
    const budget = await prisma.budget.findFirst({
      where: { publicToken: params.token },
      include: { items: true, signatures: true, customer: true }
    })
    if (!budget) return NextResponse.json({ error: 'Orçamento não encontrado' }, { status: 404 })
    return NextResponse.json(budget)
  } catch (error) {
    console.error('Erro ao buscar orçamento público', error)
    return NextResponse.json({ error: 'Erro ao buscar orçamento' }, { status: 500 })
  }
}
