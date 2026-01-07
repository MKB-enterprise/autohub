/**
 * Helper para construir caminhos tenant-aware
 * Usa o slug da URL atual para construir rotas /t/{slug}/{route}
 */

export function getTenantPath(route: string): string {
  if (typeof window === 'undefined') {
    // Server-side: retorna rota sem tenant (será resolvido pelo middleware)
    return route.startsWith('/') ? route : `/${route}`
  }

  // Client-side: extrai slug da URL atual
  const pathParts = window.location.pathname.split('/')
  const slugIndex = pathParts.indexOf('t')
  
  if (slugIndex !== -1 && pathParts[slugIndex + 1]) {
    const slug = pathParts[slugIndex + 1]
    const cleanRoute = route.startsWith('/') ? route.slice(1) : route
    return `/t/${slug}/${cleanRoute}`
  }

  // Fallback: retorna rota original
  console.warn(`getTenantPath: Slug não encontrado na URL. Route: ${route}`)
  return route.startsWith('/') ? route : `/${route}`
}

/**
 * Hook para usar em componentes client
 */
import { useParams } from 'next/navigation'

export function useTenantPath() {
  const params = useParams()
  const slug = params?.slug as string | undefined

  return (route: string) => {
    if (!slug) {
      console.warn(`useTenantPath: Slug não disponível. Route: ${route}`)
      return route.startsWith('/') ? route : `/${route}`
    }

    const cleanRoute = route.startsWith('/') ? route.slice(1) : route
    return `/t/${slug}/${cleanRoute}`
  }
}
