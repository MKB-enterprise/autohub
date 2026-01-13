'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LogoutRedirectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [clearing, setClearing] = useState(true)

  useEffect(() => {
    const clearAndRedirect = async () => {
      try {
        const reason = searchParams.get('reason') || 'requested'
        
        // Log razão do logout
        if (reason === 'tenant_mismatch') {
          console.warn('[LOGOUT_REDIRECT] Token mismatch detected - clearing auth')
        }

        // Fazer logout via API para limpar servidor
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include'
        })

        // Limpar cookies no cliente (segurança adicional)
        document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;'
        document.cookie = 'tenant_slug=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;'

        // Aguardar um pouco para garantir limpeza
        await new Promise(resolve => setTimeout(resolve, 300))
      } catch (error) {
        console.error('[LOGOUT_REDIRECT] Error during logout:', error)
      } finally {
        setClearing(false)
        // Redirecionar para login
        router.push('/login')
      }
    }

    clearAndRedirect()
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-center">
        <p className="text-white">Redirecionando...</p>
      </div>
    </div>
  )
}
