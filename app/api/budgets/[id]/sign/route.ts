import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST /api/budgets/[id]/sign
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { token, signerName, signatureData } = body
    if (!token || !signerName || !signatureData) {
      return NextResponse.json({ error: 'token, signerName e signatureData são obrigatórios' }, { status: 400 })
    }

    const budget = await prisma.budget.findFirst({ where: { id: params.id, publicToken: token }, include: { signatures: true } })
    if (!budget) return NextResponse.json({ error: 'Orçamento não encontrado' }, { status: 404 })

    const updated = await prisma.$transaction(async (tx) => {
      await tx.budgetSignature.create({
        data: {
          budgetId: budget.id,
          signerName,
          signatureData,
          signerIp: request.headers.get('x-forwarded-for') || request.ip || undefined,
        }
      })

      return tx.budget.update({
        where: { id: budget.id },
        data: {
          status: 'APPROVED',
          signedAt: new Date(),
          signedByName: signerName,
          signedByIp: request.headers.get('x-forwarded-for') || request.ip || undefined,
        },
        include: { items: true, signatures: true }
      })
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Erro ao assinar orçamento', error)
    return NextResponse.json({ error: 'Erro ao assinar orçamento' }, { status: 500 })
  }
}
