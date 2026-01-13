'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAsyncAction } from '@/lib/hooks/useAsyncAction'
import Image from 'next/image'
import { useTenant } from '@/lib/TenantContext'
import { withTenant, withTenantHeaders } from '@/lib/tenant-client'

type LoginMethod = 'phone' | 'google'

export default function LoginPage() {
  const { loginWithPhone, loginWithGoogle, user, business, loading: authLoading } = useAuth()
  const router = useRouter()
  const { tenant } = useTenant()

  // Se já está logado, redirecionar APENAS se tem um tenant válido
  useEffect(() => {
    if (!authLoading && tenant) {
      if (business) {
        // Business logado com tenant válido
        router.push(withTenant('/dashboard', tenant.slug))
      } else if (user) {
        // Cliente logado
        router.push(withTenant('/cliente', tenant.slug))
      }
    } else if (!authLoading && !tenant && (user || business)) {
      // Tem auth mas não tem tenant resolvido -> login sem tenant, fazer logout
      console.warn('[LOGIN] Auth without tenant detected - logging out')
      fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      }).finally(() => {
        document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;'
        document.cookie = 'tenant_slug=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;'
      })
    }
  }, [user, business, authLoading, tenant, router])
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('phone')
  
  // Phone
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [devCode, setDevCode] = useState('')
  const [name, setName] = useState('')
  const [needsName, setNeedsName] = useState(false)
  
  const [error, setError] = useState<string | null>(null)

  function formatPhone(input: string) {
    const digits = input.replace(/\D/g, '').slice(0, 11)

    if (digits.length <= 2) return digits
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`

    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }

    const { execute: sendCode, isLoading: sendingCode } = useAsyncAction(
      async () => {
      const response = await fetch(
        '/api/auth/send-code',
        withTenantHeaders({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone })
        }, tenant?.slug)
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao enviar código')
      }

      setCodeSent(true)
      setDevCode(data.devCode || '')
      setNeedsName(Boolean(data.needsName))
      setError(null)
      },
      { onError: (err) => setError(err.message) }
    )

    const { execute: verifyCode, isLoading: verifyingCode } = useAsyncAction(
      async () => {
      const trimmedName = name.trim()
      if (needsName && !trimmedName) {
        throw new Error('Informe seu nome para continuar')
      }

      await loginWithPhone(phone, code, trimmedName || undefined)
    },
    { onError: (err) => setError(err.message) }
  )

  const { execute: googleLogin, isLoading: googleLoading } = useAsyncAction(
    async () => {
      setError('Google Login será implementado em breve. Use login por telefone.')
      await loginWithGoogle()
    },
    { onError: (err) => setError(err.message) }
  )

  // Se está carregando, mostrar loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-950">
        <div className="w-full max-w-md">
          <Card>
            <div className="text-center">
              <p className="text-gray-400">Carregando...</p>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-950">
      <div className="w-full max-w-md">
        <Card>
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white">Login de Cliente</h1>
            <p className="text-gray-400 mt-2 text-sm">Acesse sua conta</p>
          </div>

          {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

          {/* Login Method Selector - responsive */}
          <div className="grid grid-cols-2 gap-2 md:gap-3 mb-6">
            <button
              onClick={() => setLoginMethod('phone')}
              className={`py-2.5 md:py-3 px-2 md:px-4 rounded-lg font-medium text-xs md:text-sm transition-colors border ${
                loginMethod === 'phone'
                  ? 'border-blue-500 text-blue-200'
                  : 'border-gray-700 text-gray-400 hover:text-gray-200'
              }`}
            >
              📱 Telefone
            </button>
            <button
              onClick={() => setLoginMethod('google')}
              className={`py-2.5 md:py-3 px-2 md:px-4 rounded-lg font-medium text-xs md:text-sm transition-colors border ${
                loginMethod === 'google'
                  ? 'border-blue-500 text-blue-200'
                  : 'border-gray-700 text-gray-400 hover:text-gray-200'
              }`}
            >
              🔐 Google
            </button>
          </div>

          {/* Phone Login */}
          {loginMethod === 'phone' && (
            <>
              {!codeSent ? (
                <form onSubmit={(e) => { e.preventDefault(); sendCode(); }} className="space-y-4">
                  <Input
                    label="Telefone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    required
                    maxLength={16}
                    placeholder="(11) 99999-9999"
                  />
                    <Button type="submit" className="w-full" disabled={sendingCode}>
                      {sendingCode ? '🔄 Enviando...' : '📱 Enviar código SMS'}
                  </Button>
                </form>
              ) : (
                  <form onSubmit={(e) => { e.preventDefault(); verifyCode(); }} className="space-y-4">
                  {needsName && (
                    <Input
                      label="Nome"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="Seu nome"
                    />
                  )}
                  <Input
                    label="Código de verificação"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    placeholder="000000"
                    maxLength={6}
                  />
                  {devCode && (
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <p className="text-sm text-yellow-300">
                        🔓 Código (DEV): <strong>{devCode}</strong>
                      </p>
                    </div>
                  )}
                    <Button type="submit" className="w-full" disabled={verifyingCode}>
                      {verifyingCode ? '🔄 Verificando...' : '✅ Verificar código'}
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setCodeSent(false)
                      setCode('')
                      setDevCode('')
                    }}
                    className="w-full text-sm text-blue-400 hover:text-blue-300"
                  >
                    ← Voltar
                  </button>
                </form>
              )}
            </>
          )}

          {/* Google Login */}
          {loginMethod === 'google' && (
            <div className="space-y-4">
              <Button 
                 onClick={googleLogin} 
                className="w-full"
                 disabled={googleLoading}
              >
                 {googleLoading ? '🔄 Entrando...' : '🔐 Entrar com Google'}
              </Button>
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-sm text-blue-300">
                  ℹ️ O login com Google será implementado em breve. Use o login por telefone.
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 text-center border-t border-gray-700 pt-6">
            <p className="text-sm text-gray-400 mb-4">
              Acesso de negócio?{' '}
              <Link href={withTenant('/login/business', tenant?.slug)} className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                Entrar como negócio →
              </Link>
            </p>
            <p className="text-xs text-gray-500">
              Primeira vez?{' '}
              <Link href={withTenant('/', tenant?.slug)} className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                Fazer login depois →
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}