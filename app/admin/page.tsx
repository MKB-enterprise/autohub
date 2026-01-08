"use client"

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { useRouter } from 'next/navigation'
import { useRequireAuth } from '@/lib/hooks/useRequireAuth'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { Badge } from '@/components/ui/Badge'
import Link from 'next/link'

interface Business {
  id: string
  name: string
  slug: string
  email: string
  phone?: string
  subscriptionPlan: string
  subscriptionStatus: string
  monthlyPrice: number
}

export default function AdminDashboard() {
  const { user, business, loading: authLoading } = useAuth()
  const router = useRouter()
  
  // Proteger: só super-admin ou business-admin
  useRequireAuth('business-admin')

  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Carregar empresas se for super-admin
  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/businesses')
        if (!response.ok) throw new Error('Falha ao carregar empresas')
        const data = await response.json()
        setBusinesses(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido')
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading && (user?.isAdmin || business)) {
      fetchBusinesses()
    }
  }, [authLoading, user, business])

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🏢 Gerenciamento de Empresas</h1>
          <p className="text-gray-400">Acesso exclusivo para administradores</p>
        </div>

        {/* Informação do usuário logado */}
        {!authLoading && (
          <Card className="mb-8 bg-gray-900 border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Logado como:</p>
                <p className="text-white font-semibold">
                  {business ? `${business.name} (Admin)` : `${user?.name} (Super Admin)`}
                </p>
              </div>
              <Button variant="secondary" onClick={() => router.push('/logout')}>
                Sair
              </Button>
            </div>
          </Card>
        )}

        {/* Error */}
        {error && (
          <Card className="mb-8 bg-red-900/20 border-red-700">
            <p className="text-red-300">❌ {error}</p>
          </Card>
        )}

        {/* Lista de empresas */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">Empresas Disponíveis</h2>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          ) : businesses.length === 0 ? (
            <Card className="text-center py-12">
              <p className="text-gray-400">Nenhuma empresa encontrada</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {businesses.map((biz) => (
                <div
                  key={biz.id}
                  onClick={() => router.push(`/t/${biz.slug}/dashboard`)}
                  className="cursor-pointer"
                >
                  <Card
                    className="hover:border-blue-500 transition-colors h-full"
                  >
                    <div className="flex flex-col h-full justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-2">{biz.name}</h3>
                      <p className="text-gray-400 text-sm mb-3">{biz.email}</p>
                      
                      <div className="flex gap-2 mb-4">
                        <Badge variant="default">{biz.subscriptionPlan}</Badge>
                        <Badge 
                          variant={biz.subscriptionStatus === 'ACTIVE' ? 'success' : 'warning'}
                        >
                          {biz.subscriptionStatus}
                        </Badge>
                      </div>

                      {biz.phone && (
                        <p className="text-gray-400 text-sm mb-2">📞 {biz.phone}</p>
                      )}
                      <p className="text-gray-300 text-sm font-semibold">
                        R$ {biz.monthlyPrice.toFixed(2)}/mês
                      </p>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Link href={`/t/${biz.slug}/dashboard`} className="flex-1">
                        <Button variant="primary" className="w-full">
                          Acessar
                        </Button>
                      </Link>
                      <Link href={`/t/${biz.slug}/login/business`} className="flex-1">
                        <Button variant="secondary" className="w-full">
                          Login
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

