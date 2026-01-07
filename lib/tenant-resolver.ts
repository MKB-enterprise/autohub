/**
 * Middleware para resolver tenant em cada request
 * Extrai tenant por:
 * 1. Subdomínio (ex: empresa.autohub.com)
 * 2. Header X-Tenant-Slug
 * 3. Path /t/empresa-slug/...
 * 
 * Injeta tenant_id no contexto para garantir isolamento
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from './db'
import { verifyToken } from './auth'

export interface TenantContext {
  tenantId: string
  tenantSlug: string
  business: {
    id: string
    name: string
    slug: string
    email: string
  } | null
}

// Cache local em memória para evitar queries desnecessárias
const tenantCache: Map<string, { business: any; expiresAt: number }> = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

const isProdMode =
  process.env.FORCE_PROD_MODE === 'true' || process.env.NODE_ENV === 'production'
const tenantCookieDomain = process.env.TENANT_COOKIE_DOMAIN || undefined

/**
 * Resolve tenant pelo slug
 */
export async function resolveTenantBySlug(slug: string): Promise<TenantContext | null> {
  // Verificar cache
  const cached = tenantCache.get(slug)
  if (cached && cached.expiresAt > Date.now()) {
    return {
      tenantId: cached.business.id,
      tenantSlug: slug,
      business: cached.business
    }
  }

  try {
    const business = await prisma.business.findUnique({
      where: { slug: slug || '' },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        isActive: true
      }
    })

    if (!business || !business.isActive) {
      return null
    }

    // Prisma type marks slug as nullable; normalize to provided slug when absent
    const normalizedBusiness = {
      ...business,
      slug: business.slug || slug
    }

    // Cachear resultado
    tenantCache.set(slug, {
      business: normalizedBusiness,
      expiresAt: Date.now() + CACHE_TTL
    })

    return {
      tenantId: normalizedBusiness.id,
      tenantSlug: normalizedBusiness.slug,
      business: normalizedBusiness
    }
  } catch (error) {
    console.error('[TenantResolver] Erro ao resolver tenant:', error)
    return null
  }
}

/**
 * Extrai slug do subdomínio
 */
function extractSubdomainSlug(hostname: string): string | null {
  // hostname = "empresa.autohub.com" ou "empresa.localhost:3000"
  const parts = hostname.split('.')
  
  // Se tem apenas 1 parte (localhost), retorna null
  if (parts.length <= 1) return null
  
  // Se tem 3+ partes, a primeira é o slug
  if (parts.length >= 3) {
    return parts[0]
  }

  return null
}

/**
 * Extrai slug do path
 */
export function extractPathSlug(pathname: string): string | null {
  // pathname = "/t/empresa-slug/..." ou "/t/empresa-slug"
  const match = pathname.match(/^\/t\/([a-z0-9-]+)/)
  return match ? match[1] : null
}

function extractCookieSlug(request: NextRequest): string | null {
  const cookie = request.cookies.get('tenant_slug')
  return cookie?.value || null
}

type TenantSource = 'header' | 'path' | 'subdomain' | 'cookie' | 'fallback' | null

/**
 * Resolve tenant a partir da requisição
 */
