'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Loading } from '@/components/ui/Loading'
import { Alert } from '@/components/ui/Alert'
import { ServiceSelector } from '@/components/ServiceSelector'
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
  const [services, setServices] = useState<Service[]>([])
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
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [availableTimes, setAvailableTimes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>()
  const watchDate = watch('date')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    } else if (user && user.isAdmin) {
      router.push('/agenda')
    } else if (user) {
      loadData()
    }
  }, [user, authLoading, router])

  useEffect(() => {
    console.log('useEffect triggered - watchDate:', watchDate, 'selectedServices:', selectedServices.length)
    if (watchDate && selectedServices.length > 0) {
      loadAvailableTimes(watchDate)
    } else {
      setAvailableTimes([])
    }
  }, [watchDate, selectedServices])

  async function loadData() {
    try {
      setLoading(true)
      const [servicesRes, customerRes, reputationRes] = await Promise.all([
        fetch('/api/services'),
        fetch(`/api/customers/${user?.id}`),
        fetch('/api/settings/reputation')
      ])

      if (!servicesRes.ok || !customerRes.ok) {
        throw new Error('Erro ao carregar dados')
      }

      const servicesData = await servicesRes.json()
      const customerData = await customerRes.json()
      
      if (reputationRes.ok) {
        const reputationData = await reputationRes.json()
        setReputationSettings(reputationData)
      }

      setServices(servicesData)
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

  async function loadAvailableTimes(date: string) {
    try {
      // Passar os IDs dos serviços selecionados
      const serviceIdsParam = selectedServices.join(',')
      
      console.log('=== BUSCANDO HORÁRIOS ===')
      console.log('Data:', date)
      console.log('Serviços:', serviceIdsParam)
      console.log('URL:', `/api/availability?date=${date}&serviceIds=${serviceIdsParam}`)

      const response = await fetch(`/api/availability?date=${date}&serviceIds=${serviceIdsParam}`)
      
      if (!response.ok) {
        throw new Error('Erro ao buscar horários disponíveis')
      }

      const data = await response.json()
      console.log('Resposta:', data)
      console.log('Horários disponíveis:', data.availableTimes)
      setAvailableTimes(data.availableTimes || [])
    } catch (err) {
      console.error('Erro ao carregar horários:', err)
      setAvailableTimes([])
    }
  }

  async function onSubmit(data: FormData) {
    if (selectedServices.length === 0) {
      setError('Selecione pelo menos um serviço')
      return
    }

    if (!data.carId) {
      setError('Você precisa cadastrar um veículo primeiro')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const totalDuration = selectedServices.reduce((sum, serviceId) => {
        const service = services.find(s => s.id === serviceId)
        return sum + (service?.durationMinutes || 0)
      }, 0)

      const startDatetime = `${data.date}T${data.time}:00`
      const endDatetime = format(
        addMinutes(parseISO(startDatetime), totalDuration),
        "yyyy-MM-dd'T'HH:mm:ss"
      )

      const totalPrice = selectedServices.reduce((sum, serviceId) => {
        const service = services.find(s => s.id === serviceId)
        return sum + Number(service?.price || 0)
      }, 0)

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: user?.id,
          carId: data.carId,
          startDatetime,
          endDatetime,
          totalPrice,
          status: 'PENDING',
          serviceIds: selectedServices,
          notes: data.notes || null
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao criar agendamento')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/cliente')
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao agendar')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || loading) {
    return <Loading />
  }

  if (!user || user.isAdmin) {
    return null
  }

  if (cars.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <h1 className="text-2xl font-bold mb-4">Cadastre seu Veículo</h1>
          <Alert 
            type="warning" 
            message="Você precisa cadastrar um veículo antes de fazer um agendamento."
          />
          <div className="mt-6">
            <Button onClick={() => router.push('/cliente/perfil')}>
              Ir para Meu Perfil
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const totalPrice = selectedServices.reduce((sum, serviceId) => {
    const service = services.find(s => s.id === serviceId)
    return sum + Number(service?.price || 0)
  }, 0)

  const totalDuration = selectedServices.reduce((sum, serviceId) => {
    const service = services.find(s => s.id === serviceId)
    return sum + (service?.durationMinutes || 0)
  }, 0)

  // Verificar se precisa de pagamento antecipado (usando configurações)
  const requiresAdvancePayment = reputationSettings.enabled && customerRating < reputationSettings.minForAdvance
  const advancePaymentAmount = totalPrice * (reputationSettings.advancePercent / 100)

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
      {success && <Alert type="success" message="Agendamento criado com sucesso! Redirecionando..." />}

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
              {selectedServices.length > 0 && (
                <p className="text-lg font-bold text-red-400 mt-2">
                  Valor antecipado: R$ {advancePaymentAmount.toFixed(2)}
                </p>
              )}
              {reputationSettings.recoveryOnShow && (
                <p className="text-xs text-green-400 mt-2">
                  💡 Ao comparecer a este agendamento, sua nota voltará para 5.0!
                </p>
              )}
            </div>
          )}
        </Card>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <ServiceSelector
          services={services}
          selected={selectedServices}
          onChange={(ids) => setSelectedServices(ids)}
        />

        <Card>
          <h2 className="text-xl font-semibold mb-4">Dados do Agendamento</h2>
          
          <Select
            label="Veículo"
            {...register('carId', { required: 'Selecione um veículo' })}
            error={errors.carId?.message}
            required
          >
            <option value="">Selecione...</option>
            {cars.map((car) => (
              <option key={car.id} value={car.id}>
                {car.model} - {car.plate}
              </option>
            ))}
          </Select>

          <Input
            label="Data"
            type="date"
            {...register('date', { required: 'Selecione uma data' })}
            error={errors.date?.message}
            min={format(new Date(), 'yyyy-MM-dd')}
            required
          />

          {watchDate && selectedServices.length > 0 && (
            <Select
              label="Horário"
              {...register('time', { required: 'Selecione um horário' })}
              error={errors.time?.message}
              required
            >
              <option value="">Selecione...</option>
              {availableTimes.length === 0 ? (
                <option disabled>Nenhum horário disponível</option>
              ) : (
                availableTimes.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))
              )}
            </Select>
          )}

          <Textarea
            label="Observações (opcional)"
            {...register('notes')}
            placeholder="Alguma observação especial sobre o serviço..."
          />
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={submitting || selectedServices.length === 0}>
            {submitting ? 'Agendando...' : 'Confirmar Agendamento'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.push('/cliente')}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}

