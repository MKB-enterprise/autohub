import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/cars - Listar carros
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')

    const where: any = {}

    if (customerId) {
      where.customerId = customerId
    }

    const cars = await prisma.car.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true
          }
        },
        appointments: {
          select: {
            id: true,
            status: true
          },
          orderBy: {
            startDatetime: 'desc'
          },
          take: 5
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(cars)
  } catch (error) {
    console.error('Erro ao buscar carros:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar carros' },
      { status: 500 }
    )
  }
}

// POST /api/cars - Criar carro
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customerId, plate, model, color, notes, year, vehicleType } = body

    if (!customerId || !plate || !model) {
      return NextResponse.json(
        { error: 'Cliente, placa e modelo são obrigatórios' },
        { status: 400 }
      )
    }

    const car = await prisma.car.create({
      data: {
        customerId,
        plate,
        model,
        ...(color && { color }),
        ...(notes && { notes }),
        ...(year && { year }),
        ...(vehicleType && { vehicleType })
      },
      include: {
        customer: true
      }
    })

    return NextResponse.json(car, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar carro:', error)
    return NextResponse.json(
      { error: 'Erro ao criar carro' },
      { status: 500 }
    )
  }
}