export async function resolveTenantFromRequest(
  request: NextRequest,
  options?: {
    pathSlug?: string
    allowDevFallback?: boolean
    allowHeaderInProd?: boolean
  }
): Promise<{
  context: TenantContext | null
  source: TenantSource
  invalidCookie: boolean
}> {
  const isDev = !isProdMode
  const allowDevFallback = options?.allowDevFallback ?? isDev
  const allowHeaderInProd = options?.allowHeaderInProd ?? false

  // 1. Header (desabilitado em produção por padrão, a menos que explicitamente permitido)
  const headerSlug = request.headers.get('x-tenant-slug')
  if (headerSlug && (!isProdMode || allowHeaderInProd)) {
    const context = await resolveTenantBySlug(headerSlug)
    if (context) return { context, source: 'header', invalidCookie: false }
  }

  // 2. Path /t/slug (preferir se informado pelo middleware)
  const pathSlug = options?.pathSlug || extractPathSlug(new URL(request.url).pathname)
  if (pathSlug) {
    const context = await resolveTenantBySlug(pathSlug)
    if (context) return { context, source: 'path', invalidCookie: false }
  }

  // 3. Subdomínio
  const hostname = request.headers.get('host') || ''
  const subdomainSlug = extractSubdomainSlug(hostname)
  if (subdomainSlug) {
    const context = await resolveTenantBySlug(subdomainSlug)
    if (context) return { context, source: 'subdomain', invalidCookie: false }
  }

  // 4. Cookie tenant_slug
  const cookieSlug = extractCookieSlug(request)
  if (cookieSlug) {
    const context = await resolveTenantBySlug(cookieSlug)
    if (context) return { context, source: 'cookie', invalidCookie: false }
    return { context: null, source: null, invalidCookie: true }
  }

  // 4b. auth_token: usar businessId do token para resolver tenant
  const authToken = request.cookies.get('auth_token')?.value
  if (authToken) {
    const payload = verifyToken(authToken)
    if (payload?.businessId) {
      const business = await prisma.business.findUnique({
        where: { id: payload.businessId },
        select: { id: true, name: true, slug: true, email: true, isActive: true }
      })

      if (business && business.isActive) {
        const slug = business.slug || pathSlug || headerSlug || cookieSlug || 'default'
        const normalizedBusiness = { ...business, slug }
        const context: TenantContext = {
          tenantId: normalizedBusiness.id,
          tenantSlug: normalizedBusiness.slug,
          business: normalizedBusiness
        }
        return { context, source: 'cookie', invalidCookie: false }
      }
    }
  }

  return { context: null, source: null, invalidCookie: false }
}

/**
 * Middleware Next.js para resolver tenant
 * Adiciona tenant ao header da response para acesso em server components
 */
