import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

// Helper para extrair slug do path
function extractPathSlug(pathname: string): string | null {
  const match = pathname.match(/^\/t\/([a-z0-9-]+)/)
  return match ? match[1] : null
}

export function middleware(request: NextRequest) {
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
    '/login',
    '/logout-redirect',
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

  // SECURITY: Validar token autenticado na URL /t/[slug]
  // NOTE: Database validation happens at layout level and AuthContext
  // Middleware (Edge Runtime) can only verify JWT, not query database
  if (normalizedPath.startsWith('/t/')) {
    const pathSlug = extractPathSlug(pathname)
    const authToken = request.cookies.get('auth_token')?.value
    
    // Se tem slug na URL E tem token autenticado, fazer validação básica
    if (pathSlug && authToken) {
      try {
        // Apenas verificar se o token é válido (não fazer query de DB - Edge Runtime não suporta)
        const payload = verifyToken(authToken)
        if (payload?.customerId && !payload?.businessId) {
          // Cliente logado - OK, clientes podem acessar qualquer tenant
          console.log('[MIDDLEWARE] Customer token detected (no businessId restriction)')
        } else if (!payload?.businessId && !payload?.customerId) {
          // Token sem businessId nem customerId - pode ser inválido
          console.warn('[MIDDLEWARE] Token without businessId or customerId')
        }
        // A validação de correspondência slug/businessId acontece em:
        // 1. app/t/[slug]/layout.tsx (server component - pode acessar DB)
        // 2. lib/AuthContext.tsx (client side - valida contra tenant resolvido)
      } catch (error) {
        console.error('[MIDDLEWARE] Error validating token:', error)
        // Em caso de erro na validação, ser conservador e permitir (erros de token serão tratados em layout/API)
      }
    }

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
