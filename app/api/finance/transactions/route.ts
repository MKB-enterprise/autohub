import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// GET /api/finance/transactions
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const type = searchParams.get('type') || undefined

    const where: any = { businessId: (admin as any).businessId }
    if (type) where.type = type
    if (from || to) {
      where.occurredAt = {}
      if (from) where.occurredAt.gte = new Date(from)
      if (to) {
        const end = new Date(to)
        end.setHours(23, 59, 59, 999)
        where.occurredAt.lte = end
      }
    }

    const txs = await prisma.financialTransaction.findMany({
      where,
      include: { account: true, appointment: true, budget: true },
      orderBy: { occurredAt: 'desc' }
    })

    return NextResponse.json(txs)
  } catch (error) {
    console.error('Erro ao listar lançamentos', error)
    return NextResponse.json({ error: 'Erro ao listar lançamentos' }, { status: 500 })
  }
}

// POST /api/finance/transactions
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    const body = await request.json()
    const { accountId, type, amount, description, occurredAt, status = 'PENDING' } = body

    if (!accountId || !type || amount === undefined) {
      return NextResponse.json({ error: 'accountId, type e amount são obrigatórios' }, { status: 400 })
    }

    const account = await prisma.financialAccount.findFirst({ where: { id: accountId, businessId: (admin as any).businessId } })
    if (!account) return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })

    const tx = await prisma.financialTransaction.create({
      data: {
        businessId: (admin as any).businessId,
        accountId,
        type,
        amount,
        status,
        occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
        description,
      }
    })

    return NextResponse.json(tx, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar lançamento', error)
    return NextResponse.json({ error: 'Erro ao criar lançamento' }, { status: 500 })
  }
}
