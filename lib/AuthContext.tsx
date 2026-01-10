'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useTenant } from './TenantContext'
import { withTenant, withTenantHeaders, getTenantSlugFromUrl } from './tenant-client'

interface User {
  id: string
  name: string
  email: string
  phone: string
  isAdmin: boolean
}

interface Business {
  id: string
  name: string
  email: string
}

interface AuthContextType {
  user: User | null
  business: Business | null
  loading: boolean
  loginCustomer: (email: string, password: string, businessId?: string) => Promise<void>
  registerCustomer: (name: string, email: string, phone: string, password: string, businessId?: string) => Promise<void>
  loginBusiness: (email: string, password: string) => Promise<void>
  registerBusiness: (name: string, email: string, phone: string, password: string) => Promise<void>
  logout: () => Promise<void>
  loginWithPhone: (phone: string, code: string, name?: string, businessId?: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { tenant } = useTenant()

  const checkAuth = useCallback(async () => {
    setLoading(true)
    try {
      if (!tenant?.slug) {
        setUser(null)
        setBusiness(null)
        setLoading(false)
        return
      }

      const response = await fetch('/api/auth/me', withTenantHeaders({}, tenant?.slug))
      
      if (response.ok) {
        const data = await response.json()
        console.log('[AUTH CONTEXT] checkAuth response:', {
          hasBusiness: !!data.business,
          hasUser: !!data.user,
          businessId: data.business?.id ? '***' : null,
          userId: data.user?.id ? '***' : null
        })
        
        if (data.business) {
          console.log('[AUTH CONTEXT] Setting business auth')
          setBusiness(data.business)
          setUser(null)
        } else if (data.user) {
          console.log('[AUTH CONTEXT] Setting customer auth')
          setUser(data.user)
          setBusiness(null)
        } else {
          console.log('[AUTH CONTEXT] Clearing auth')
          setUser(null)
          setBusiness(null)
        }
      } else {
        console.log('[AUTH CONTEXT] Auth check failed with status:', response.status)
        setUser(null)
        setBusiness(null)
      }
    } catch (error) {
      console.error('[AUTH CONTEXT] Error in checkAuth:', error)
      setUser(null)
      setBusiness(null)
    } finally {
      setLoading(false)
    }
  }, [tenant?.slug])

  useEffect(() => {
    if (!tenant?.slug) {
      setLoading(false)
      return
    }

    checkAuth()
  }, [tenant?.slug, checkAuth])

  async function loginCustomer(email: string, password: string, businessId?: string) {
    const response = await fetch(
      '/api/auth/login',
      withTenantHeaders({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, businessId })
      }, tenant?.slug)
    )

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Erro ao fazer login')
    }

    const data = await response.json()
    // Verificar autenticação novamente (vai pegar o token do cookie)
    await checkAuth()

    // Determinar tenant slug para redirecionamento
    const tenantSlug = tenant?.slug || getTenantSlugFromUrl() || 'default'

    try {
      const current = new URL(window.location.href)
      const redirect = current.searchParams.get('redirect')
      if (redirect) {
        const qs = new URLSearchParams()
        const d = current.searchParams.get('date')
        const t = current.searchParams.get('time')
        const dur = current.searchParams.get('duration')
        const svcs = current.searchParams.get('services')
        if (d) qs.set('date', d)
        if (t) qs.set('time', t)
        if (dur) qs.set('duration', dur)
        if (svcs) qs.set('services', svcs)
        router.push(withTenant(`${redirect}${qs.toString() ? `?${qs.toString()}` : ''}` , tenantSlug))
        return
      }
    } catch {}

    if (data.customer.isAdmin) {
      router.push(withTenant('/agenda', tenantSlug))
    } else {
      router.push(withTenant('/cliente', tenantSlug))
    }
  }

  async function registerCustomer(name: string, email: string, phone: string, password: string, businessId?: string) {
    const response = await fetch(
      '/api/auth/register',
      withTenantHeaders({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, password, businessId, userType: 'customer' })
      }, tenant?.slug)
    )

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Erro ao criar conta')
    }

    const data = await response.json()
    setUser(data.customer)
    router.push(withTenant('/cliente', tenant?.slug))
  }

  async function loginBusiness(email: string, password: string) {
    const response = await fetch(
      '/api/auth/business/login',
      withTenantHeaders({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      }, tenant?.slug)
    )

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Erro ao fazer login')
    }

    const data = await response.json()
    // Definir business direto da resposta
    setBusiness(data.business)
    setUser(null)
    setLoading(false)
    
    // Redirecionar para dashboard
    const tenantSlug = tenant?.slug || getTenantSlugFromUrl() || 'default'
    const redirectPath = withTenant('/dashboard', tenantSlug)
    router.push(redirectPath)
  }

  async function registerBusiness(name: string, email: string, phone: string, password: string) {
    const response = await fetch(
      '/api/auth/business/register',
      withTenantHeaders({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, password })
      }, tenant?.slug)
    )

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Erro ao criar conta')
    }

    const data = await response.json()
    setBusiness(data.business)
    router.push(withTenant('/dashboard', tenant?.slug))
  }

  async function logout() {
    await fetch('/api/auth/logout', withTenantHeaders({ method: 'POST' }, tenant?.slug))
    setUser(null)
    setBusiness(null)
    router.push(withTenant('/login', tenant?.slug))
  }

  async function loginWithPhone(phone: string, code: string, name?: string, businessId?: string) {
    const response = await fetch(
      '/api/auth/verify-code',
      withTenantHeaders({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code, name, businessId })
      }, tenant?.slug)
    )

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Erro ao verificar código')
    }

    const data = await response.json()
    setUser(data.customer)

    try {
      const current = new URL(window.location.href)
      const redirect = current.searchParams.get('redirect')
      const d = current.searchParams.get('date')
      const t = current.searchParams.get('time')
      const dur = current.searchParams.get('duration')
      const svcs = current.searchParams.get('services')
      const qs = new URLSearchParams()
      if (d) qs.set('date', d)
      if (t) qs.set('time', t)
      if (dur) qs.set('duration', dur)
      if (svcs) qs.set('services', svcs)

      if (redirect) {
        router.push(withTenant(`${redirect}${qs.toString() ? `?${qs.toString()}` : ''}`, tenant?.slug))
        return
      }
    } catch {}

    if (data.customer.isAdmin) {
      router.push(withTenant('/agenda', tenant?.slug))
    } else {
      router.push(withTenant('/cliente', tenant?.slug))
    }
  }

  async function loginWithGoogle() {
    // Implementação futura com @react-oauth/google
    throw new Error('Login com Google em desenvolvimento')
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      business,
      loading, 
      loginCustomer, 
      registerCustomer, 
      loginBusiness,
      registerBusiness,
      logout, 
      loginWithPhone, 
      loginWithGoogle 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
