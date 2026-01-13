import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin, validateTenantAccess } from '@/lib/auth'
import { resolveTenantFromRequest } from '@/lib/tenant-resolver'

// GET /api/finance/accounts
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    await validateTenantAccess(request, admin)
    const { context } = await resolveTenantFromRequest(request)
    if (!context) {
      return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 400 })
    }
    const businessId: string = context.tenantId

    const accounts = await prisma.financialAccount.findMany({
      where: { businessId },
      orderBy: { name: 'asc' }
    })
    return NextResponse.json(accounts)
  } catch (error) {
    console.error('Erro ao listar contas', error)
    return NextResponse.json({ error: 'Erro ao listar contas' }, { status: 500 })
  }
}

// POST /api/finance/accounts
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    await validateTenantAccess(request, admin)
    const { context } = await resolveTenantFromRequest(request)
    if (!context) {
      return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 400 })
    }
    const businessId: string = context.tenantId

    const body = await request.json()
    const { name, type } = body

    if (!name || !type) return NextResponse.json({ error: 'Nome e tipo são obrigatórios' }, { status: 400 })

    const account = await prisma.financialAccount.create({
      data: {
        businessId,
        name,
        type,
      }
    })

    return NextResponse.json(account, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar conta', error)
    return NextResponse.json({ error: 'Erro ao criar conta' }, { status: 500 })
  }
}
