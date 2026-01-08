'use client'

import { ReactNode } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { PageSkeleton } from '@/components/ui/PageSkeleton'

interface RequireLoadingCompleteProps {
  children: ReactNode
}

/**
 * Componente que bloqueia a renderização até que auth.loading seja false
 * Isso garante que o token foi verificado antes de renderizar qualquer coisa
 */
export function RequireLoadingComplete({ children }: RequireLoadingCompleteProps) {
  const { loading } = useAuth()

  if (loading) {
    return <PageSkeleton />
  }

  return <>{children}</>
}
