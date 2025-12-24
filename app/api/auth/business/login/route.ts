import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { generateToken } from '@/lib/auth'

// POST /api/auth/business/login - Login de estética
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    // Buscar negócio
    const business = await prisma.business.findUnique({
      where: { email }
    })

    if (!business) {
      return NextResponse.json({ error: 'Email ou senha incorretos' }, { status: 401 })
    }

    // Verificar senha
    const passwordValid = await bcrypt.compare(password, business.password)

    if (!passwordValid) {
      return NextResponse.json({ error: 'Email ou senha incorretos' }, { status: 401 })
    }

    // Verificar se está ativo
    if (!business.isActive) {
      return NextResponse.json({ error: 'Conta desativada' }, { status: 403 })
    }

    // Verificar subscrição
    if (business.subscriptionStatus !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Assinatura inativa. Por favor, renove sua assinatura.' },
        { status: 403 }
      )
    }

    // Gerar token
    const token = generateToken({
      businessId: business.id,
      email: business.email,
      isAdmin: true
    })

    const response = NextResponse.json({
      business: {
        id: business.id,
        name: business.name,
        email: business.email,
        subscriptionPlan: business.subscriptionPlan
      },
      token
    })

    response.cookies.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    })

    return response
  } catch (error) {
    console.error('Erro ao fazer login:', error)
    return NextResponse.json({ error: 'Erro ao fazer login' }, { status: 500 })
  }
}
