'use client'

import { ReactNode } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { PageSkeleton } from '@/components/ui/PageSkeleton'

interface ProtectedPageProps {
  children: ReactNode
  requiredRole?: 'admin' | 'customer' | 'any'
}

/**
 * Wrapper que garante que o conteúdo só é renderizado quando a autenticação foi verificada
 * Mostra loading enquanto verifica
 */
export function ProtectedPage({ children, requiredRole = 'any' }: ProtectedPageProps) {
  const { user, business, loading } = useAuth()

  // Enquanto está carregando, mostrar skeleton
  if (loading) {
    return <PageSkeleton />
  }

  // Após carregar, renderizar o conteúdo
  // A verificação de permissões vai acontecer no useRequireAuth dentro do componente
  return <>{children}</>
}
