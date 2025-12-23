import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// GET /api/customers - Listar clientes
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    const where: any = {}

    if (!auth.isAdmin) {
      where.id = auth.customerId
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ]
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        cars: true,
        _count: auth.isAdmin ? {
          select: { appointments: true }
        } : undefined
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(customers)
  } catch (error) {
    console.error('Erro ao buscar clientes:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erro ao buscar clientes' }, { status: 500 })
  }
}

// POST /api/customers - Criar cliente
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth()
    if (!auth.isAdmin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await request.json()
    const { name, phone, notes } = body

    if (!name || !phone) {
      return NextResponse.json(
        { error: 'Nome e telefone são obrigatórios' },
        { status: 400 }
      )
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        phone,
        notes
      },
      include: {
        cars: true
      }
    })

    return NextResponse.json(customer, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar cliente:', error)
    return NextResponse.json(
      { error: 'Erro ao criar cliente' },
      { status: 500 }
    )
  }
}
