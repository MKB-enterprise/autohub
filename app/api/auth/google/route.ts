import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateToken } from '@/lib/auth'
import { cookies } from 'next/headers'

// Esta é uma implementação simplificada
// Em produção, você usaria a biblioteca @react-oauth/google ou next-auth

export async function POST(request: NextRequest) {
  try {
    const { credential, googleId, email, name } = await request.json()

    if (!googleId || !email) {
      return NextResponse.json({ error: 'Dados do Google inválidos' }, { status: 400 })
    }

    // Buscar cliente por googleId ou email
    let customer = await prisma.customer.findFirst({
      where: {
        OR: [
          { googleId },
          { email }
        ]
      },
      include: {
        cars: true
      }
    })

    if (customer) {
      // Atualizar googleId se não existir
      if (!customer.googleId) {
        customer = await prisma.customer.update({
          where: { id: customer.id },
          data: { googleId },
          include: { cars: true }
        })
      }
    } else {
      // Criar novo cliente
      // Gerar um telefone temporário único baseado no googleId
      const tempPhone = `google_${googleId.substring(0, 10)}`
      
      customer = await prisma.customer.create({
        data: {
          googleId,
          email,
          name: name || 'Usuário Google',
          phone: tempPhone,
          phoneVerified: false,
        },
        include: { cars: true }
      })
    }

    // Gerar token JWT
    const token = generateToken({
      customerId: customer.id,
      email: customer.email || customer.phone,
      isAdmin: customer.isAdmin
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
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        isAdmin: customer.isAdmin,
      },
      hasCars: customer.cars.length > 0,
      needsCarRegistration: customer.cars.length === 0
    })
  } catch (error) {
    console.error('Erro ao autenticar com Google:', error)
    return NextResponse.json({ error: 'Erro ao autenticar com Google' }, { status: 500 })
  }
}
