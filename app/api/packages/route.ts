import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser, requireAdmin } from '@/lib/auth'

// GET /api/packages - Listar pacotes (público)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('activeOnly') === 'true'
    const qpBusinessId = searchParams.get('businessId') || undefined

    const user = await getCurrentUser().catch(() => null)
    let businessId = qpBusinessId || (user?.businessId as string | undefined)
    if (!businessId) {
      const biz = await prisma.business.findFirst({ select: { id: true } })
      businessId = biz?.id
    }

    const where: any = {}
    if (businessId) where.businessId = businessId
    if (activeOnly) where.isActive = true

    const packages = await prisma.servicePackage.findMany({
      where,
      include: {
        services: {
          include: {
            service: {
              include: {
                category: true
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Calcular preço original e com desconto
    const packagesWithPrices = packages.map(pkg => {
      const services = pkg.services.map(ps => ps.service)
      const originalPrice = services.reduce((sum, s) => sum + Number(s.price), 0)
      const discount = Number(pkg.discountPercent)
      const finalPrice = originalPrice * (1 - discount / 100)
      const totalDuration = services.reduce((sum, s) => sum + s.durationMinutes, 0)

      return {
        ...pkg,
        originalPrice,
        finalPrice,
        totalDuration,
        savings: originalPrice - finalPrice
      }
    })

    return NextResponse.json(packagesWithPrices)
  } catch (error) {
    console.error('Erro ao buscar pacotes:', error)
    return NextResponse.json({ error: 'Erro ao buscar pacotes' }, { status: 500 })
  }
}

// POST /api/packages - Criar pacote (admin)
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    const body = await request.json()
    const { name, description, discountPercent, serviceIds, isActive } = body

    if (!name || !discountPercent || !serviceIds || serviceIds.length === 0) {
      return NextResponse.json(
        { error: 'Nome, desconto e serviços são obrigatórios' },
        { status: 400 }
      )
    }

    if (discountPercent < 0 || discountPercent > 100) {
      return NextResponse.json(
        { error: 'Desconto deve estar entre 0 e 100%' },
        { status: 400 }
      )
    }

    // Validar que todos os serviços existem e pertencem ao mesmo negócio
    const services = await prisma.service.findMany({
      where: {
        id: { in: serviceIds },
        businessId: (admin as any).businessId
      }
    })

    if (services.length !== serviceIds.length) {
      return NextResponse.json(
        { error: 'Um ou mais serviços inválidos' },
        { status: 400 }
      )
    }

    const pkg = await prisma.servicePackage.create({
      data: {
        businessId: (admin as any).businessId,
        name,
        description: description || null,
        discountPercent,
        isActive: isActive !== undefined ? isActive : true,
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
