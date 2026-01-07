import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { generateToken } from '@/lib/auth'
import { getTenantOptional } from '@/lib/tenant-resolver'

// POST /api/auth/login - Login
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

    // 1. Tentar resolver tenant normalmente
    let tenant = await getTenantOptional(request)

    // 2. Se não conseguir, buscar o customer por email para determinar qual é o tenant
    if (!tenant && email) {
      const customer = await prisma.customer.findFirst({
        where: { email },
        select: { businessId: true }
      })

      if (customer) {
        const business = await prisma.business.findUnique({
          where: { id: customer.businessId },
          select: { id: true, name: true, slug: true, email: true, isActive: true }
        })

        if (business && business.isActive) {
          tenant = {
            tenantId: business.id,
            tenantSlug: business.slug || 'default',
            business: {
              id: business.id,
              name: business.name,
              slug: business.slug || 'default',
              email: business.email
            }
          }
        }
      }
    }

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant não encontrado' },
        { status: 400 }
      )
    }

    const business = await prisma.business.findUnique({ where: { id: tenant.tenantId } })
    if (!business) {
      return NextResponse.json(
        { error: 'Nenhuma empresa configurada' },
        { status: 400 }
      )
    }

    // Buscar cliente
    const customer = await prisma.customer.findFirst({
      where: { businessId: tenant.tenantId, email },
      select: { id: true, name: true, email: true, phone: true, isAdmin: true, password: true, businessId: true }
    })

    if (!customer || !customer.password) {
      return NextResponse.json(
        { error: 'Email ou senha inválidos' },
        { status: 401 }
      )
    }

    // Verificar senha
    const isValidPassword = await bcrypt.compare(password, customer.password)

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Email ou senha inválidos' },
        { status: 401 }
      )
    }

    // Gerar token
    const token = generateToken({
      customerId: customer.id,
      businessId: customer.businessId as any,
      email: customer.email!,
      isAdmin: customer.isAdmin
    })

    // Criar resposta com cookie
    const response = NextResponse.json({
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        isAdmin: customer.isAdmin
      },
      token
    })

    response.cookies.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      path: '/'
    })

    return response
  } catch (error) {
    console.error('Erro no login:', error)
    return NextResponse.json(
      { error: 'Erro ao fazer login' },
      { status: 500 }
    )
  }
}
