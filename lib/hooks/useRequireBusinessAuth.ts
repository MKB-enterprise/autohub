import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import { useTenant } from '@/lib/TenantContext'
import { withTenant } from '@/lib/tenant-client'

/**
 * Hook para proteger rotas de business
 * Redireciona clientes para /cliente
 * Redireciona não-autenticados para /login/business
 * 
 * Uso:
 * export default function MyBusinessPage() {
 *   useRequireBusinessAuth()
 *   // seu código aqui
 * }
 */
export function useRequireBusinessAuth() {
  const router = useRouter()
  const { user, business, loading: authLoading } = useAuth()
  const { tenant } = useTenant()

  useEffect(() => {
    if (authLoading) return // Aguardar carregamento

    // Se tem business, tá OK
    if (business) {
      return
    }

    // Se é cliente, redirecionar
    if (user && !business) {
      router.push(withTenant('/cliente', tenant?.slug))
      return
    }

    // Se não autenticado, redirecionar para login de business
    router.push(withTenant('/login/business', tenant?.slug))
  }, [user, business, authLoading, router, tenant?.slug])
}
