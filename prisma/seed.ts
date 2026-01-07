import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Função para gerar slug a partir do nome
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]+/g, '-') // Substitui caracteres especiais por hífen
    .replace(/^-+|-+$/g, '') // Remove hífens nas extremidades
}

async function main() {
  console.log('🌱 Iniciando seed multi-tenant...')

  // Limpar slugs antigos
  await prisma.business.deleteMany({ where: { slug: 'default' } })
  await prisma.business.deleteMany({ where: { slug: 'autogarage-demo' } })
  const plans = [
    {
      code: 'SIMPLES',
      name: 'Plano Simples',
      description: '1 usuário, sem WhatsApp, sem IA, 20 orçamentos/mês',
      maxUsers: 1,
      whatsappEnabled: false,
      aiEnabled: false,
      monthlyQuoteLimit: 20,
    },
    {
      code: 'PROFISSIONAL',
      name: 'Plano Profissional',
      description: 'Até 5 usuários, WhatsApp incluso, sem IA, 40 orçamentos/mês',
      maxUsers: 5,
      whatsappEnabled: true,
      aiEnabled: false,
      monthlyQuoteLimit: 40,
    },
    {
      code: 'COMPLETO',
      name: 'Plano Completo',
      description: 'Até 8 usuários, WhatsApp e IA, orçamentos ilimitados',
      maxUsers: 8,
      whatsappEnabled: true,
      aiEnabled: true,
      monthlyQuoteLimit: null,
    },
  ]

  const planRecords = {} as Record<string, { id: string }>
  for (const plan of plans) {
    const created = await prisma.plan.upsert({
      where: { code: plan.code },
      update: plan,
      create: plan,
    })
    planRecords[plan.code] = { id: created.id }
  }
  console.log('✅ Planos prontos:', Object.keys(planRecords))

  // Limpar empresa antiga se existir
  try {
    await prisma.business.deleteMany({
      where: { email: 'demo@autogarage.com' }
    })
    console.log('🗑️  Empresa antiga removida')
  } catch (e) {
    // Ignorar se não existir
  }

  // 1) Criar/atualizar a empresa principal
  const businessPassword = await bcrypt.hash('admin123', 10)
  // Limpar slugs antigos
  await prisma.business.deleteMany({ where: { slug: 'default' } })
  await prisma.business.deleteMany({ where: { slug: 'autogarage-demo' } })

  const business = await prisma.business.upsert({
    where: { email: 'admin@garageauto.com' },
    update: { slug: 'garageauto', planId: planRecords['SIMPLES'].id, name: 'Garage Auto' },
    create: {
      name: 'Garage Auto',
      slug: 'garageauto',
      email: 'admin@garageauto.com',
      phone: '11999990000',
      password: businessPassword,
      subscriptionPlan: 'BASIC',
      subscriptionStatus: 'ACTIVE',
      monthlyPrice: 99.99,
      planId: planRecords['SIMPLES'].id,
    },
  })
  console.log('✅ Empresa criada/atualizada:', business.email, '| Slug:', business.slug, '| Senha: admin123')

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
    update: { businessId: business.id, email: 'admin@autogarage.com' },
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

  // 3.5) Segunda empresa
  const business2Password = await bcrypt.hash('admin123', 10)
  const premiumSlug = generateSlug('Premium Car')
  const business2 = await prisma.business.upsert({
    where: { slug: premiumSlug },
    update: {
      slug: premiumSlug,
      planId: planRecords['PROFISSIONAL'].id,
      email: 'admin@premiumcar.com',
      phone: '11988887777',
      password: business2Password,
      subscriptionPlan: 'PROFESSIONAL',
      subscriptionStatus: 'ACTIVE',
      monthlyPrice: 199.99,
    },
    create: {
      name: 'Premium Car',
      slug: premiumSlug,
      email: 'admin@premiumcar.com',
      phone: '11988887777',
      password: business2Password,
      subscriptionPlan: 'PROFESSIONAL',
      subscriptionStatus: 'ACTIVE',
      monthlyPrice: 199.99,
      planId: planRecords['PROFISSIONAL'].id,
    },
  })
  console.log('✅ Segunda empresa criada:', business2.email, '| Slug:', business2.slug, '| Senha: admin123')

  // Configurações da segunda empresa
  await prisma.businessSettings.upsert({
    where: { businessId: business2.id },
    update: {},
    create: {
      businessId: business2.id,
      openingTimeWeekday: '09:00',
      closingTimeWeekday: '19:00',
      slotIntervalMinutes: 15,
      maxCarsPerSlot: 2,
      timezone: 'America/Sao_Paulo',
      notificationsEnabled: true,
      notificationChannel: 'email',
      notifyOn24hBefore: true,
      notifyOn1hBefore: true,
      packagesEnabled: true,
    },
  })
  console.log('✅ Configurações da segunda empresa prontas')

  // Admin da segunda empresa
  const admin2Password = await bcrypt.hash('admin123', 10)
  const admin2 = await prisma.customer.upsert({
    where: { businessId_phone: { businessId: business2.id, phone: '11988886666' } },
    update: { businessId: business2.id, email: 'admin@premiumcar.com' },
    create: {
      businessId: business2.id,
      name: 'Gerente Premium',
      phone: '11988886666',
      email: 'admin@premiumcar.com',
      password: admin2Password,
      isAdmin: true,
    },
  })
  console.log('✅ Admin da segunda empresa criado:', admin2.email, '| Senha: admin123')

  // Cliente regular da segunda empresa (para testes)
  const customer2Password = await bcrypt.hash('senha123', 10)
  const customer2 = await prisma.customer.upsert({
    where: { businessId_phone: { businessId: business2.id, phone: '11988885555' } },
    update: { businessId: business2.id },
    create: {
      businessId: business2.id,
      name: 'João Silva',
      phone: '11988885555',
      email: 'joao@email.com',
      password: customer2Password,
      isAdmin: false,
    },
  })
  console.log('✅ Cliente da segunda empresa criado:', customer2.email, '| Telefone: 11988885555 | Senha: senha123')
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
    console.log('✅ Serviço disponível para empresa 1:', servico.name, '| Grupo:', servico.serviceGroup)
  }

  // Serviços para a segunda empresa (com preços ajustados)
  const servicosPremium = servicos.map(s => ({
    ...s,
    price: s.price * 1.5, // 50% mais caro para a empresa premium
  }))

  for (const servico of servicosPremium) {
    await prisma.service.upsert({
      where: { businessId_name: { businessId: business2.id, name: servico.name } },
      update: { serviceGroup: servico.serviceGroup },
      create: { ...servico, businessId: business2.id },
    })
    console.log('✅ Serviço disponível para empresa 2:', servico.name, '| Grupo:', servico.serviceGroup, '| Preço:', servico.price)
  }

  const linkServiceProducts = async (bizId: string) => {
    const shampoo = await prisma.product.findFirst({ where: { businessId: bizId, name: 'Shampoo Automotivo' } })
    const pano = await prisma.product.findFirst({ where: { businessId: bizId, name: 'Pano de Microfibra' } })
    const lavagem = await prisma.service.findFirst({ where: { businessId: bizId, name: 'Lavagem Técnica Completa' } })

    if (lavagem && shampoo) {
      await prisma.serviceProduct.upsert({
        where: { serviceId_productId: { serviceId: lavagem.id, productId: shampoo.id } },
        update: { quantity: 0.1 },
        create: { serviceId: lavagem.id, productId: shampoo.id, quantity: 0.1 },
      })
    }

    if (lavagem && pano) {
      await prisma.serviceProduct.upsert({
        where: { serviceId_productId: { serviceId: lavagem.id, productId: pano.id } },
        update: { quantity: 2 },
        create: { serviceId: lavagem.id, productId: pano.id, quantity: 2 },
      })
    }
  }

  await linkServiceProducts(business.id)
  await linkServiceProducts(business2.id)

  // Produtos e estoque inicial
  const seedProducts = async (bizId: string) => {
    const suffix = bizId.slice(0, 6)
    const products = [
      { name: 'Shampoo Automotivo', sku: `SHAMP-01-${suffix}`, unit: 'L', cost: 30.0, currentStock: 20, minStock: 5 },
      { name: 'Pano de Microfibra', sku: `PANO-01-${suffix}`, unit: 'un', cost: 5.0, currentStock: 100, minStock: 20 },
      { name: 'Cera Líquida', sku: `CERA-01-${suffix}`, unit: 'L', cost: 50.0, currentStock: 10, minStock: 3 },
    ]

    for (const product of products) {
      const created = await prisma.product.upsert({
        where: { sku: product.sku },
        update: { ...product, businessId: bizId },
        create: { ...product, businessId: bizId },
      })

      await prisma.inventoryMovement.create({
        data: {
          businessId: bizId,
          productId: created.id,
          movementType: 'IN',
          quantity: product.currentStock,
          unitCost: product.cost,
          note: 'Saldo inicial de seed',
        },
      })
    }
  }

  await seedProducts(business.id)
  await seedProducts(business2.id)

  // Templates de notificação/WhatsApp padrão
  const seedTemplates = async (bizId: string) => {
    const templates = [
      {
        type: 'APPOINTMENT_CREATED',
        title: 'Agendamento Criado',
        body: 'Seu agendamento foi criado para {appointmentDate} às {appointmentTime}.',
      },
      {
        type: 'APPOINTMENT_CONFIRMED',
        title: 'Agendamento Confirmado',
        body: 'Seu agendamento de {servicesList} está confirmado para {appointmentDate} às {appointmentTime}.',
      },
      {
        type: 'APPOINTMENT_24H_REMINDER',
        title: 'Lembrete 24h',
        body: 'Você tem um agendamento amanhã às {appointmentTime}.',
      },
      {
        type: 'APPOINTMENT_1H_REMINDER',
        title: 'Lembrete 1h',
        body: 'Seu agendamento começa em 1 hora às {appointmentTime}.',
      },
      {
        type: 'APPOINTMENT_COMPLETED',
        title: 'Obrigado pela visita',
        body: 'Conte pra gente como foi sua experiência. Avalie seu atendimento.',
      },
    ]

    for (const t of templates) {
      await prisma.notificationTemplate.upsert({
        where: { businessId_type: { businessId: bizId, type: t.type as any } },
        update: { title: t.title, body: t.body },
        create: { businessId: bizId, type: t.type as any, title: t.title, body: t.body },
      })
    }
  }

  await seedTemplates(business.id)
  await seedTemplates(business2.id)

  // Contas financeiras padrão
  const seedAccounts = async (bizId: string) => {
    const accounts = [
      { name: 'Serviços', type: 'REVENUE' as const },
      { name: 'Produtos/Consumos', type: 'EXPENSE' as const },
      { name: 'Custos Fixos', type: 'EXPENSE' as const },
    ]

    for (const acc of accounts) {
      await prisma.financialAccount.upsert({
        where: { businessId_name: { businessId: bizId, name: acc.name } },
        update: {},
        create: { businessId: bizId, name: acc.name, type: acc.type },
      })
    }
  }

  await seedAccounts(business.id)
  await seedAccounts(business2.id)

  console.log('🎉 Seed concluído!')

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
