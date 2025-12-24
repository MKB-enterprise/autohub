import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// PATCH /api/settings/packages/[id] - Atualizar pacote
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAdmin()
    const packageId = params.id
    const { name, description, discountPercent, serviceIds, isActive } = await request.json()

    // Verificar se pacote existe e pertence ao negócio
    const existingPackage = await prisma.servicePackage.findFirst({
      where: {
        id: packageId,
        businessId: user.businessId
      }
    })

    if (!existingPackage) {
      return NextResponse.json({ error: 'Pacote não encontrado' }, { status: 404 })
    }

    // Se serviceIds foi alterado, atualizar
    if (serviceIds && serviceIds.length > 0) {
      await prisma.packageService.deleteMany({
        where: { packageId }
      })
    }

    const pkg = await prisma.servicePackage.update({
      where: { id: packageId },
      data: {
        name,
        description,
        discountPercent,
        isActive,
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

// DELETE /api/settings/packages/[id] - Deletar pacote
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAdmin()
    const packageId = params.id

    // Verificar se pacote existe
    const pkg = await prisma.servicePackage.findFirst({
      where: {
        id: packageId,
        businessId: user.businessId
      }
    })

    if (!pkg) {
      return NextResponse.json({ error: 'Pacote não encontrado' }, { status: 404 })
    }

    await prisma.servicePackage.delete({
      where: { id: packageId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao deletar pacote:', error)
    return NextResponse.json({ error: 'Erro ao deletar pacote' }, { status: 500 })
  }
}
