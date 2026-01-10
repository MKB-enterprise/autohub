'use client'

import { useState, useEffect, lazy, Suspense } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { useRequireAuth } from '@/lib/hooks/useRequireAuth'
import { useRouter } from 'next/navigation'
import { useTenantPath } from '@/lib/tenant-path'
import { getTenantSlugFromUrl, withTenantHeaders } from '@/lib/tenant-client'
import { useForm } from 'react-hook-form'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Loading } from '@/components/ui/Loading'
import { Alert } from '@/components/ui/Alert'
import { format, parseISO, addMinutes } from 'date-fns'
import { useRef } from 'react'

// Lazy load dos componentes pesados
const GuidedBooking = lazy(() => import('@/components/GuidedBooking'))
const QuickCarRegistration = lazy(() => import('@/components/QuickCarRegistration'))

interface Service {
  id: string
  name: string
  durationMinutes: number
  price: number
  serviceGroup?: string | null
}

interface Car {
  id: string
  model: string
  plate: string
}

interface CustomerData {
  id: string
  rating: number
  noShowCount: number
  completedCount: number
  cars: Car[]
}

interface FormData {
  carId: string
  date: string
  time: string
  serviceIds: string[]
  notes: string
}

interface ReputationSettings {
  enabled: boolean
  noShowPenalty: number
  minForAdvance: number
  advancePercent: number
  recoveryOnShow: boolean
}

// Cache e dedupe de reputação por tenant para evitar storm de requisições
const reputationCache = new Map<string, { data: ReputationSettings; ts: number }>()
const reputationPromises = new Map<string, Promise<ReputationSettings>>()
const REPUTATION_TTL = 5 * 60 * 1000 // 5 minutos

