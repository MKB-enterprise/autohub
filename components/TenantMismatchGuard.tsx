'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { useRouter, usePathname } from 'next/navigation'

interface Props {
  expectedBusinessId: string
}

/**
 * Componente que detecta mismatch entre token e slug da URL
 * Se detectar, faz logout automático para proteger dados
 */
export default function TenantMismatchGuard({ expectedBusinessId }: Props) {
  const { business } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const hasRedirected = useRef(false)

  useEffect(() => {
    // Evitar múltiplas execuções
    if (hasRedirected.current) return
    
    // Se não tem business autenticado, não precisa validar
    if (!business?.id) return

    // Se o businessId do token não corresponde ao esperado pelo slug
    if (business.id !== expectedBusinessId) {
      console.warn('[TENANT_MISMATCH_GUARD] Token não corresponde ao tenant da URL!', {
        tokenBusinessId: business.id,
        expectedBusinessId,
        pathname
      })

      hasRedirected.current = true

      // Fazer logout e redirecionar
      window.location.href = '/login?reason=tenant-mismatch'
    }
  }, [business, expectedBusinessId, pathname, router])

  return null
}
