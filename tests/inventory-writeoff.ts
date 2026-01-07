/**
 * Testa baixa automática de estoque em um fluxo similar ao de finalização de agendamento.
 * Execução: tsx tests/inventory-writeoff.ts
 */

import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

async function main() {
  // Business e dados mínimos
  const business = await prisma.business.create({
    data: {
      name: 'Inventory Test',
      slug: `inventory-${Date.now()}`,
      email: `inventory-${Date.now()}@example.com`,
      password: await bcrypt.hash('test123', 10),
      subscriptionPlan: 'BASIC'
    }
  })

  const product = await prisma.product.create({
    data: {
      businessId: business.id,
      name: 'Produto Teste',
      cost: 10,
      currentStock: 5,
      minStock: 1
    }
  })

  const service = await prisma.service.create({
    data: {
      businessId: business.id,
      name: 'Serviço Teste',
      durationMinutes: 30,
      price: 100,
      isActive: true
    }
  })

  await prisma.serviceProduct.create({
    data: {
      serviceId: service.id,
      productId: product.id,
      quantity: 2
    }
  })

  const customer = await prisma.customer.create({
    data: {
      businessId: business.id,
      name: 'Cliente',
      phone: `119${Math.floor(Math.random() * 1e8)}`,
      password: await bcrypt.hash('123456', 10)
    }
  })

  const car = await prisma.car.create({
    data: {
      businessId: business.id,
      customerId: customer.id,
      plate: `TEST${Math.floor(Math.random() * 9999)}`,
      model: 'Modelo',
      year: 2020,
      vehicleType: 'HATCH'
    }
  })

  const start = new Date()
  const end = new Date(start)
  end.setMinutes(end.getMinutes() + 30)

  const appointment = await prisma.appointment.create({
    data: {
      businessId: business.id,
      customerId: customer.id,
      carId: car.id,
      startDatetime: start,
      endDatetime: end,
      totalPrice: 100,
      status: 'COMPLETED',
      appointmentServices: {
        create: { serviceId: service.id, price: 100 }
      }
    },
    include: { appointmentServices: true }
  })

  // Simula write-off (mesma lógica do endpoint)
  const consumptions = await prisma.serviceProduct.findMany({ where: { serviceId: { in: [service.id] } }, include: { product: true } })
  const grouped = consumptions.reduce<Record<string, number>>((acc, item) => {
    acc[item.productId] = (acc[item.productId] || 0) + Number(item.quantity)
    return acc
  }, {})

  await prisma.$transaction(async (tx) => {
    for (const [productId, qty] of Object.entries(grouped)) {
      const prod = await tx.product.findFirst({ where: { id: productId, businessId: business.id } })
      if (!prod) throw new Error('Produto não encontrado')
      const newStock = prod.currentStock - qty
      if (newStock < 0) throw new Error('Estoque insuficiente')

      await tx.inventoryMovement.create({
        data: {
          businessId: business.id,
          productId,
          appointmentId: appointment.id,
          movementType: 'SERVICE_OUT',
          quantity: qty,
          unitCost: prod.cost,
          note: 'Baixa automática teste'
        }
      })

      await tx.product.update({ where: { id: productId }, data: { currentStock: newStock } })
    }

    await tx.appointment.update({ where: { id: appointment.id }, data: { inventoryWrittenOff: true, finalizedAt: new Date() } })
  })

  const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } })
  if (updatedProduct?.currentStock !== 3) throw new Error('Baixa não aplicada corretamente')

  console.log('✅ Baixa de estoque aplicada. Estoque final:', updatedProduct?.currentStock)

  // Cleanup: deletar em cascata (appointmentServices → appointments → business)
  await prisma.$transaction([
    prisma.appointmentService.deleteMany({ where: { appointment: { businessId: business.id } } }),
    prisma.appointment.deleteMany({ where: { businessId: business.id } }),
    prisma.business.delete({ where: { id: business.id } })
  ])
}

main().catch(err => {
  console.error('❌', err.message)
  process.exit(1)
})
