import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateToken } from '@/lib/auth'
import { cookies } from 'next/headers'
import { getTenantOptional, resolveTenantBySlug } from '@/lib/tenant-resolver'

export async function POST(request: NextRequest) {
  try {
    const { phone, code, name } = await request.json()

    let tenant = await getTenantOptional(request)
    if (!tenant) {
      // Fallback: buscar a empresa padrão (primeira empresa ativa)
      const defaultBusiness = await prisma.business.findFirst({
        where: { isActive: true },
        select: { id: true, name: true, slug: true, email: true }
      })

      if (defaultBusiness) {
        tenant = {
          tenantId: defaultBusiness.id,
          tenantSlug: defaultBusiness.slug || 'default',
          business: {
            id: defaultBusiness.id,
            name: defaultBusiness.name,
            slug: defaultBusiness.slug || 'default',
            email: defaultBusiness.email
          }
        }
      }
    }

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 400 })
    }

    if (!phone || !code) {
      return NextResponse.json({ error: 'Telefone e código são obrigatórios' }, { status: 400 })
    }

    const normalizedPhone = phone.replace(/\D/g, '')

    if (normalizedPhone.length < 10 || normalizedPhone.length > 11) {
      return NextResponse.json({ error: 'Telefone inválido' }, { status: 400 })
    }

    const business = await prisma.business.findUnique({ where: { id: tenant.tenantId } })
    if (!business) {
      return NextResponse.json({ error: 'Negócio não encontrado para este tenant' }, { status: 400 })
    }

    const customer = await prisma.customer.findUnique({
      where: { businessId_phone: { businessId: tenant.tenantId, phone: normalizedPhone } },
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
      where: { businessId_phone: { businessId: tenant.tenantId, phone: normalizedPhone } },
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
      businessId: tenant.tenantId,
      email: updatedCustomer.email || updatedCustomer.phone,
      isAdmin: updatedCustomer.isAdmin
    })

    // Definir cookie
    const cookieStore = await cookies()
    const secure = process.env.NODE_ENV === 'production'
    const tenantCookieDomain = process.env.TENANT_COOKIE_DOMAIN || undefined

    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      path: '/'
    })

    // Fixar tenant_slug para que próximos requests /api já carreguem o contexto
    cookieStore.set('tenant_slug', tenant.tenantSlug, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
      domain: tenantCookieDomain
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
