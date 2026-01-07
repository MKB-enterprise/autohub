import { prisma } from './db'

export type PlanCode = 'SIMPLES' | 'PROFISSIONAL' | 'COMPLETO'

const fallbackMap: Record<string, PlanCode> = {
  BASIC: 'SIMPLES',
  PROFESSIONAL: 'PROFISSIONAL',
  ENTERPRISE: 'COMPLETO'
}

const fallbackLimits: Record<PlanCode, { maxUsers: number; whatsapp: boolean; ai: boolean; monthlyQuoteLimit: number | null }> = {
  SIMPLES: { maxUsers: 1, whatsapp: false, ai: false, monthlyQuoteLimit: 20 },
  PROFISSIONAL: { maxUsers: 5, whatsapp: true, ai: false, monthlyQuoteLimit: 40 },
  COMPLETO: { maxUsers: 8, whatsapp: true, ai: true, monthlyQuoteLimit: null }
}

export async function getPlanForBusiness(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      id: true,
      subscriptionPlan: true,
      plan: {
        select: {
          id: true,
          code: true,
          name: true,
          maxUsers: true,
          whatsappEnabled: true,
          aiEnabled: true,
          monthlyQuoteLimit: true
        }
      }
    }
  })

  if (!business) return null

  if (business.plan) {
    return {
      code: business.plan.code as PlanCode,
      maxUsers: business.plan.maxUsers ?? fallbackLimits[fallbackMap[business.subscriptionPlan]]?.maxUsers,
      whatsapp: business.plan.whatsappEnabled,
      ai: business.plan.aiEnabled,
      monthlyQuoteLimit: business.plan.monthlyQuoteLimit ?? fallbackLimits[fallbackMap[business.subscriptionPlan]]?.monthlyQuoteLimit
    }
  }

  const code = fallbackMap[business.subscriptionPlan] ?? 'SIMPLES'
  return {
    code,
    maxUsers: fallbackLimits[code].maxUsers,
    whatsapp: fallbackLimits[code].whatsapp,
    ai: fallbackLimits[code].ai,
    monthlyQuoteLimit: fallbackLimits[code].monthlyQuoteLimit
  }
}

export async function ensureUserLimit(businessId: string) {
  const plan = await getPlanForBusiness(businessId)
  if (!plan) throw new Error('Plano não encontrado')

  const userCount = await prisma.user.count({ where: { businessId } })
  if (plan.maxUsers !== null && userCount >= plan.maxUsers) {
    throw new Error('Limite de usuários do plano atingido')
  }
}

export async function assertWhatsAppAllowed(businessId: string) {
  const plan = await getPlanForBusiness(businessId)
  if (!plan) throw new Error('Plano não encontrado')
  if (!plan.whatsapp) {
    throw new Error('WhatsApp não disponível no seu plano. Faça upgrade para usar este recurso.')
  }
}

export async function assertIaAllowed(businessId: string) {
  const plan = await getPlanForBusiness(businessId)
  if (!plan) throw new Error('Plano não encontrado')
  if (!plan.ai) {
    throw new Error('IA não disponível no seu plano. Faça upgrade para usar este recurso.')
  }
}

export async function checkMonthlyBudgetQuota(businessId: string) {
  const plan = await getPlanForBusiness(businessId)
  if (!plan) throw new Error('Plano não encontrado')
  if (plan.monthlyQuoteLimit === null) return true

  const start = new Date()
  start.setUTCDate(1)
  start.setUTCHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setUTCMonth(end.getUTCMonth() + 1)

  const used = await prisma.budget.count({
    where: {
      businessId,
      createdAt: { gte: start, lt: end }
    }
  })

  if (used >= plan.monthlyQuoteLimit) {
    throw new Error('Limite mensal de orçamentos atingido para o plano atual')
  }

  return true
}
