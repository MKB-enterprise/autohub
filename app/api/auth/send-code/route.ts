import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import crypto from 'crypto'

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

    // Gerar código de 6 dígitos
    const verificationCode = crypto.randomInt(100000, 999999).toString()
    
    // Código expira em 10 minutos
    const verificationExpiry = new Date(Date.now() + 10 * 60 * 1000)

    // Buscar ou criar cliente
    let customer = await prisma.customer.findUnique({
      where: { phone: normalizedPhone }
    })

    let needsName = false

    if (customer) {
      needsName = !customer.name || customer.name === 'Usuário Temporário' || customer.name.trim() === ''
      // Atualizar código de verificação
      customer = await prisma.customer.update({
        where: { phone: normalizedPhone },
        data: {
          verificationCode,
          verificationExpiry,
        }
      })
    } else {
      // Criar novo cliente temporário
      customer = await prisma.customer.create({
        data: {
          phone: normalizedPhone,
          name: 'Usuário Temporário', // Será atualizado após verificação
          verificationCode,
          verificationExpiry,
        }
      })
      needsName = true
    }

    // Em produção, aqui você enviaria o SMS via Twilio, SNS, etc.
    console.log(`📱 Código de verificação para ${normalizedPhone}: ${verificationCode}`)

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
