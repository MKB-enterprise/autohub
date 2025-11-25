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

    if (existing) {
      console.log('✅ Admin já existe!')
      console.log('Email:', email)
      console.log('Senha:', password)
      return
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10)

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
