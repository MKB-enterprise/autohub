import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { useTenant } from '@/lib/TenantContext'
import { withTenant } from '@/lib/tenant-client'

/**
 * Hook para proteger rotas de business
 * Redireciona clientes para /cliente
 * Redireciona não-autenticados para /login/business
 * 
 * Returns boolean: true = permitido, false = bloqueado (ainda validando ou redirecting)
 * 
 * Uso:
 * export default function MyBusinessPage() {
 *   const isAllowed = useRequireBusinessAuth()
 *   if (!isAllowed) return null // Bloqueia renderização enquanto valida
 *   // seu código aqui
 * }
 */
export function useRequireBusinessAuth(): boolean {
  const { user, business, loading: authLoading } = useAuth()
  const { tenant } = useTenant()
  const [isValidated, setIsValidated] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)
  const logoutInitiatedRef = useRef(false)

  useEffect(() => {
    // Skip if logout already initiated - prevents repeated attempts across renders
    if (logoutInitiatedRef.current) {
      console.log('[REQUIRE_BUSINESS_AUTH] Logout already initiated (ref check), skipping...')
      return
    }

    console.log('[REQUIRE_BUSINESS_AUTH] Check:', { 
      authLoading, 
      hasUser: !!user, 
      hasBusiness: !!business,
      tenantSlug: tenant?.slug
    })

    if (authLoading) {
      setShouldRender(false)
      setIsValidated(false)
      return // Aguardar carregamento
    }

    // ❌ NÃO PERMITIR: Cliente logado tentando acessar rota de business
    if (user && !business) {
      console.log('[REQUIRE_BUSINESS_AUTH] Cliente tentando acessar rota de business - redirecionando para área do cliente')
      setShouldRender(false)
      logoutInitiatedRef.current = true // Prevent multiple redirects
      
      // Redirecionar para área do cliente (NÃO fazer logout!)
      window.location.href = withTenant('/cliente', tenant?.slug)
      return
    }

    // ✅ PERMITIR: Business logado
    if (business && !user) {
      console.log('[REQUIRE_BUSINESS_AUTH] Allowed - has business')
      setShouldRender(true)
      setIsValidated(true)
      return
    }

    // ❌ NÃO PERMITIR: Não autenticado
    console.log('[REQUIRE_BUSINESS_AUTH] Redirecting - not authenticated')
    setShouldRender(false)
    // Hard redirect for non-authenticated users
    window.location.href = withTenant('/login/business', tenant?.slug)
  }, [user, business, authLoading, tenant?.slug])

  // Return false while:
  // 1. Still loading auth
  // 2. Still validated and allowed to render
  return isValidated && shouldRender
}