export async function tenantMiddleware(
  request: NextRequest,
  options: { requireTenant: boolean }
) {
  const isDev = !isProdMode
  const requireTenant = options.requireTenant

  const url = new URL(request.url)
  const pathname = url.pathname

  // Detectar slug no path e calcular novo pathname para rewrite
  const pathSlug = extractPathSlug(pathname)
  const rewrittenPath = pathSlug
    ? pathname.replace(/^\/t\/[^/]+/, '') || '/'
    : pathname

  const requestHeaders = new Headers(request.headers)
  const cookieSlug = request.cookies.get('tenant_slug')?.value || null
  const headerSlug = request.headers.get('x-tenant-slug') || request.headers.get('X-Tenant-Slug')
  
  if (requireTenant && pathname.includes('/api/tenant')) {
    console.log('[TenantMiddleware] API Tenant Route:', {
      pathname,
      pathSlug,
      cookieSlug,
      headerSlug,
      hasAuthToken: !!request.cookies.get('auth_token')
    })
  }
  
  if (pathSlug) {
    requestHeaders.set('x-tenant-slug', pathSlug)
  } else if (headerSlug) {
    requestHeaders.set('x-tenant-slug', headerSlug)
  } else if (cookieSlug) {
    requestHeaders.set('x-tenant-slug', cookieSlug)
  }

  let effectiveContext: TenantContext | null = null
  let invalidCookie = false

  // Resolver tenant somente quando necessário
  if (options.requireTenant || pathSlug || request.headers.get('x-tenant-slug') || request.cookies.get('tenant_slug')) {
    const resolved = await resolveTenantFromRequest(request, {
      pathSlug: pathSlug ?? undefined,
      allowDevFallback: isDev,
      allowHeaderInProd: false
    })
    effectiveContext = resolved.context
    invalidCookie = resolved.invalidCookie

    // Fallback de segurança: se há pathSlug mas não resolveu, tentar resolver diretamente
    if (!effectiveContext && pathSlug) {
      effectiveContext = await resolveTenantBySlug(pathSlug)
    }
  }

  const responseHeadersRequest = {
    request: {
      headers: requestHeaders
    }
  }

  const targetUrl = new URL(rewrittenPath || '/', request.url)

  const baseResponse = pathSlug
    ? NextResponse.rewrite(targetUrl, responseHeadersRequest)
    : NextResponse.next(responseHeadersRequest)

  const currentCookie = request.cookies.get('tenant_slug')?.value
  const cookieOptions = {
    path: '/',
    sameSite: 'lax' as const,
    secure: isProdMode,
    httpOnly: true,
    domain: tenantCookieDomain
  }

  // Limpar cookie inválido
  if (invalidCookie && currentCookie) {
    baseResponse.cookies.delete('tenant_slug')
  }

  // Se não é obrigatório e não achou tenant, apenas segue (mantendo rewrite se houve /t/)
  if (!effectiveContext && !requireTenant) {
    // Tentar derivar do auth_token para rotas públicas que ainda precisam do header (ex: /configuracoes sem /t/slug)
    const authToken = request.cookies.get('auth_token')?.value
    const payload = authToken ? verifyToken(authToken) : null

    if (payload?.businessId) {
      const tenantSlug = pathSlug || requestHeaders.get('x-tenant-slug') || extractCookieSlug(request) || 'default'
      const tenantId = payload.businessId

      requestHeaders.set('x-tenant-id', tenantId)
      requestHeaders.set('x-tenant-slug', tenantSlug)
      requestHeaders.set('x-business-id', tenantId)

      const responseWithTokenTenant = pathSlug
        ? NextResponse.rewrite(targetUrl, {
            request: {
              headers: requestHeaders
            }
          })
        : NextResponse.next({
            request: {
              headers: requestHeaders
            }
          })

      // Persistir tenant_slug no cookie para futuras requisições
      if (currentCookie !== tenantSlug) {
        responseWithTokenTenant.cookies.set('tenant_slug', tenantSlug, cookieOptions)
      }

      return responseWithTokenTenant
    }

    // Fallback dev para não quebrar UI
    if (!isProdMode) {
      const fallbackCtx = await resolveTenantBySlug('default')
      if (fallbackCtx) {
        requestHeaders.set('x-tenant-id', fallbackCtx.tenantId)
        requestHeaders.set('x-tenant-slug', fallbackCtx.tenantSlug)
        requestHeaders.set('x-business-id', fallbackCtx.tenantId)

        const responseWithFallback = pathSlug
          ? NextResponse.rewrite(targetUrl, {
              request: {
                headers: requestHeaders
              }
            })
          : NextResponse.next({
              request: {
                headers: requestHeaders
              }
            })

        return responseWithFallback
      }
    }

    return baseResponse
  }

  // Rotas protegidas precisam de tenant
  if (!effectiveContext && requireTenant) {
    // Fallback adicional: tentar derivar do auth_token sem consulta ao banco para não quebrar navegação
    const authToken = request.cookies.get('auth_token')?.value
    const payload = authToken ? verifyToken(authToken) : null
    if (payload?.businessId) {
      const tenantSlug = pathSlug || requestHeaders.get('x-tenant-slug') || extractCookieSlug(request) || 'default'
      const tenantId = payload.businessId

      const responseWithTokenTenant = pathSlug
        ? NextResponse.rewrite(targetUrl, {
            request: {
              headers: new Headers({
                ...Object.fromEntries(requestHeaders),
                'x-tenant-id': tenantId,
                'x-tenant-slug': tenantSlug,
                'x-business-id': tenantId
              })
            }
          })
        : NextResponse.next({
            request: {
              headers: new Headers({
                ...Object.fromEntries(requestHeaders),
                'x-tenant-id': tenantId,
                'x-tenant-slug': tenantSlug,
                'x-business-id': tenantId
              })
            }
          })

      return responseWithTokenTenant
    }

    // Dev fallback: se ainda não encontrou, usar tenant default para não quebrar UI
    if (!isProdMode) {
      const fallbackCtx = await resolveTenantBySlug('default')
      if (fallbackCtx) {
        requestHeaders.set('x-tenant-id', fallbackCtx.tenantId)
        requestHeaders.set('x-tenant-slug', fallbackCtx.tenantSlug)
        requestHeaders.set('x-business-id', fallbackCtx.tenantId)

        const responseWithFallback = pathSlug
          ? NextResponse.rewrite(targetUrl, {
              request: {
                headers: requestHeaders
              }
            })
          : NextResponse.next({
              request: {
                headers: requestHeaders
              }
            })

        return responseWithFallback
      }
    }

    return NextResponse.json(
      { error: 'Tenant não encontrado' },
      { status: 404 }
    )
  }

  if (effectiveContext) {
    // Clonar headers e adicionar tenant info
    requestHeaders.set('x-tenant-id', effectiveContext.tenantId)
    requestHeaders.set('x-tenant-slug', effectiveContext.tenantSlug)
    requestHeaders.set(
      'x-business-id',
      effectiveContext.business?.id || effectiveContext.tenantId
    )

    const responseWithTenant = pathSlug
      ? NextResponse.rewrite(targetUrl, {
          request: {
            headers: requestHeaders
          }
        })
      : NextResponse.next({
          request: {
            headers: requestHeaders
          }
        })

    if (currentCookie !== effectiveContext.tenantSlug) {
      responseWithTenant.cookies.set('tenant_slug', effectiveContext.tenantSlug, cookieOptions)
    }

    return responseWithTenant
  }

  return baseResponse
}

