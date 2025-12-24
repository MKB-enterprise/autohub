import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// GET /api/settings/packages - Listar pacotes de serviços
export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin()
    const businessId = user.businessId

    const packages = await prisma.servicePackage.findMany({
      where: { businessId },
      include: {
        services: {
          include: {
            service: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(packages)
  } catch (error) {
    console.error('Erro ao buscar pacotes:', error)
    return NextResponse.json({ error: 'Erro ao buscar pacotes' }, { status: 500 })
  }
}

// POST /api/settings/packages - Criar novo pacote
export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin()
    const businessId = user.businessId
    const { name, description, discountPercent, serviceIds } = await request.json()

    if (!name || !serviceIds || serviceIds.length === 0) {
      return NextResponse.json(
        { error: 'Nome e serviços são obrigatórios' },
        { status: 400 }
      )
    }

    if (discountPercent < 0 || discountPercent > 100) {
      return NextResponse.json(
        { error: 'Desconto deve estar entre 0 e 100%' },
        { status: 400 }
      )
    }

    const pkg = await prisma.servicePackage.create({
      data: {
        businessId,
        name,
        description,
        discountPercent,
        services: {
          create: serviceIds.map((serviceId: string) => ({
            serviceId
          }))
        }
      },
      include: {
        services: {
          include: {
            service: true
          }
        }
      }
    })

    return NextResponse.json(pkg, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar pacote:', error)
    return NextResponse.json({ error: 'Erro ao criar pacote' }, { status: 500 })
  }
}
