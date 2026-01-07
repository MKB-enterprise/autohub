/**
 * Testa limites de plano para criação de usuários internos.
 * Execução: tsx tests/plan-limits.ts
 */

import { prisma } from '@/lib/db'
import { ensureUserLimit } from '@/lib/plan'
import bcrypt from 'bcryptjs'

async function main() {
  const plan = await prisma.plan.findFirst({ where: { code: 'SIMPLES' } })
  if (!plan) throw new Error('Plano SIMPLES não encontrado (rode o seed).')

  const business = await prisma.business.create({
    data: {
      name: 'Plan Limit Test',
      slug: `plan-limit-${Date.now()}`,
      email: `plan-limit-${Date.now()}@example.com`,
      password: await bcrypt.hash('test123', 10),
      subscriptionPlan: 'BASIC',
      planId: plan.id
    }
  })

  const max = plan.maxUsers ?? 1
  console.log(`Plano SIMPLES, limite de usuários: ${max}`)

  // Cria até o limite
  for (let i = 0; i < max; i++) {
    await ensureUserLimit(business.id)
    await prisma.user.create({
      data: {
        businessId: business.id,
        email: `user-${i}-${business.id}@example.com`,
        password: await bcrypt.hash('test123', 10),
        fullName: `User ${i}`,
        role: 'STAFF'
      }
    })
  }

  let threw = false
  try {
    await ensureUserLimit(business.id)
  } catch (e: any) {
    threw = true
    console.log('✓ Bloqueou criação acima do limite:', e.message)
  }

  if (!threw) throw new Error('Falhou: não bloqueou acima do limite')

  // Cleanup
  await prisma.$transaction([
    prisma.user.deleteMany({ where: { businessId: business.id } }),
    prisma.business.delete({ where: { id: business.id } })
  ])
  console.log('✅ Teste de limite de usuários do plano passou')
}

main().catch(err => {
  console.error('❌', err.message)
  process.exit(1)
})
