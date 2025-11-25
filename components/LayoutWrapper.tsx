'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import Sidebar from './Sidebar'

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, loading } = useAuth()

  // Páginas públicas sem sidebar
  const publicPages = ['/login', '/register', '/']
  const isPublicPage = publicPages.includes(pathname)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    )
  }

  if (isPublicPage || !user) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 bg-gray-900/50">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
