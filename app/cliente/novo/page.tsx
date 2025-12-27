'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Loading } from '@/components/ui/Loading'
import { Alert } from '@/components/ui/Alert'
import GuidedBooking from '@/components/GuidedBooking'
import QuickCarRegistration from '@/components/QuickCarRegistration'
import { format, parseISO, addMinutes } from 'date-fns'

interface Service {
  id: string
  name: string
  durationMinutes: number
  price: number
  serviceGroup: string | null
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

export default function NovoAgendamentoPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
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

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    } else if (user && user.isAdmin) {
      router.push('/agenda')
    } else if (user) {
      loadData()
    }
  }, [user, authLoading, router])

  async function loadData() {
    try {
      setLoading(true)
      const [customerRes, reputationRes] = await Promise.all([
        fetch(`/api/customers/${user?.id}`),
        fetch('/api/settings/reputation')
      ])

      if (!customerRes.ok) {
        throw new Error('Erro ao carregar dados')
      }

      const customerData = await customerRes.json()
      
      if (reputationRes.ok) {
        const reputationData = await reputationRes.json()
        setReputationSettings(reputationData)
      }

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
      router.push('/cliente')
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
      <h1 className="text-3xl font-bold mb-6">Novo Agendamento</h1>

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

