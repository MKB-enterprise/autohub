/**
 * Integração: cria agendamento, finaliza, baixa estoque e registra lançamento financeiro.
 * Execução: tsx tests/appointment-finance-flow.ts
 */

import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

async function finalizeWithInventoryAndFinance(businessId: string, appointmentId: string, accountId: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { appointmentServices: true }
  })

  if (!appointment) throw new Error('Agendamento não encontrado')
  const serviceIds = appointment.appointmentServices.map((s) => s.serviceId)
  if (serviceIds.length === 0) throw new Error('Agendamento sem serviços')

  const consumptions = await prisma.serviceProduct.findMany({
    where: { serviceId: { in: serviceIds } },
    include: { product: true }
  })

  const grouped = consumptions.reduce<Record<string, number>>((acc, item) => {
    acc[item.productId] = (acc[item.productId] || 0) + Number(item.quantity)
    return acc
  }, {})

  await prisma.$transaction(async (tx) => {
    for (const [productId, qty] of Object.entries(grouped)) {
      const product = await tx.product.findFirst({ where: { id: productId, businessId } })
      if (!product) throw new Error('Produto não encontrado na baixa')
      const newStock = product.currentStock - qty
      if (newStock < 0) throw new Error('Estoque insuficiente na baixa')

      await tx.inventoryMovement.create({
        data: {
          businessId,
          productId,
          appointmentId,
          movementType: 'SERVICE_OUT',
          quantity: qty,
          unitCost: product.cost,
          note: 'Baixa automática (teste de integração)'
        }
      })

      await tx.product.update({ where: { id: productId }, data: { currentStock: newStock } })
    }

    await tx.appointment.update({
      where: { id: appointmentId },
      data: { status: 'COMPLETED', inventoryWrittenOff: true, finalizedAt: new Date() }
    })

    await tx.financialTransaction.create({
      data: {
        businessId,
        accountId,
        appointmentId,
        type: 'REVENUE',
        status: 'CLEARED',
        amount: Number(appointment.totalPrice),
        occurredAt: new Date(),
        description: 'Receita de serviço finalizado (teste)'
      }
    })
  })
}

async function main() {
  const plan = await prisma.plan.findFirst({ where: { code: 'SIMPLES' } })
  if (!plan) throw new Error('Plano SIMPLES não encontrado (rode o seed).')

  const business = await prisma.business.create({
    data: {
      name: 'Integração Atendimento',
      slug: `integracao-${Date.now()}`,
      email: `integracao-${Date.now()}@example.com`,
      password: await bcrypt.hash('test123', 10),
      subscriptionPlan: 'BASIC',
      planId: plan.id
    }
  })

  const account = await prisma.financialAccount.create({
    data: {
      businessId: business.id,
      name: 'Serviços',
      type: 'REVENUE'
    }
  })

  const product = await prisma.product.create({
    data: {
      businessId: business.id,
      name: 'Shampoo Automotivo',
      cost: 25,
      currentStock: 10,
      minStock: 1
    }
  })

  const service = await prisma.service.create({
    data: {
      businessId: business.id,
      name: 'Lavagem Completa',
      durationMinutes: 60,
      price: 120,
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
      name: 'Cliente Integração',
      phone: `119${Math.floor(Math.random() * 1e8)}`,
      password: await bcrypt.hash('123456', 10)
    }
  })

  const car = await prisma.car.create({
    data: {
      businessId: business.id,
      customerId: customer.id,
      plate: `INT${Math.floor(Math.random() * 9999)}`,
      model: 'Sedan',
      year: 2022,
      vehicleType: 'SEDAN'
    }
  })

  const start = new Date()
  const end = new Date(start)
  end.setMinutes(end.getMinutes() + 60)

  const appointment = await prisma.appointment.create({
    data: {
      businessId: business.id,
      customerId: customer.id,
      carId: car.id,
      startDatetime: start,
      endDatetime: end,
      totalPrice: 120,
      status: 'CONFIRMED',
      appointmentServices: {
        create: [{ serviceId: service.id, price: service.price }]
      }
    },
    include: { appointmentServices: true }
  })

  await finalizeWithInventoryAndFinance(business.id, appointment.id, account.id)

  const [updatedProduct, movements, tx, finalizedAppointment] = await Promise.all([
    prisma.product.findUnique({ where: { id: product.id } }),
    prisma.inventoryMovement.findMany({ where: { appointmentId: appointment.id } }),
    prisma.financialTransaction.findFirst({ where: { appointmentId: appointment.id } }),
    prisma.appointment.findUnique({ where: { id: appointment.id } })
  ])

  if (updatedProduct?.currentStock !== 8) {
    throw new Error(`Baixa de estoque incorreta: esperado 8, veio ${updatedProduct?.currentStock}`)
  }
  if (!movements.length) throw new Error('Nenhuma movimentação de estoque registrada')
  if (!tx) throw new Error('Lançamento financeiro não criado')
  if (Number(tx.amount) !== 120) throw new Error(`Valor financeiro divergente: ${tx.amount}`)
  if (!finalizedAppointment?.inventoryWrittenOff || !finalizedAppointment.finalizedAt) {
    throw new Error('Agendamento não marcado como finalizado com baixa de estoque')
  }

  console.log('✅ Fluxo completo passou: agendamento finalizado, estoque baixado e financeiro registrado')

  // Cleanup (order: transactions → account, then service dependencies)
  await prisma.$transaction([
    prisma.financialTransaction.deleteMany({ where: { businessId: business.id } }),
    prisma.financialAccount.deleteMany({ where: { businessId: business.id } }),
    prisma.appointmentService.deleteMany({ where: { appointmentId: appointment.id } }),
    prisma.appointment.delete({ where: { id: appointment.id } }),
    prisma.car.deleteMany({ where: { customerId: customer.id } }),
    prisma.customer.delete({ where: { id: customer.id } }),
    prisma.serviceProduct.deleteMany({ where: { serviceId: service.id } }),
    prisma.service.delete({ where: { id: service.id } }),
    prisma.product.delete({ where: { id: product.id } }),
    prisma.business.delete({ where: { id: business.id } })
  ])
}

main().catch((err) => {
  console.error('❌', err.message)
  process.exit(1)
})
