import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/services - Listar serviços
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('activeOnly') === 'true'

    const where: any = {}

    if (activeOnly) {
      where.isActive = true
    }

    const services = await prisma.service.findMany({
      where,
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(services)
  } catch (error) {
    console.error('Erro ao buscar serviços:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar serviços' },
      { status: 500 }
    )
  }
}

// POST /api/services - Criar serviço
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, durationMinutes, price, isActive, serviceGroup } = body

    if (!name || !durationMinutes || !price) {
      return NextResponse.json(
        { error: 'Nome, duração e preço são obrigatórios' },
        { status: 400 }
      )
    }

    if (durationMinutes <= 0) {
      return NextResponse.json(
        { error: 'Duração deve ser maior que zero' },
        { status: 400 }
      )
    }

    if (price <= 0) {
      return NextResponse.json(
        { error: 'Preço deve ser maior que zero' },
        { status: 400 }
      )
    }

    const service = await prisma.service.create({
      data: {
        name,
        description,
        durationMinutes,
        price,
        isActive: isActive !== undefined ? isActive : true,
        serviceGroup: serviceGroup || null
      }
    })

    return NextResponse.json(service, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar serviço:', error)
    return NextResponse.json(
      { error: 'Erro ao criar serviço' },
      { status: 500 }
    )
  }
}
