import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json()

    if (!phone) {
      return NextResponse.json({ error: 'Telefone é obrigatório' }, { status: 400 })
    }

    // Normalizar telefone (remover caracteres não numéricos)
    const normalizedPhone = phone.replace(/\D/g, '')

    if (normalizedPhone.length < 10 || normalizedPhone.length > 11) {
      return NextResponse.json({ error: 'Telefone inválido' }, { status: 400 })
    }

    // Mock fixo para agilizar login
    const verificationCode = '123456'
    const verificationExpiry = new Date(Date.now() + 30 * 60 * 1000)

    // Garantir que exista um business para atrelar o cliente
    let business = await prisma.business.findFirst()
    if (!business) {
      business = await prisma.business.create({
        data: {
          name: 'AutoGarage Demo',
          email: 'demo@autogarage.com',
          password: 'temp',
        },
      })
    }

    // Buscar ou criar cliente
    let customer = await prisma.customer.findUnique({
      where: { businessId_phone: { businessId: business.id, phone: normalizedPhone } }
    })

    let needsName = false

    if (customer) {
      needsName = !customer.name || customer.name === 'Usuário Temporário' || customer.name.trim() === ''
      // Atualizar código de verificação
      customer = await prisma.customer.update({
        where: { businessId_phone: { businessId: business.id, phone: normalizedPhone } },
        data: {
          verificationCode,
          verificationExpiry,
        }
      })
    } else {
      // Criar novo cliente temporário
      customer = await prisma.customer.create({
        data: {
          businessId: business.id,
          phone: normalizedPhone,
          name: 'Usuário Temporário', // Será atualizado após verificação
          verificationCode,
          verificationExpiry,
        }
      })
      needsName = true
    }

    // Mock explícito para desenvolvimento
    console.log(`📱 Código (mock) para ${normalizedPhone}: ${verificationCode}`)

    return NextResponse.json({
      message: 'Código enviado com sucesso',
      needsName,
      // Em desenvolvimento, retornar o código (REMOVER EM PRODUÇÃO)
      devCode: process.env.NODE_ENV === 'development' ? verificationCode : undefined
    })
  } catch (error) {
    console.error('Erro ao enviar código:', error)
    return NextResponse.json({ error: 'Erro ao enviar código' }, { status: 500 })
  }
}
