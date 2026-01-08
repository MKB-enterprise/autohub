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
import { withTenant } from '@/lib/tenant-client'

export default function TenantBusinessLoginPage() {
  const { loginBusiness, business, user, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const { tenant, loading: tenantLoading } = useTenant()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Validar se tenant existe
  useEffect(() => {
    if (!tenantLoading && !tenant) {
      router.push('/')
    }
  }, [tenant, tenantLoading, router])

  // Se já está autenticado (cliente ou business), redirecionar para dashboard
  useEffect(() => {
    if (!authLoading && (business || user)) {
      router.push(withTenant('/dashboard', slug))
    }
  }, [business, user, authLoading, router, slug])

  const { execute: businessLogin, isLoading: businessLoading } = useAsyncAction(
    async () => {
      await loginBusiness(email, password)
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-950">
      <div className="w-full max-w-md">
        <Card>
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white">🏢 Painel Empresarial</h1>
            <p className="text-gray-400 mt-2 text-sm">{tenant?.name}</p>
          </div>

          {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

          <form onSubmit={(e) => { e.preventDefault(); businessLogin(); }} className="space-y-4">
            <Input
              label="Email do Negócio"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="seu@negocio.com"
            />
            <Input
              label="Senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••"
            />
            <Button type="submit" className="w-full" disabled={businessLoading}>
              {businessLoading ? '🔄 Entrando...' : '🚀 Entrar'}
            </Button>
          </form>

          <div className="mt-6 text-center border-t border-gray-700 pt-6">
            <p className="text-sm text-gray-400">
              Precisa de ajuda?{' '}
              <Link href="#" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                Fale conosco →
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
