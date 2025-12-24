'use client'

import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import Sidebar from './Sidebar'
import MobileTabBar from '@/components/ui/MobileTabBar'

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, loading, logout } = useAuth()

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
        {/* Top bar público para identidade visual no mobile */}
        <header className="md:hidden sticky top-0 z-40 bg-gray-950/80 backdrop-blur border-b border-gray-800">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
            <Image src="/logo-estetica.png" alt="AutoGarage" width={28} height={28} className="rounded-md" />
            <span className="font-semibold">AutoGarage</span>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 md:px-8 py-4 md:py-8">
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
          {/* Top bar mobile autenticado */}
          <header className="md:hidden sticky top-0 z-40 bg-gray-950/80 backdrop-blur border-b border-gray-800">
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Image src="/logo-estetica.png" alt="AutoGarage" width={28} height={28} className="rounded-md" />
                <span className="font-semibold">{user.isAdmin ? 'Painel' : 'Minha Conta'}</span>
              </div>
              <button onClick={logout} className="text-sm text-gray-400 hover:text-red-400">Sair</button>
            </div>
          </header>

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
