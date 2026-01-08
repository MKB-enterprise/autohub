/**
 * Testa assinatura de orçamento e mudança de status para APPROVED.
 * Execução: tsx tests/budget-signature.ts
 */

import { prisma } from '@/lib/db'
import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'

async function main() {
  const business = await prisma.business.create({
    data: {
      name: 'Budget Test',
      slug: `budget-${Date.now()}`,
      email: `budget-${Date.now()}@example.com`,
      password: await bcrypt.hash('test123', 10),
      subscriptionPlan: 'BASIC'
    }
  })

  const customer = await prisma.customer.create({
    data: {
      businessId: business.id,
      name: 'Cliente Budget',
      phone: `118${Math.floor(Math.random() * 1e8)}`,
      password: await bcrypt.hash('123456', 10)
    }
  })

  const budget = await prisma.budget.create({
    data: {
      businessId: business.id,
      customerId: customer.id,
      status: 'SENT',
      total: 150,
      publicToken: randomUUID(),
      items: {
        create: [{ name: 'Serviço X', quantity: 1, unitPrice: 150, total: 150 }]
      }
    },
    include: { items: true }
  })

  const signerIp = '127.0.0.1'
  await prisma.$transaction(async (tx) => {
    await tx.budgetSignature.create({
      data: {
        budgetId: budget.id,
        signerName: 'Teste Assinatura',
        signatureData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABC',
        signerIp,
      }
    })

    await tx.budget.update({
      where: { id: budget.id },
      data: {
        status: 'APPROVED',
        signedAt: new Date(),
        signedByName: 'Teste Assinatura',
        signedByIp: signerIp
      }
    })
  })

  const updated = await prisma.budget.findUnique({ where: { id: budget.id }, include: { signatures: true } })
  if (updated?.status !== 'APPROVED') throw new Error('Status não atualizado para APPROVED')
  if (!updated?.signatures.length) throw new Error('Assinatura não registrada')

  console.log('✅ Orçamento assinado e aprovado')

  // Cleanup
  await prisma.$transaction([
    prisma.budgetSignature.deleteMany({ where: { budgetId: budget.id } }),
    prisma.budgetItem.deleteMany({ where: { budgetId: budget.id } }),
    prisma.budget.delete({ where: { id: budget.id } }),
    prisma.customer.delete({ where: { id: customer.id } }),
    prisma.business.delete({ where: { id: business.id } })
  ])
}

main().catch(err => {
  console.error('❌', err.message)
  process.exit(1)
})
