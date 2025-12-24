import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed multi-tenant...')

  // 1) Criar/atualizar a empresa principal
  const businessPassword = await bcrypt.hash('admin123', 10)
  const business = await prisma.business.upsert({
    where: { email: 'demo@autogarage.com' },
    update: {},
    create: {
      name: 'AutoGarage Demo',
      email: 'demo@autogarage.com',
      phone: '11999990000',
      password: businessPassword,
      subscriptionPlan: 'BASIC',
      subscriptionStatus: 'ACTIVE',
      monthlyPrice: 99.99,
    },
  })
  console.log('✅ Empresa criada/atualizada:', business.email, '| Senha: admin123')

  // 2) Configurações da empresa
  await prisma.businessSettings.upsert({
    where: { businessId: business.id },
    update: {},
    create: {
      businessId: business.id,
      openingTimeWeekday: '08:00',
      closingTimeWeekday: '18:00',
      slotIntervalMinutes: 30,
      maxCarsPerSlot: 1,
      timezone: 'America/Sao_Paulo',
      notificationsEnabled: true,
      notificationChannel: 'email',
      notifyOn24hBefore: true,
      notifyOn1hBefore: true,
      packagesEnabled: true,
    },
  })
  console.log('✅ Configurações da empresa prontas')

  // 3) Usuário admin (customer isAdmin=true) vinculado à empresa
  const adminPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.customer.upsert({
    where: { businessId_phone: { businessId: business.id, phone: '11999999999' } },
    update: { businessId: business.id },
    create: {
      businessId: business.id,
      name: 'Administrador',
      phone: '11999999999',
      email: 'admin@autogarage.com',
      password: adminPassword,
      isAdmin: true,
    },
  })
  console.log('✅ Admin criado:', admin.email, '| Senha: admin123')

  // 4) Serviços padrão com exclusividade por grupo
  const servicos = [
    {
      name: 'Interior Essencial',
      description: 'Aspiração completa, limpeza de painel, portas, console, tapetes e acabamento com produtos adequados.',
      durationMinutes: 25,
      price: 49.0,
      serviceGroup: 'interior',
    },
    {
      name: 'Interior Detalhado',
      description: 'Inclui limpeza detalhada de frestas, trilhos, pedais, bancos e tratamento específico para bancos de couro.',
      durationMinutes: 45,
      price: 85.0,
      serviceGroup: 'interior',
    },
    {
      name: 'Lavagem Técnica Completa',
      description: 'Pré-lavagem, lavagem manual, limpeza de rodas, caixa de rodas, borrachas e secagem cuidadosa.',
      durationMinutes: 45,
      price: 75.0,
      serviceGroup: 'exterior',
    },
    {
      name: 'Refino Visual da Pintura',
      description: 'Tratamento manual para realce visual da pintura, melhora do toque e aparência, sem uso de polidora.',
      durationMinutes: 35,
      price: 120.0,
      serviceGroup: 'acabamento',
    },
    {
      name: 'Tratamento Avançado de Pintura',
      description: 'Tratamento manual avançado que proporciona pintura mais uniforme, lisa e com aparência de cuidado premium.',
      durationMinutes: 240,
      price: 399.0,
      serviceGroup: 'premium',
    },
  ]

  for (const servico of servicos) {
    await prisma.service.upsert({
      where: { businessId_name: { businessId: business.id, name: servico.name } },
      update: { serviceGroup: servico.serviceGroup },
      create: { ...servico, businessId: business.id },
    })
    console.log('✅ Serviço disponível para a empresa:', servico.name, '| Grupo:', servico.serviceGroup)
  }

  console.log('🎉 Seed concluído!')
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
