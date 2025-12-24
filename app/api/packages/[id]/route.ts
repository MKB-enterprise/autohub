import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// GET /api/packages/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pkg = await prisma.servicePackage.findUnique({
      where: { id: params.id },
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
      }
    })

    if (!pkg) {
      return NextResponse.json({ error: 'Pacote não encontrado' }, { status: 404 })
    }

    // Calcular preços
    const services = pkg.services.map(ps => ps.service)
    const originalPrice = services.reduce((sum, s) => sum + Number(s.price), 0)
    const discount = Number(pkg.discountPercent)
    const finalPrice = originalPrice * (1 - discount / 100)
    const totalDuration = services.reduce((sum, s) => sum + s.durationMinutes, 0)

    return NextResponse.json({
      ...pkg,
      originalPrice,
      finalPrice,
      totalDuration,
      savings: originalPrice - finalPrice
    })
  } catch (error) {
    console.error('Erro ao buscar pacote:', error)
    return NextResponse.json({ error: 'Erro ao buscar pacote' }, { status: 500 })
  }
}

// PATCH /api/packages/[id] - Atualizar pacote
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin()
    const body = await request.json()
    const { name, description, discountPercent, serviceIds, isActive } = body

    if (discountPercent !== undefined && (discountPercent < 0 || discountPercent > 100)) {
      return NextResponse.json(
        { error: 'Desconto deve estar entre 0 e 100%' },
        { status: 400 }
      )
    }

    // Se está atualizando serviços, validar
    if (serviceIds) {
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

      // Deletar relações antigas e criar novas
      await prisma.packageService.deleteMany({
        where: { packageId: params.id }
      })
    }

    const pkg = await prisma.servicePackage.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(discountPercent !== undefined && { discountPercent }),
        ...(isActive !== undefined && { isActive }),
        ...(serviceIds && {
          services: {
            create: serviceIds.map((serviceId: string) => ({
              serviceId
            }))
          }
        })
      },
      include: {
        services: {
          include: {
            service: true
          }
        }
      }
    })

    return NextResponse.json(pkg)
  } catch (error) {
    console.error('Erro ao atualizar pacote:', error)
    return NextResponse.json({ error: 'Erro ao atualizar pacote' }, { status: 500 })
  }
}

// DELETE /api/packages/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()

    await prisma.servicePackage.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao deletar pacote:', error)
    return NextResponse.json({ error: 'Erro ao deletar pacote' }, { status: 500 })
  }
}
