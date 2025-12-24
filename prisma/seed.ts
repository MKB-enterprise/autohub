import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // Criar usuário admin (usando modelo Customer com isAdmin=true)
  const adminPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.customer.upsert({
    where: { phone: '11999999999' },
    update: {},
    create: {
      name: 'Administrador',
      phone: '11999999999',
      email: 'admin@autogarage.com',
      password: adminPassword,
      isAdmin: true,
    },
  })
  console.log('✅ Admin criado:', admin.email, '/ Senha: admin123')

  // Criar serviços padrão com grupos de exclusividade
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
    const existing = await prisma.service.findFirst({ where: { name: servico.name } })
    if (!existing) {
      await prisma.service.create({ data: servico })
      console.log('✅ Serviço criado:', servico.name, '| Grupo:', servico.serviceGroup)
    } else {
      // Atualizar o grupo se o serviço já existir
      await prisma.service.update({
        where: { id: existing.id },
        data: { serviceGroup: servico.serviceGroup }
      })
      console.log('✅ Serviço atualizado com grupo:', servico.name, '| Grupo:', servico.serviceGroup)
    }
  }

  // Criar configurações padrão
  const existingSettings = await prisma.settings.findFirst()
  if (!existingSettings) {
    await prisma.settings.create({
      data: {
        openingTimeWeekday: '08:00',
        closingTimeWeekday: '18:00',
        slotIntervalMinutes: 30,
        maxCarsPerSlot: 1,
        timezone: 'America/Sao_Paulo',
      },
    })
    console.log('✅ Configurações criadas')
  } else {
    console.log('⏭️ Configurações já existem')
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
