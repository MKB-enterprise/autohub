'use client'

import { useNavigation } from '@/lib/NavigationContext'

export function NavigationLoader() {
  const { isNavigating } = useNavigation()

  if (!isNavigating) return null

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center pointer-events-none">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}></div>
        <p className="text-white font-medium">Carregando...</p>
      </div>
    </div>
  )
}
