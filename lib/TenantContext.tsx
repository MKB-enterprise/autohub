/**
 * Hook e Context para gerenciar tenant no frontend
 * Carrega configurações de tenant e aplica branding dinamicamente
 */

'use client'

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
import { TenantSettingsData } from '@/lib/tenant-settings'
import { getTenantSlugFromUrl, withTenantHeaders } from '@/lib/tenant-client'

interface TenantContextType {
  tenant: {
    id: string
    name: string
    slug: string
  } | null
  settings: TenantSettingsData | null
  loading: boolean
  error: string | null
  refreshSettings: () => Promise<void>
}

const TenantContext = createContext<TenantContextType | undefined>(undefined)

// Cache global (nível módulo) para evitar duplo fetch em StrictMode
const globalBrandingCache = new Map<string, { branding: any; tenant: any; timestamp: number }>()
const CACHE_TTL = 60000 // 1 minuto
// Controle global de carregamento em andamento (previne múltiplos fetches simultâneos)
const loadingPromises = new Map<string, Promise<any>>()

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<TenantContextType['tenant']>(null)
  const [settings, setSettings] = useState<TenantSettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Carregar tenant e settings ao montar
  useEffect(() => {
    loadTenantAndSettings()
  }, [])

  // Aplicar branding quando settings carregar
  useEffect(() => {
    if (settings) {
      applyBranding(settings)
    }
  }, [settings])

  async function loadTenantAndSettings() {
    setError(null)
    
    try {
      setLoading(true)

      const slug = getTenantSlugFromUrl()

      if (!slug) {
        setTenant(null)
        setSettings(null)
        return
      }

      const cached = globalBrandingCache.get(slug)
      const now = Date.now()
      
      if (cached && (now - cached.timestamp) < CACHE_TTL) {
        const data = { branding: cached.branding, tenant: cached.tenant }
        
        setSettings({
          branding: data.branding,
          hours: undefined as any,
          capacity: undefined as any,
          cards: undefined as any,
          contact: undefined as any,
          notification: undefined as any,
        })
        setError(null)
        setTenant({
          id: data.tenant?.id || slug,
          name: data.tenant?.name || data.branding?.displayName || slug,
          slug: slug
        })
        setLoading(false)
        return
      }

      const existingPromise = loadingPromises.get(slug)
      if (existingPromise) {
        const data = await existingPromise
        setSettings({
          branding: data.branding,
          hours: undefined as any,
          capacity: undefined as any,
          cards: undefined as any,
          contact: undefined as any,
          notification: undefined as any,
        })
        setError(null)
        setTenant({
          id: data.tenant?.id || slug,
          name: data.tenant?.name || data.branding?.displayName || slug,
          slug: slug
        })
        setLoading(false)
        return
      }

      const fetchPromise = fetch(
        '/api/tenant/branding',
        withTenantHeaders({}, slug)
      ).then(async (response) => {
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Tenant não encontrado')
        }

        const data = await response.json()
        
        // Salvar no cache global
        globalBrandingCache.set(slug, {
          branding: data.branding,
          tenant: data.tenant,
          timestamp: now
        })
        
        return data
      }).finally(() => {
        // Remover promise do mapa quando terminar
        loadingPromises.delete(slug)
      })
      
      // Armazenar promise
      loadingPromises.set(slug, fetchPromise)
      
      // Aguardar resultado
      const data = await fetchPromise
      // Construir settings mínimos com branding; demais configs podem ser carregadas sob demanda
      setSettings({
        branding: data.branding,
        hours: undefined as any,
        capacity: undefined as any,
        cards: undefined as any,
        contact: undefined as any,
        notification: undefined as any,
      })
      setError(null)

      setTenant({
        id: data.tenant?.id || slug,
        name: data.tenant?.name || data.branding?.displayName || slug,
        slug: slug
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar configurações')
      setTenant(null)
      setSettings(null)
    } finally {
      setLoading(false)
    }
  }

  async function refreshSettings() {
    if (!tenant) return
    await loadTenantAndSettings()
  }

  return (
    <TenantContext.Provider
      value={{
        tenant,
        settings,
        loading,
        error,
        refreshSettings
      }}
    >
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  const context = useContext(TenantContext)
  if (!context) {
    throw new Error('useTenant deve ser usado dentro de TenantProvider')
  }
  return context
}

/**
 * Aplica branding do tenant no documento
 */
function applyBranding(settings: TenantSettingsData) {
  if (typeof document === 'undefined') return

  const branding = settings.branding
  const root = document.documentElement

  // Aplicar tema (claro/escuro) - FORÇAR o tema do tenant
  // Nota: Isso sobrescreve a preferência do usuário com a do tenant
  if (branding.theme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }

  // Aplicar logo (se tiver favicon)
  if (branding.favicon?.url) {
    const faviconLink = document.querySelector("link[rel='icon']") as HTMLLinkElement
    if (faviconLink) {
      faviconLink.href = branding.favicon.url
    } else {
      const link = document.createElement('link')
      link.rel = 'icon'
      link.href = branding.favicon.url
      document.head.appendChild(link)
    }
  }

  // Aplicar título
  if (branding.displayName) {
    document.title = branding.displayName
  }
}

/**
 * Hook para acessar configurações de branding
 */
export function useBranding() {
  const { settings } = useTenant()
  return settings?.branding || null
}
