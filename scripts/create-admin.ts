import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function createAdmin() {
  try {
    const email = 'admin@estetica.com'
    const password = 'admin123'
    const name = 'Administrador'
    const phone = '(00) 00000-0000'

    // Verificar se já existe
    const existing = await prisma.customer.findUnique({
      where: { email }
    })

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10)

    if (existing) {
      const admin = await prisma.customer.update({
        where: { email },
        data: {
          name,
          phone,
          password: hashedPassword,
          isAdmin: true
        }
      })
      console.log('🔄 Admin encontrado. Senha e dados atualizados.')
      console.log('Email:', email)
      console.log('Senha:', password)
      console.log('ID:', admin.id)
      return
    }

    // Criar admin
    const admin = await prisma.customer.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        isAdmin: true
      }
    })

    console.log('✅ Admin criado com sucesso!')
    console.log('Email:', email)
    console.log('Senha:', password)
    console.log('ID:', admin.id)
  } catch (error) {
    console.error('❌ Erro ao criar admin:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()