/**
 * Guard: Obter tenant do request
 * Usar em route handlers
 */
export async function getTenantFromRequest(
  request: NextRequest
): Promise<TenantContext> {
  const tenantId = request.headers.get('x-tenant-id')
  const tenantSlug = request.headers.get('x-tenant-slug')

  if (!tenantId || !tenantSlug) {
    throw new Error('Tenant context não encontrado')
  }

  // Buscar dados completos do business
  const business = await prisma.business.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      slug: true,
      email: true
    }
  })

  if (!business) {
    throw new Error('Business não encontrado')
  }

  const normalizedBusiness = { ...business, slug: business.slug || tenantSlug }

  return {
    tenantId: normalizedBusiness.id,
    tenantSlug: tenantSlug,
    business: normalizedBusiness
  }
}

/**
 * Versão tolerante: retorna null ao invés de lançar quando o tenant não está presente
 * Útil para rotas públicas onde precisamos responder 400 sem quebrar o React
 */
export async function getTenantOptional(request: NextRequest): Promise<TenantContext | null> {
  try {
    const result = await resolveTenantFromRequest(request, {
      pathSlug: extractPathSlug(new URL(request.url).pathname) ?? undefined,
      allowDevFallback: !isProdMode,
      allowHeaderInProd: true
    })

    if (result.context) {
      return result.context
    }

    // Fallback extra: tentar extrair do Referer (útil quando a requisição /api não carrega /t/{slug})
    const referer = request.headers.get('referer') || ''
    try {
      const refUrl = new URL(referer)
      const refSlug = extractPathSlug(refUrl.pathname)
      if (refSlug) {
        const ctx = await resolveTenantBySlug(refSlug)
        if (ctx) return ctx
      }
    } catch {}

    // Último recurso em dev: fallback para "default"
    if (!isProdMode) {
      const ctx = await resolveTenantBySlug('default')
      if (ctx) return ctx
    }

    return null
  } catch (error) {
    console.error('[TenantResolver] getTenantOptional error:', error)
    return null
  }
}

export async function getTenantOrThrow(request: NextRequest): Promise<TenantContext> {
  const ctx = await getTenantFromRequest(request)
  if (!ctx) {
    throw new Error('Tenant context não encontrado')
  }
  return ctx
}

/**
 * Invalidar cache de tenant
 */
export function invalidateTenantCache(slug: string) {
  tenantCache.delete(slug)
}

/**
 * Limpar todo o cache (útil em testes)
 */
export function clearTenantCache() {
  tenantCache.clear()
}
