import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { generateToken } from '@/lib/auth'

// POST /api/auth/register - Registrar novo cliente
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, password } = body

    console.log('Tentando registrar:', { name, email, phone })

    // Validações
    if (!name || !email || !phone || !password) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      )
    }

    // Verificar se já existe - verificar apenas email se fornecido
    if (email) {
      const existingCustomer = await prisma.customer.findFirst({
        where: {
          OR: [
            { email },
            { phone }
          ]
        }
      })

      if (existingCustomer) {
        return NextResponse.json(
          { error: 'Email ou telefone já cadastrado' },
          { status: 400 }
        )
      }
    }

    // Hash da senha
    console.log('Gerando hash da senha...')
    const hashedPassword = await bcrypt.hash(password, 10)

    // Criar cliente
    console.log('Criando cliente no banco...')
    const customer = await prisma.customer.create({
      data: {
        name,
        email: email || null,
        phone,
        password: hashedPassword,
        isAdmin: false
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isAdmin: true
      }
    })

    console.log('Cliente criado:', customer.id)

    // Gerar token
    const token = generateToken({
      customerId: customer.id,
      email: customer.email || '',
      isAdmin: customer.isAdmin
    })

    console.log('Token gerado com sucesso')

    // Criar resposta com cookie
    const response = NextResponse.json({
      customer,
      token
    }, { status: 201 })

    // Definir cookie de autenticação
    response.cookies.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      path: '/'
    })

    console.log('Registro completo!')
    return response
  } catch (error) {
    console.error('Erro detalhado no registro:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao criar conta' },
      { status: 500 }
    )
  }
}
