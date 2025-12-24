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

    if (normalizedPhone.length < 10 || normalizedPhone.length > 11) {
      return NextResponse.json({ error: 'Telefone inválido' }, { status: 400 })
    }

    const business = await prisma.business.findFirst()

    const customer = business
      ? await prisma.customer.findUnique({
          where: { businessId_phone: { businessId: business.id, phone: normalizedPhone } },
        })
      : await prisma.customer.findFirst({
          // fallback only se não houver business (ambiente antigo)
          where: { phone: normalizedPhone as any },
        })

    if (!customer) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    // Verificar código
    // Aceitar mock fixo para agilizar
    const isMockCode = code === '123456'

    if (!isMockCode) {
      if (customer.verificationCode !== code) {
        return NextResponse.json({ error: 'Código inválido' }, { status: 401 })
      }

      if (customer.verificationExpiry && customer.verificationExpiry < new Date()) {
        return NextResponse.json({ error: 'Código expirado' }, { status: 401 })
      }
    }

    const trimmedName = name?.trim()
    const needsName = !customer.name || customer.name === 'Usuário Temporário' || customer.name.trim() === ''

    if (needsName && !trimmedName) {
      return NextResponse.json({ error: 'Nome é obrigatório para finalizar o login' }, { status: 400 })
    }

    // Atualizar cliente
    const updatedCustomer = await prisma.customer.update({
      where: business
        ? { businessId_phone: { businessId: business.id, phone: normalizedPhone } }
        : ({ phone: normalizedPhone } as any),
      data: {
        phoneVerified: true,
        verificationCode: null,
        verificationExpiry: null,
        // Atualizar nome quando necessário
        ...(trimmedName && (needsName || customer.name !== trimmedName) ? { name: trimmedName } : {})
      },
      include: {
        cars: true
      }
    })

    // Gerar token JWT
    const token = generateToken({
      customerId: updatedCustomer.id,
      businessId: (updatedCustomer as any).businessId,
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
