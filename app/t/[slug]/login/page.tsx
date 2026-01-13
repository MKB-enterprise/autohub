'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { useAsyncAction } from '@/lib/hooks/useAsyncAction'
import { useTenant } from '@/lib/TenantContext'
import { withTenant, withTenantHeaders } from '@/lib/tenant-client'
import Image from 'next/image'

type LoginMethod = 'phone' | 'google'

export default function TenantLoginPage() {
  const { loginWithPhone, loginWithGoogle, user, business, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const { tenant, settings, loading: tenantLoading } = useTenant()

  // Validar se tenant existe
  useEffect(() => {
    if (!tenantLoading && !tenant) {
      // Tenant não existe - redirecionar ou mostrar 404
      router.push('/')
    }
  }, [tenant, tenantLoading, router])

  // Se já está logado, VALIDAR se corresponde ao slug antes de redirecionar
  useEffect(() => {
    if (!authLoading && !tenantLoading) {
      if (business) {
        // Logado como business - validar se o business.id corresponde ao tenant.id do slug
        if (tenant && business.id !== tenant.tenantId) {
          console.warn('[TENANT_LOGIN] Business mismatch - business.id não corresponde ao slug tenant', {
            businessId: business.id,
            tenantId: tenant.tenantId,
            slug
          })
          // Mismatch! Fazer logout seguro
          fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
          }).finally(() => {
            // Limpar cookies
            document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;'
            document.cookie = 'tenant_slug=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;'
            // Redirecionar para login do tenant correto
            router.push(withTenant('/login', slug))
          })
          return
        }
        // Match! Redirecionar para dashboard
        router.push(withTenant('/dashboard', slug))
      } else if (user) {
        // Cliente logado - ir para área de cliente (clientes podem ser multi-tenant, menos restritivo)
        router.push(withTenant('/cliente', slug))
      }
    }
  }, [user, business, authLoading, tenantLoading, router, slug, tenant])

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
        }, slug)
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

  // Não renderizar nada até validar tenant
  if (tenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-950">
        <div className="text-gray-400">Carregando...</div>
      </div>
    )
  }

  // Tenant não existe - mostrar erro
  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-950">
        <Card>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">❌ Tenant não encontrado</h1>
            <p className="text-gray-400 mb-6">
              O tenant <code className="bg-gray-800 px-2 py-1 rounded">{slug}</code> não existe.
            </p>
            <Link href="/" className="text-blue-400 hover:text-blue-300">
              ← Voltar ao início
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  const branding = settings?.branding
  const displayName = branding?.displayName || tenant?.name || slug
  const logoUrl = branding?.logoUrl

  const initials = (displayName || slug)
    .split(' ')
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
  
  // Extrair cores do branding (com fallback)
  const primaryColor = branding?.colors?.primary || '#3B82F6'
  const secondaryColor = branding?.colors?.secondary || '#1E40AF'
  const backgroundColor = branding?.colors?.background || '#0F172A'
  const textColor = branding?.colors?.text || '#FFFFFF'

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-300"
      style={{ backgroundColor }}
    >
      <div className="w-full max-w-md">
        <div 
          className="backdrop-blur-md border transition-all duration-300 overflow-hidden p-0 rounded-lg"
          style={{ 
            borderColor: `${primaryColor}28`,
            backgroundColor: backgroundColor === '#0F172A' ? 'rgba(12, 18, 31, 0.82)' : 'rgba(255, 255, 255, 0.05)',
            boxShadow: `0 18px 40px -26px ${primaryColor}90`
          }}
        >
          {/* Hero + Header dentro do mesmo card */}
          <div
            className="border-b backdrop-blur-xl p-0"
            style={{
              borderColor: `${primaryColor}22`,
              background: `radial-gradient(circle at 30% 20%, ${primaryColor}25, transparent 45%), radial-gradient(circle at 70% 30%, ${secondaryColor}18, transparent 55%), rgba(12, 18, 31, 0.78)`
            }}
          >
            <div className="px-6 md:px-7 pt-6 pb-7">
              <div className="flex items-center justify-center mb-6">
                {logoUrl ? (
                  <div className="relative">
                    <div
                      className="absolute inset-0 rounded-3xl blur-2xl opacity-50"
                      style={{ background: `${primaryColor}55` }}
                    />
                    <Image
                      src={logoUrl}
                      alt={displayName}
                      width={320}
                      height={160}
                      className="relative max-h-[140px] md:max-h-[160px] object-contain w-auto drop-shadow-xl"
                      priority
                    />
                  </div>
                ) : (
                  <div className="relative">
                    <div
                      className="absolute inset-0 rounded-full blur-2xl opacity-60"
                      style={{ background: `${primaryColor}70` }}
                    />
                    <div
                      className="relative w-24 h-24 md:w-28 md:h-28 rounded-[18px] flex items-center justify-center text-2xl md:text-3xl font-bold shadow-lg border"
                      style={{
                        background: `linear-gradient(145deg, ${primaryColor}35, ${secondaryColor}22)`,
                        color: textColor,
                        borderColor: `${primaryColor}65`,
                        boxShadow: `0 12px 30px -18px ${primaryColor}90`
                      }}
                    >
                      {initials}
                    </div>
                  </div>
                )}
              </div>
              <div className="text-center">
                <h2 className="text-xl md:text-2xl font-black tracking-tight" style={{ color: textColor }}>
                  Bem-vindo
                </h2>
                <p className="text-sm mt-2 opacity-80" style={{ color: textColor }}>
                  Faça login para continuar
                </p>
              </div>
            </div>
          </div>

          <div className="px-5 md:px-6 py-6 md:py-7">
            <div className="text-center mb-6 md:mb-8">
              <h1 className="text-2xl md:text-3xl font-bold" style={{ color: textColor }}>
                Entrar
              </h1>
            </div>

            {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

            {/* Login Method Selector com Branding Dinâmico */}
            <div className="grid grid-cols-2 gap-2 md:gap-3 mb-6">
              <button
                onClick={() => setLoginMethod('phone')}
                className={`py-2.5 md:py-3 px-2 md:px-4 rounded-lg font-medium text-xs md:text-sm transition-all duration-200 border ${
                  loginMethod === 'phone'
                    ? 'border-opacity-100 text-white'
                    : 'border-opacity-30 opacity-60 hover:opacity-80'
                }`}
                style={loginMethod === 'phone' ? {
                  backgroundColor: primaryColor,
                  borderColor: primaryColor,
                  color: '#FFFFFF'
                } : {
                  borderColor: primaryColor,
                  color: textColor
                }}
              >
                📱 Telefone
              </button>
              <button
                onClick={() => setLoginMethod('google')}
                className={`py-2.5 md:py-3 px-2 md:px-4 rounded-lg font-medium text-xs md:text-sm transition-all duration-200 border ${
                  loginMethod === 'google'
                    ? 'border-opacity-100 text-white'
                    : 'border-opacity-30 opacity-60 hover:opacity-80'
                }`}
                style={loginMethod === 'google' ? {
                  backgroundColor: secondaryColor,
                  borderColor: secondaryColor,
                  color: '#FFFFFF'
                } : {
                  borderColor: secondaryColor,
                  color: textColor
                }}
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
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={sendingCode}
                      style={{ 
                        backgroundColor: primaryColor,
                        borderColor: primaryColor
                      }}
                    >
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
                      <div 
                        className="p-3 rounded-lg border"
                        style={{ 
                          backgroundColor: `${primaryColor}15`,
                          borderColor: `${primaryColor}50`
                        }}
                      >
                        <p className="text-sm font-medium" style={{ color: primaryColor }}>
                          🔓 Código (DEV): <strong>{devCode}</strong>
                        </p>
                      </div>
                    )}
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={verifyingCode}
                        style={{ 
                          backgroundColor: primaryColor,
                          borderColor: primaryColor
                        }}
                      >
                        {verifyingCode ? '🔄 Verificando...' : '✅ Verificar código'}
                    </Button>
                    <button
                      type="button"
                      onClick={() => {
                        setCodeSent(false)
                        setCode('')
                        setDevCode('')
                      }}
                      className="w-full text-sm font-medium hover:opacity-80 transition-opacity"
                      style={{ color: primaryColor }}
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
                  style={{ 
                    backgroundColor: secondaryColor,
                    borderColor: secondaryColor
                  }}
                   disabled={googleLoading}
                >
                   {googleLoading ? '🔄 Entrando...' : '🔐 Entrar com Google'}
                </Button>
                <div 
                  className="p-3 rounded-lg border"
                  style={{ 
                    backgroundColor: `${secondaryColor}15`,
                    borderColor: `${secondaryColor}50`
                  }}
                >
                  <p className="text-sm" style={{ color: secondaryColor }}>
                    ℹ️ O login com Google será implementado em breve. Use o login por telefone.
                  </p>
                </div>
              </div>
            )}

            {/* Footer - Link para continuar sem login */}
            <div className="mt-6 border-t pt-6" style={{ borderColor: `${primaryColor}30` }}>
              <p className="text-sm text-center" style={{ color: textColor, opacity: 0.7 }}>
                <Link 
                  href={withTenant('/', slug)} 
                  className="font-semibold hover:opacity-80 transition-opacity"
                  style={{ color: primaryColor }}
                >
                  Fazer login depois
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
