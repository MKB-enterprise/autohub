import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const url = new URL(request.url)
  const pathname = url.pathname

  // URL do site de marketing (fallback local)
  const marketingUrl = process.env.NEXT_PUBLIC_MARKETING_URL || 'http://localhost:4000'

  // Normalização de trailing slash para comparação de rotas públicas
  const normalizePath = (p: string) => {
    if (p === '/') return p
    return p.endsWith('/') ? p.slice(0, -1) : p
  }

  const normalizedPath = normalizePath(pathname)

  // Rotas públicas (fora do escopo tenant) que não devem redirecionar
  const publicPaths = new Set([
    '/',
    '/register',
    '/api/whatsapp/webhook',
    '/api/cron/process-whatsapp-queue',
    '/api/health',
    '/api/debug/tenant',
    '/api/maintenance/fix-slug',
    '/api/tenant/settings',
    '/api/tenant/info',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/google',
    '/api/auth/business/login',
    '/api/auth/business/register',
    '/api/auth/send-code',
    '/api/auth/verify-code',
    '/api/auth/me',
    '/api/auth/logout',
    '/api/tenant/branding',
    '/api/businesses'
  ])

  // 1) Sempre permitir rotas /t/{slug}/...
  if (normalizedPath.startsWith('/t/')) {
    return NextResponse.next()
  }

  // 2) Sempre permitir APIs (não redirecionar APIs)
  if (normalizedPath.startsWith('/api/')) {
    return NextResponse.next()
  }

  // 3) APIs públicas listadas acima
  if (publicPaths.has(normalizedPath)) {
    return NextResponse.next()
  }

  // 4) Bloquear qualquer outra rota fora de /t/{slug}
  return NextResponse.redirect(marketingUrl)
}

export const config = {
  matcher: [
    // Ignorar _next/* e qualquer arquivo com extensão
    '/((?!_next/|.*\\.[a-zA-Z0-9]+$).*)'
  ]
}
