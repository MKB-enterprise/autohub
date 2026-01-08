'use client'

import { ReactNode } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { useTenant } from '@/lib/TenantContext'
import { PageSkeleton } from '@/components/ui/PageSkeleton'

interface AdminPageWrapperProps {
  children: ReactNode
}

/**
 * Wrapper que garante:
 * 1. Tenant foi resolvido
 * 2. Autenticação foi verificada
 * 3. User tem permissão de admin
 * 
 * Antes disso, mostra loading skeleton
 */
export function AdminPageWrapper({ children }: AdminPageWrapperProps) {
  const { user, business, loading: authLoading } = useAuth()
  const { tenant, loading: tenantLoading } = useTenant()

  console.log('[AdminPageWrapper] Estado:', { tenantLoading, authLoading, hasBusiness: !!business, hasUser: !!user })

  // Enquanto tenant ou auth estão carregando, mostrar skeleton
  if (tenantLoading || authLoading) {
    console.log('[AdminPageWrapper] ⏳ Aguardando tenant ou auth...')
    return <PageSkeleton />
  }

  // Se não tem tenant
  if (!tenant?.slug) {
    console.log('[AdminPageWrapper] ❌ Sem tenant slug')
    return <PageSkeleton />
  }

  // Se não tem business (não é admin)
  if (!business) {
    console.log('[AdminPageWrapper] ❌ Sem business (redirecionando via useRequireAuth)')
    return <PageSkeleton />
  }

  // Verificações passaram, renderizar conteúdo
  console.log('[AdminPageWrapper] ✅ Renderizando conteúdo protegido')
  return <>{children}</>
}
