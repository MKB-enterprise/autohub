import { prisma } from '@/lib/db'

export async function getServicePackages(businessId: string) {
  return prisma.servicePackage.findMany({
    where: {
      businessId,
      isActive: true
    },
    include: {
      services: {
        include: {
          service: true
        }
      }
    }
  })
}

export async function getServicePackageById(businessId: string, packageId: string) {
  return prisma.servicePackage.findFirst({
    where: {
      businessId,
      id: packageId
    },
    include: {
      services: {
        include: {
          service: true
        }
      }
    }
  })
}

export async function createServicePackage(
  businessId: string,
  data: {
    name: string
    description?: string
    discountPercent: number
    serviceIds: string[]
  }
) {
  return prisma.servicePackage.create({
    data: {
      businessId,
      name: data.name,
      description: data.description,
      discountPercent: data.discountPercent,
      services: {
        create: data.serviceIds.map(serviceId => ({
          service: {
            connect: { id: serviceId }
          }
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
}

export async function updateServicePackage(
  businessId: string,
  packageId: string,
  data: {
    name?: string
    description?: string
    discountPercent?: number
    serviceIds?: string[]
    isActive?: boolean
  }
) {
  if (data.serviceIds) {
    // Remover serviços antigos
    await prisma.packageService.deleteMany({
      where: { packageId }
    })
  }

  return prisma.servicePackage.update({
    where: { id: packageId },
    data: {
      name: data.name,
      description: data.description,
      discountPercent: data.discountPercent,
      isActive: data.isActive,
      ...(data.serviceIds && {
        services: {
          create: data.serviceIds.map(serviceId => ({
            service: {
              connect: { id: serviceId }
            }
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
}

export async function deleteServicePackage(businessId: string, packageId: string) {
  return prisma.servicePackage.delete({
    where: { id: packageId }
  })
}

export function calculatePackagePrice(
  services: Array<{ price: number }>,
  discountPercent: number
): number {
  const subtotal = services.reduce((sum, s) => sum + parseFloat(s.price.toString()), 0)
  const discount = subtotal * (discountPercent / 100)
  return subtotal - discount
}
