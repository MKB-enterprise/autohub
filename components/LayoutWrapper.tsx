'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import Sidebar from './Sidebar'
import MobileTabBar from '@/components/ui/MobileTabBar'

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, loading } = useAuth()

  // Páginas públicas sem sidebar e sem necessidade de autenticação
  const publicPages = ['/login', '/register', '/']
  const isPublicPage = publicPages.includes(pathname)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  // Páginas públicas não mostram chrome autenticado
  if (isPublicPage || !user) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100">
        <main className="max-w-6xl mx-auto px-4 md:px-8 pt-0 pb-4 md:pt-0 md:pb-8">
          {children}
        </main>
      </div>
    )
  }

  // Autenticado: sidebar em telas médias+, bottom tabs no mobile
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="flex">
        {/* Sidebar desktop/tablet */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 w-full">
          <main className="bg-gray-900/40 min-h-screen">
            <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 md:py-8 pb-28 md:pb-8">
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
