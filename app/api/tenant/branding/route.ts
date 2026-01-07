/**
 * GET /api/tenant/branding
 * Retorna apenas informações essenciais de branding do tenant
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

async function resolveTenant(request: NextRequest) {
  // 1) slug via header (páginas públicas)
  const headerSlug = request.headers.get('x-tenant-slug') || undefined
  const authToken = request.cookies.get('auth_token')?.value

  // Acesso público por slug
  if (!authToken && headerSlug) {
    const business = await prisma.business.findUnique({
      where: { slug: headerSlug },
      select: { id: true, name: true, slug: true, isActive: true }
    })

    if (!business || !business.isActive) {
      throw new Error('Tenant não encontrado ou inativo')
    }

    return { tenantId: business.id, tenantSlug: business.slug || headerSlug, business }
  }

  // Acesso autenticado via token
  if (!authToken) {
    throw new Error('Não autenticado')
  }

  const payload = verifyToken(authToken)
  if (!payload?.businessId) {
    throw new Error('Token inválido')
  }

  const business = await prisma.business.findUnique({
    where: { id: payload.businessId },
    select: { id: true, name: true, slug: true, isActive: true }
  })

  if (!business || !business.isActive) {
    throw new Error('Tenant não encontrado ou inativo')
  }

  return { tenantId: business.id, tenantSlug: business.slug || headerSlug, business }
}

function defaultBranding(displayName: string) {
  return {
    displayName,
    logoUrl: null,
    logo: null,
    favicon: null,
    theme: 'dark' as const,
    footerText: null
  }
}

export async function GET(request: NextRequest) {
  try {
    const tenant = await resolveTenant(request)

    // Garantir tenantSettings existe, mas só trabalhar com brandingConfig
    const settings = await prisma.tenantSettings.upsert({
      where: { businessId: tenant.tenantId },
      update: {},
      create: {
        businessId: tenant.tenantId,
        brandingConfig: defaultBranding(tenant.business?.name || tenant.tenantSlug || 'AutoHub')
      },
      select: { brandingConfig: true }
    })

    return NextResponse.json({
      success: true,
      branding: settings.brandingConfig,
      tenant: {
        id: tenant.tenantId,
        name: tenant.business?.name,
        slug: tenant.tenantSlug,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar branding'
    const status = message === 'Não autenticado' || message === 'Token inválido' ? 401 : 404
    return NextResponse.json({ error: message }, { status })
  }
}