export default function NovoAgendamentoPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const getTenantPath = useTenantPath()
  const [cars, setCars] = useState<Car[]>([])
  const [customerRating, setCustomerRating] = useState<number>(5)
  const [noShowCount, setNoShowCount] = useState<number>(0)
  const [completedCount, setCompletedCount] = useState<number>(0)
  const [reputationSettings, setReputationSettings] = useState<ReputationSettings>({
    enabled: true,
    noShowPenalty: 2.5,
    minForAdvance: 3.0,
    advancePercent: 50,
    recoveryOnShow: true
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNewCarModal, setShowNewCarModal] = useState(false)
  const loadStartedRef = useRef(false)

  useRequireAuth('customer')

  // Redirecionar admins para a agenda
  useEffect(() => {
    if (!authLoading && user?.isAdmin) {
      router.push(getTenantPath('agenda'))
      return
    }
    if (!authLoading && user && !loadStartedRef.current) {
      loadStartedRef.current = true
      loadData()
    }
  }, [authLoading, user?.id, router, getTenantPath])

  async function loadData() {
    try {
      setLoading(true)
      const slug = getTenantSlugFromUrl()

      const customerPromise = fetch(`/api/customers/${user?.id}`)

      const repKey = slug || 'default'
      const cached = reputationCache.get(repKey)
      const now = Date.now()
      let repPromise: Promise<ReputationSettings>

      if (cached && now - cached.ts < REPUTATION_TTL) {
        repPromise = Promise.resolve(cached.data)
      } else if (reputationPromises.has(repKey)) {
        repPromise = reputationPromises.get(repKey) as Promise<ReputationSettings>
      } else {
        const p = fetch('/api/settings/reputation', withTenantHeaders({}, slug))
          .then(res => res.ok ? res.json() : reputationSettings)
          .then(data => {
            const normalized = {
              enabled: data?.enabled ?? true,
              noShowPenalty: data?.noShowPenalty ?? 2.5,
              minForAdvance: data?.minForAdvance ?? 3.0,
              advancePercent: data?.advancePercent ?? 50,
              recoveryOnShow: data?.recoveryOnShow ?? true
            }
            reputationCache.set(repKey, { data: normalized, ts: Date.now() })
            return normalized
          })
          .finally(() => {
            reputationPromises.delete(repKey)
          })
        reputationPromises.set(repKey, p)
        repPromise = p
      }

      const [customerRes, repData] = await Promise.all([customerPromise, repPromise])

      if (!customerRes.ok) {
        throw new Error('Erro ao carregar dados')
      }

      const customerData = await customerRes.json()

      setReputationSettings(repData)

      setCars(customerData.cars || [])
      setCustomerRating(Number(customerData.rating) || 5)
      setNoShowCount(customerData.noShowCount || 0)
      setCompletedCount(customerData.completedCount || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  async function handleCarRegistrationSuccess() {
    setShowNewCarModal(false)
    try {
      const customerRes = await fetch(`/api/customers/${user?.id}`)
      if (customerRes.ok) {
        const customerData = await customerRes.json()
        setCars(customerData.cars || [])
      }
    } catch (err) {
      console.error('Erro ao recarregar dados:', err)
    }
  }

  async function handleGuidedContinue(data: { services: Service[]; date: string; time: string }) {
    if (cars.length === 0) {
      setError('Você precisa cadastrar um veículo primeiro')
      setShowNewCarModal(true)
      return
    }

    try {
      setError(null)

      const totalDuration = data.services.reduce((sum, service) => {
        return sum + (service.durationMinutes || 0)
      }, 0)

      const startDatetime = `${data.date}T${data.time}:00`
      const endDatetime = format(
        addMinutes(parseISO(startDatetime), totalDuration),
        "yyyy-MM-dd'T'HH:mm:ss"
      )

      const totalPrice = data.services.reduce((sum, service) => {
        return sum + Number(service.price || 0)
      }, 0)

      // Usar o primeiro carro do cliente
      const carId = cars[0]?.id
      
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: user?.id,
          carId,
          startDatetime,
          endDatetime,
          totalPrice,
          status: 'PENDING',
          serviceIds: data.services.map(s => s.id),
          notes: null
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao criar agendamento')
      }

      // Redirecionar imediatamente
      router.push(getTenantPath('cliente'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao agendar')
    }
  }

  if (authLoading || loading) {
    return <Loading />
  }

  if (!user || user.isAdmin) {
    return null
  }

  // Verificar se precisa de pagamento antecipado (usando configurações)
  const requiresAdvancePayment = reputationSettings.enabled && customerRating < reputationSettings.minForAdvance

  // Função para renderizar estrelas
  function renderStars(rating: number) {
    const fullStars = Math.floor(rating)
    const hasHalf = rating % 1 >= 0.5
    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0)
    
    return (
      <span className="flex items-center gap-0.5">
        {'★'.repeat(fullStars)}
        {hasHalf && '½'}
        {'☆'.repeat(emptyStars)}
      </span>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header com botão de voltar */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push(getTenantPath('cliente'))}
          className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gray-800 hover:bg-gray-700 active:bg-gray-600 transition-all text-white text-xl shadow-lg"
          aria-label="Voltar para meus agendamentos"
        >
          ←
        </button>
        <h1 className="text-2xl md:text-3xl font-bold flex-1">Novo Agendamento</h1>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Card de Reputação - só mostra se o sistema estiver ativado */}
      {reputationSettings.enabled && (
        <Card className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                📊 Sua Reputação
                <span className={`text-2xl ${customerRating >= 4 ? 'text-green-400' : customerRating >= reputationSettings.minForAdvance ? 'text-yellow-400' : 'text-red-400'}`}>
                  {renderStars(customerRating)}
                </span>
                <span className="text-sm font-normal text-gray-400">({customerRating.toFixed(1)}/5.0)</span>
              </h2>
              <div className="text-sm text-gray-400 space-y-1">
                <p>✅ Comparecimentos: <span className="text-green-400 font-medium">{completedCount}</span></p>
                <p>❌ Faltas: <span className="text-red-400 font-medium">{noShowCount}</span></p>
              </div>
            </div>
          </div>

          {/* Aviso sobre o sistema de reputação */}
          <div className="mt-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
            <p className="text-sm text-gray-300 font-medium mb-2">⚠️ Como funciona a reputação:</p>
            <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
              <li>Você começa com nota <span className="text-cyan-400 font-medium">5.0</span></li>
              <li><span className="text-red-400 font-medium">Uma falta</span> derruba sua nota para <span className="text-red-400 font-medium">{reputationSettings.noShowPenalty}</span></li>
              <li>Com nota abaixo de <span className="text-amber-400 font-medium">{reputationSettings.minForAdvance}</span>, será necessário pagamento antecipado de <span className="text-amber-400 font-medium">{reputationSettings.advancePercent}%</span></li>
              {reputationSettings.recoveryOnShow && (
                <li>Ao pagar antecipado e <span className="text-green-400 font-medium">comparecer</span>, sua nota volta para <span className="text-green-400 font-medium">5.0</span>!</li>
              )}
            </ul>
          </div>

          {/* Aviso se precisar de pagamento antecipado */}
          {requiresAdvancePayment && (
            <div className="mt-4 p-4 bg-red-900/30 border border-red-500/50 rounded-lg">
              <p className="text-red-400 font-semibold flex items-center gap-2">
                🚨 Atenção: Pagamento Antecipado Necessário
              </p>
              <p className="text-sm text-red-300 mt-2">
                Devido ao seu histórico de faltas, será necessário realizar o pagamento antecipado 
                de <span className="font-bold">{reputationSettings.advancePercent}% do valor total</span> para confirmar o agendamento.
              </p>
              {reputationSettings.recoveryOnShow && (
                <p className="text-xs text-green-400 mt-2">
                  💡 Ao comparecer a este agendamento, sua nota voltará para 5.0!
                </p>
              )}
            </div>
          )}
        </Card>
      )}

      {/* GuidedBooking - Fluxo moderno de agendamento */}
      <GuidedBooking
        onContinue={handleGuidedContinue}
        onCancel={() => router.push(getTenantPath('cliente'))}
      />

      {/* Modal Novo Carro */}
      <QuickCarRegistration
        isOpen={showNewCarModal}
        onClose={() => setShowNewCarModal(false)}
        onSuccess={handleCarRegistrationSuccess}
        customerId={user?.id || ''}
      />
    </div>
  )
}

