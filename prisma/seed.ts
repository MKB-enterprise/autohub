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
    { name: 'Lavagem Simples', description: 'Lavagem externa completa', durationMinutes: 30, price: 50.00, serviceGroup: 'lavagem' },
    { name: 'Lavagem Completa', description: 'Lavagem interna e externa', durationMinutes: 60, price: 80.00, serviceGroup: 'lavagem' },
    { name: 'Polimento', description: 'Polimento técnico da pintura', durationMinutes: 180, price: 250.00, serviceGroup: 'polimento' },
    { name: 'Cristalização', description: 'Cristalização da pintura', durationMinutes: 240, price: 350.00, serviceGroup: 'polimento' },
    { name: 'Higienização Interna', description: 'Limpeza profunda do interior', durationMinutes: 120, price: 150.00, serviceGroup: 'higienizacao' },
    { name: 'Vitrificação', description: 'Proteção cerâmica de longa duração', durationMinutes: 480, price: 800.00, serviceGroup: 'protecao' },
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
