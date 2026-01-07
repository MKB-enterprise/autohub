import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getTenantOptional } from '@/lib/tenant-resolver'

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json()

    // 1. Tentar resolver tenant normalmente
    let tenant = await getTenantOptional(request)

    // 2. Se não conseguir, buscar a empresa padrão (primeira empresa ativa)
    if (!tenant) {
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

    const business = await prisma.business.findUnique({ where: { id: tenant.tenantId } })
    if (!business) {
      return NextResponse.json({ error: 'Negócio não encontrado para este tenant' }, { status: 400 })
    }

    // Buscar ou criar cliente
    let customer = await prisma.customer.findUnique({
      where: { businessId_phone: { businessId: tenant.tenantId, phone: normalizedPhone } }
    })

    let needsName = false

    if (customer) {
      needsName = !customer.name || customer.name === 'Usuário Temporário' || customer.name.trim() === ''
      // Atualizar código de verificação
      customer = await prisma.customer.update({
        where: { businessId_phone: { businessId: tenant.tenantId, phone: normalizedPhone } },
        data: {
          verificationCode,
          verificationExpiry,
        }
      })
    } else {
      // Criar novo cliente temporário
      customer = await prisma.customer.create({
        data: {
          businessId: tenant.tenantId,
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
