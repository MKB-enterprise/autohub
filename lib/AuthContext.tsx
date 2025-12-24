'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

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

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    try {
      // Tentar verificar login de negócio
      let response = await fetch('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        if (data.business) {
          setBusiness(data.business)
        } else if (data.user) {
          setUser(data.user)
        }
      }
    } catch (error) {
      setUser(null)
      setBusiness(null)
    } finally {
      setLoading(false)
    }
  }

  async function loginCustomer(email: string, password: string, businessId?: string) {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, businessId })
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Erro ao fazer login')
    }

    const data = await response.json()
    setUser(data.customer)

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
        router.push(`${redirect}${qs.toString() ? `?${qs.toString()}` : ''}`)
        return
      }
    } catch {}

    if (data.customer.isAdmin) {
      router.push('/agenda')
    } else {
      router.push('/cliente')
    }
  }

  async function registerCustomer(name: string, email: string, phone: string, password: string, businessId?: string) {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, password, businessId, userType: 'customer' })
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Erro ao criar conta')
    }

    const data = await response.json()
    setUser(data.customer)
    router.push('/cliente')
  }

  async function loginBusiness(email: string, password: string) {
    const response = await fetch('/api/auth/business/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Erro ao fazer login')
    }

    const data = await response.json()
    setBusiness(data.business)
    router.push('/dashboard')
  }

  async function registerBusiness(name: string, email: string, phone: string, password: string) {
    const response = await fetch('/api/auth/business/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, password })
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Erro ao criar conta')
    }

    const data = await response.json()
    setBusiness(data.business)
    router.push('/dashboard')
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    setBusiness(null)
    router.push('/login')
  }

  async function loginWithPhone(phone: string, code: string, name?: string, businessId?: string) {
    const response = await fetch('/api/auth/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code, name, businessId })
    })

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
        router.push(`${redirect}${qs.toString() ? `?${qs.toString()}` : ''}`)
        return
      }
    } catch {}

    if (data.customer.isAdmin) {
      router.push('/agenda')
    } else {
      router.push('/cliente')
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
