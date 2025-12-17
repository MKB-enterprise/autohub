import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { phone, code, name } = await request.json()

    if (!phone || !code) {
      return NextResponse.json({ error: 'Telefone e código são obrigatórios' }, { status: 400 })
    }

    const normalizedPhone = phone.replace(/\D/g, '')

    const customer = await prisma.customer.findUnique({
      where: { phone: normalizedPhone }
    })

    if (!customer) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    // Verificar código
    if (customer.verificationCode !== code) {
      return NextResponse.json({ error: 'Código inválido' }, { status: 401 })
    }

    // Verificar expiração
    if (customer.verificationExpiry && customer.verificationExpiry < new Date()) {
      return NextResponse.json({ error: 'Código expirado' }, { status: 401 })
    }

    // Atualizar cliente
    const updatedCustomer = await prisma.customer.update({
      where: { phone: normalizedPhone },
      data: {
        phoneVerified: true,
        verificationCode: null,
        verificationExpiry: null,
        // Atualizar nome se fornecido
        ...(name && customer.name === 'Usuário Temporário' ? { name } : {})
      },
      include: {
        cars: true
      }
    })

    // Gerar token JWT
    const token = generateToken({
      customerId: updatedCustomer.id,
      email: updatedCustomer.email || updatedCustomer.phone,
      isAdmin: updatedCustomer.isAdmin
    })

    // Definir cookie
    const cookieStore = await cookies()
    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 dias
    })

    return NextResponse.json({
      customer: {
        id: updatedCustomer.id,
        name: updatedCustomer.name,
        phone: updatedCustomer.phone,
        email: updatedCustomer.email,
        isAdmin: updatedCustomer.isAdmin,
      },
      hasCars: updatedCustomer.cars.length > 0,
      needsCarRegistration: updatedCustomer.cars.length === 0
    })
  } catch (error) {
    console.error('Erro ao verificar código:', error)
    return NextResponse.json({ error: 'Erro ao verificar código' }, { status: 500 })
  }
}
