import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/customers - Listar clientes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    const where: any = {}

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
        _count: {
          select: { appointments: true }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(customers)
  } catch (error) {
    console.error('Erro ao buscar clientes:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar clientes' },
      { status: 500 }
    )
  }
}

// POST /api/customers - Criar cliente
export async function POST(request: NextRequest) {
  try {
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
