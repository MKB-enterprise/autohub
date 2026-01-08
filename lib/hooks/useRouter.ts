import { useRouter as useNextRouter } from 'next/navigation'
import { useNavigation } from '@/lib/NavigationContext'
import { useEffect } from 'react'

export function useRouter() {
  const router = useNextRouter()
  const { stopNavigation } = useNavigation()

  // Quando a rota mudar, parar o loading
  useEffect(() => {
    const handleRouteChange = () => {
      // Pequeno delay para garantir que a rota mudou
      const timer = setTimeout(() => {
        stopNavigation()
      }, 500)
      return () => clearTimeout(timer)
    }

    // Isso é um hack, pois useRouter não emite eventos de mudança de rota
    // O stopNavigation será chamado quando a página renderizar/recarregar
    return () => {
      handleRouteChange()
    }
  }, [stopNavigation])

  return router
}
