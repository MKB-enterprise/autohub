'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import { useNavigation } from '@/lib/NavigationContext'
import Sidebar from './Sidebar'
import MobileTabBar from '@/components/ui/MobileTabBar'
import { NavigationLoader } from '@/components/NavigationLoader'

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, business, loading } = useAuth()
  const { stopNavigation } = useNavigation()

  // Ao detectar mudança de rota, encerrar overlay de navegação
  // Garante que o loader iniciado pelo Sidebar seja sempre finalizado
  useEffect(() => {
    stopNavigation()
  }, [pathname, stopNavigation])

  // Remover prefixo /t/{slug} para classificar rotas públicas corretamente
  const normalizedPath = pathname.replace(/^\/t\/[^/]+/, '') || '/'

  // Páginas públicas sem sidebar e sem necessidade de autenticação
  // Considera /login e /login/business mesmo fora de /t/{slug}
  const isPublicPage =
    normalizedPath === '/' ||
    normalizedPath.startsWith('/login') ||
    normalizedPath.startsWith('/register')

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}></div>
      </div>
    )
  }

  // Páginas públicas não mostram chrome autenticado
  // Aceita user (customer) ou business
  if (isPublicPage || (!user && !business)) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100">
        <main className="px-4 md:px-8 pt-0 pb-4 md:pt-0 md:pb-8">
          {children}
        </main>
      </div>
    )
  }

  // Autenticado: sidebar em telas médias+, bottom tabs no mobile
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <NavigationLoader />
      <div className="flex">
        {/* Sidebar desktop/tablet */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 w-full">
          <main className="bg-gray-900/40 min-h-screen">
            <div className="px-4 md:px-8 py-4 md:py-8 pb-28 md:pb-8">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* Bottom tabs somente no mobile */}
      <MobileTabBar />
    </div>
  )
}
