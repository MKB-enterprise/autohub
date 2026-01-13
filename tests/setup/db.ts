// tests/setup/db.ts
// Setup isolado pra DB em testes

import { PrismaClient } from '@prisma/client'

let prisma: PrismaClient | null = null

export function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL_TEST || process.env.DATABASE_URL,
        },
      },
    })
  }
  return prisma
}

export async function cleanupDatabase() {
  const p = getPrisma()
  
  // Limpar em ordem reversa de dependência (respeitar FKs)
  try {
    // Deletar em cascata respeitando as constraints
    await p.appointmentService.deleteMany()
    await p.appointmentCancellation.deleteMany()
    await p.appointment.deleteMany()
    await p.inventoryMovement.deleteMany()
    await p.financialTransaction.deleteMany()
    await p.dilutionBatch.deleteMany()
    await p.dilutionRecipe.deleteMany()
    await p.serviceProductUsageTemplate.deleteMany()
    await p.serviceExecutionProductUsage.deleteMany()
    await p.category.deleteMany()
    await p.product.deleteMany()
    await p.productCategory.deleteMany()
    await p.service.deleteMany()
    await p.packageService.deleteMany()
    await p.servicePackage.deleteMany()
    await p.car.deleteMany()
    await p.budgetItem.deleteMany()
    await p.budget.deleteMany()
    await p.financialAccount.deleteMany()
    await p.whatsAppMessageQueue.deleteMany()
    await p.whatsAppConversation.deleteMany()
    await p.whatsAppInboundMessage.deleteMany()
    await p.whatsAppBusinessConfig.deleteMany()
    await p.customer.deleteMany()
    await p.user.deleteMany()
    await p.customerRating.deleteMany()
    await p.notificationTemplate.deleteMany()
    await p.notificationLog.deleteMany()
    await p.aiInsightLog.deleteMany()
    await p.businessSettings.deleteMany()
    await p.tenantSettings.deleteMany()
    await p.business.deleteMany()
    await p.plan.deleteMany()
  } catch (error) {
    console.error('Erro ao limpar database:', error)
    throw error
  }
}

export async function disconnectDatabase() {
  if (prisma) {
    await prisma.$disconnect()
    prisma = null
  }
}
