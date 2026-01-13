import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import { useTenant } from '@/lib/TenantContext'
import { withTenant } from '@/lib/tenant-client'

export type AccessLevel = 'super-admin' | 'business-admin' | 'business-employee' | 'customer' | 'admin' | 'any'

/**
 * Hook para verificar autenticação e redirecionar para login se necessário
 * 
 * Níveis de acesso:
 * - 'super-admin': Apenas user.role === 'super-admin' (acessa todas as tenants)
 * - 'business-admin': business user ou user.role === 'business-admin' (acessa sua tenant)
 * - 'admin': Alias para 'business-admin' (business user ou admin user)
 * - 'business-employee': business user (se tiver tipo employee) ou user.role === 'business-employee'
 * - 'customer': customer não-admin (user && !user.isAdmin)
 * - 'any': Qualquer um autenticado
 * 
 * @param accessLevel - Nível mínimo de acesso necessário
 */
export function useRequireAuth(accessLevel: AccessLevel = 'any') {
  const router = useRouter()
  const { user, business, loading: authLoading } = useAuth()
  const { tenant } = useTenant()

  useEffect(() => {
    if (authLoading) return
    
    if (!tenant?.slug) return

    const isSuperAdmin = !!(user?.isAdmin && !business)
    const isBusinessAdmin = !!business
    const isCustomer = !!(user && !user.isAdmin)
    const isAuthenticated = isSuperAdmin || isBusinessAdmin || isCustomer

    console.log(`[useRequireAuth] Level: ${accessLevel} | SuperAdmin: ${isSuperAdmin} | Business: ${isBusinessAdmin} | Customer: ${isCustomer} | Tenant: ${tenant.slug}`)

    if (!isAuthenticated) {
      const isBusinessRoute = ['/dashboard', '/configuracoes', '/clientes', '/servicos', '/pacotes', '/produtos', '/estoque', '/orcamentos', '/financeiro', '/ia', '/whatsapp'].some(route => 
        typeof window !== 'undefined' && window.location.pathname.includes(route)
      )
      
      const loginPath = isBusinessRoute 
        ? withTenant('/login/business', tenant?.slug)
        : withTenant('/login', tenant?.slug)
      
      router.push(loginPath)
      return
    }

    let hasAccess = false

    switch (accessLevel) {
      case 'super-admin':
        hasAccess = isSuperAdmin
        break
      case 'business-admin':
      case 'admin':
        hasAccess = isSuperAdmin || isBusinessAdmin
        break
      case 'business-employee':
        hasAccess = isSuperAdmin || isBusinessAdmin
        break
      case 'customer':
        hasAccess = isCustomer
        break
      case 'any':
        hasAccess = isAuthenticated
        break
    }

    if (!hasAccess) {
      console.log(`[useRequireAuth] NO ACCESS for level ${accessLevel} | Redirecting to login`)
      const loginPath = business 
        ? withTenant('/login/business', tenant?.slug)
        : withTenant('/login', tenant?.slug)
      router.push(loginPath)
    } else {
      console.log(`[useRequireAuth] ACCESS GRANTED for level ${accessLevel}`)
    }
  }, [user, business, authLoading, accessLevel, router, tenant?.slug])
}