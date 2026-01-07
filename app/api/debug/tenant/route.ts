/**
 * Rota de DEBUG para diagnosticar problemas com tenant resolution
 * Acessível em: http://localhost:3000/api/debug/tenant
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  extractPathSlug,
  resolveTenantFromRequest
} from '@/lib/tenant-resolver'

export async function GET(request: NextRequest) {
  try {
    const hostname = request.headers.get('host') || 'unknown'
    const pathname = new URL(request.url).pathname
    const xTenantSlug = request.headers.get('x-tenant-slug')
    const xTenantId = request.headers.get('x-tenant-id')
    const cookieTenant = request.cookies.get('tenant_slug')?.value || null

    // Extrair slug do path se existir
    const slugFromPath = extractPathSlug(pathname)

    // Extrair slug do subdomínio
    const subdomainMatch = hostname.match(/^([^.]+)\./)
    const slugFromSubdomain =
      subdomainMatch && hostname !== 'localhost' ? subdomainMatch[1] : null

    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      request: {
        hostname,
        pathname,
        url: request.url,
        headers: {
          'host': hostname,
          'x-tenant-slug': xTenantSlug,
          'x-tenant-id': xTenantId,
          'tenant_slug_cookie': cookieTenant,
          'user-agent': request.headers.get('user-agent')
        }
      },
      extraction: {
        slugFromPath,
        slugFromSubdomain,
        slugFromHeader: xTenantSlug,
        slugFromCookie: cookieTenant,
        resolvedSlug: xTenantSlug || slugFromPath || slugFromSubdomain || 'NONE'
      },
      resolution: {
        status: 'loading...',
        source: null,
        business: null,
        error: null
      }
    }

    // Resolver tenant usando ordem completa (header -> path -> subdomínio -> cookie -> fallback dev)
    const isDev = process.env.NODE_ENV !== 'production'
    const { context, source, invalidCookie } = await resolveTenantFromRequest(request, {
      pathSlug: slugFromPath ?? undefined,
      allowDevFallback: isDev,
      allowHeaderInProd: false
    })

    diagnostics.resolution.source = source
    diagnostics.resolution.fallbackUsed = source === 'fallback'
    diagnostics.resolution.invalidCookie = invalidCookie

    if (context) {
      diagnostics.extraction.resolvedSlug = context.tenantSlug

      const business = await prisma.business.findUnique({
        where: { slug: context.tenantSlug },
        select: {
          id: true,
          name: true,
          slug: true,
          email: true,
          isActive: true,
          createdAt: true
        }
      })

      if (business) {
        diagnostics.resolution.status = business.isActive
          ? 'SUCCESS'
          : 'INACTIVE'
        diagnostics.resolution.business = business
      } else {
        diagnostics.resolution.status = 'NOT_FOUND'
        diagnostics.resolution.error = `Business com slug "${context.tenantSlug}" não encontrado no BD`
      }
    } else {
      diagnostics.resolution.status = 'NO_SLUG_DETECTED'
      diagnostics.resolution.error =
        'Não foi possível extrair slug do header/path/subdomínio/cookie'
    }

    // Contar total de businesses
    const businessCount = await prisma.business.count()
    const allBusinesses = await prisma.business.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true
      },
      take: 10
    })

    return NextResponse.json({
      message:
        '🔍 Debug Tenant Resolution - Use para diagnosticar problemas de tenant',
      diagnostics,
      database: {
        totalBusinesses: businessCount,
        samples: allBusinesses
      },
      recommendations: getRecommendations(diagnostics)
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Erro ao diagnosticar',
        message: error.message
      },
      { status: 500 }
    )
  }
}

function getRecommendations(diagnostics: any): string[] {
  const recommendations = []
  const { resolvedSlug } = diagnostics.extraction
  const { status, source } = diagnostics.resolution

  if (resolvedSlug === 'NONE') {
    recommendations.push(
      '❌ Nenhum slug foi detectado. Use uma destas formas:'
    )
    recommendations.push('  • http://localhost:3000/t/SEU-SLUG/pagina')
    recommendations.push('  • http://SEU-SLUG.localhost:3000/pagina')
    recommendations.push('  • Adicionar header: X-Tenant-Slug: SEU-SLUG')
    if (source === 'fallback') {
      recommendations.push('  • Em DEV o fallback "default" é aplicado automaticamente')
      recommendations.push('  • Em PROD não há fallback: inclua /t/{slug} ou header')
    }
    return recommendations
  }

  if (status === 'NOT_FOUND') {
    recommendations.push(
      `❌ Business com slug "${resolvedSlug}" não existe no banco`
    )
    recommendations.push('Crie um business via Prisma Studio:')
    recommendations.push('  $ npx prisma studio')
    recommendations.push('Ou rode o seed:')
    recommendations.push('  $ npx prisma db seed')
    return recommendations
  }

  if (status === 'INACTIVE') {
    recommendations.push(`⚠️ Business "${resolvedSlug}" está inativo`)
    recommendations.push('Ative via Prisma Studio (set isActive = true)')
    return recommendations
  }

  if (status === 'SUCCESS') {
    recommendations.push(
      `✅ Tenant resolvido com sucesso! Slug: "${resolvedSlug}"`
    )
    recommendations.push(
      `Agora você pode acessar: http://localhost:3000/t/${resolvedSlug}/configuracoes`
    )
    return recommendations
  }

  if (status === 'ERROR') {
    recommendations.push(
      '❌ Erro ao consultar banco. Verifique conexão PostgreSQL'
    )
    return recommendations
  }

  return ['Desconhecido']
}

// POST para testar resolução com um slug específico
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { slug } = body

    if (!slug) {
      return NextResponse.json(
        { error: 'Campo "slug" é obrigatório' },
        { status: 400 }
      )
    }

    const business = await prisma.business.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        isActive: true,
        createdAt: true
      }
    })

    if (!business) {
      return NextResponse.json(
        {
          error: 'Business não encontrado',
          slug,
          suggestion:
            'Verifique o slug no Prisma Studio (npx prisma studio)'
        },
        { status: 404 }
      )
    }

    if (!business.isActive) {
      return NextResponse.json(
        {
          error: 'Business inativo',
          business,
          suggestion: 'Ative o business (set isActive = true)'
        },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      business,
      accessUrl: `http://localhost:3000/t/${slug}/configuracoes`,
      message: `✅ Tenant "${slug}" resolvido com sucesso!`
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Erro ao processar request',
        message: error.message
      },
      { status: 500 }
    )
  }
}
