'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type LoginMethod = 'email' | 'phone' | 'google'

export default function LoginPage() {
  const { loginCustomer, loginWithPhone, loginWithGoogle } = useAuth()
  const router = useRouter()
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('phone')
  
  // Email/Password
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  // Phone
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [devCode, setDevCode] = useState('')
  const [name, setName] = useState('')
  const [needsName, setNeedsName] = useState(false)
  
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function formatPhone(input: string) {
    const digits = input.replace(/\D/g, '').slice(0, 11)

    if (digits.length <= 2) return digits
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`

    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await loginCustomer(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao enviar código')
      }

      setCodeSent(true)
      setDevCode(data.devCode || '')
      setNeedsName(Boolean(data.needsName))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar código')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const trimmedName = name.trim()
      if (needsName && !trimmedName) {
        throw new Error('Informe seu nome para continuar')
      }

      await loginWithPhone(phone, code, trimmedName || undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao verificar código')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    setError(null)
    setLoading(true)

    try {
      // Em produção, usar @react-oauth/google
      // Por ora, simulação para desenvolvimento
      setError('Google Login será implementado em breve. Use login por telefone.')
      await loginWithGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login com Google')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-950">
      <div className="w-full max-w-md">
        <Card>
          <div className="text-center mb-6 md:mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 mb-4 rounded-2xl bg-blue-600 shadow-lg shadow-blue-500/20">
              <svg className="w-7 h-7 md:w-8 md:h-8 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 17H5C3.89543 17 3 16.1046 3 15V9C3 7.89543 3.89543 7 5 7H19C20.1046 7 21 7.89543 21 9V15C21 16.1046 20.1046 17 19 17Z" stroke="currentColor" strokeWidth="2"/>
                <path d="M7 7L9 5H15L17 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="7" cy="12" r="1.5" fill="currentColor"/>
                <circle cx="17" cy="12" r="1.5" fill="currentColor"/>
              </svg>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">Login</h1>
            <p className="text-gray-400 mt-2 text-sm">Acesse sua conta</p>
          </div>

          {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

          {/* Login Method Selector - responsive */}
          <div className="grid grid-cols-3 gap-2 md:gap-3 mb-6">
            <button
              onClick={() => setLoginMethod('phone')}
              className={`py-2.5 md:py-3 px-2 md:px-4 rounded-lg font-medium text-xs md:text-sm transition-all ${
                loginMethod === 'phone'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              📱 Telefone
            </button>
            <button
              onClick={() => setLoginMethod('google')}
              className={`py-2.5 md:py-3 px-2 md:px-4 rounded-lg font-medium text-xs md:text-sm transition-all ${
                loginMethod === 'google'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              🔐 Google
            </button>
            <button
              onClick={() => setLoginMethod('email')}
              className={`py-2.5 md:py-3 px-2 md:px-4 rounded-lg font-medium text-xs md:text-sm transition-all ${
                loginMethod === 'email'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              ✉️ Email
            </button>
          </div>

          {/* Phone Login */}
          {loginMethod === 'phone' && (
            <>
              {!codeSent ? (
                <form onSubmit={handleSendCode} className="space-y-4">
                  <Input
                    label="Telefone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    required
                    maxLength={16}
                    placeholder="(11) 99999-9999"
                  />
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? '🔄 Enviando...' : '📱 Enviar código SMS'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyCode} className="space-y-4">
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
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? '🔄 Verificando...' : '✅ Verificar código'}
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
                onClick={handleGoogleLogin} 
                className="w-full"
                disabled={loading}
              >
                {loading ? '🔄 Entrando...' : '🔐 Entrar com Google'}
              </Button>
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-sm text-blue-300">
                  ℹ️ O login com Google será implementado em breve. Use o login por telefone.
                </p>
              </div>
            </div>
          )}

          {/* Email/Password Login */}
          {loginMethod === 'email' && (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
              />
              <Input
                label="Senha"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••"
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? '🔄 Entrando...' : '🚀 Entrar'}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              Primeira vez aqui?{' '}
              <Link href="/" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                Ver horários disponíveis →
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
