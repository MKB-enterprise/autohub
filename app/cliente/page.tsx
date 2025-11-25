'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton'
import { Alert } from '@/components/ui/Alert'
import { useData } from '@/lib/hooks/useFetch'
import { format, differenceInHours } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'

interface Appointment {
  id: string
  startDatetime: string
  endDatetime: string
  status: string
  totalPrice: number
  notes: string | null
  businessNotes: string | null
  suggestedDatetime: string | null
  confirmedByClientAt: string | null
  confirmedByBusinessAt: string | null
  car: {
    plate: string
    model: string
  }
  appointmentServices: {
    service: {
      name: string
    }
  }[]
}

const statusLabels: Record<string, string> = {
  PENDING: 'Aguardando Confirmação',
  CONFIRMED_BY_CLIENT: 'Aguardando Estética',
  CONFIRMED: 'Confirmado ✓',
  RESCHEDULED: 'Reagendamento Sugerido',
  IN_PROGRESS: 'Em Andamento',
  COMPLETED: 'Concluído',
  CANCELED: 'Cancelado',
  NO_SHOW: 'Não Compareceu'
}

const statusVariants: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  PENDING: 'default',
  CONFIRMED_BY_CLIENT: 'info',
  CONFIRMED: 'success',
  RESCHEDULED: 'warning',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CANCELED: 'danger',
  NO_SHOW: 'danger'
}

export default function ClientePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [reputationSettings, setReputationSettings] = useState({
    enabled: true,
    minForAdvance: 3.0,
    advancePercent: 50,
    recoveryOnShow: true
  })

  // SWR para cache e revalidação automática
  const { data: customerData, isLoading, mutate } = useData<{ 
    appointments: Appointment[]
    rating: number
    noShowCount: number
    completedCount: number
  }>(
    user?.id ? `/api/customers/${user.id}` : null
  )
  const appointments = customerData?.appointments || []
  const customerRating = Number(customerData?.rating) || 5
  const noShowCount = customerData?.noShowCount || 0
  const completedCount = customerData?.completedCount || 0

  // Carregar configurações de reputação
  useEffect(() => {
    fetch('/api/settings/reputation')
      .then(res => res.ok ? res.json() : null)
      .then(data => data && setReputationSettings(data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    } else if (user && user.isAdmin) {
      router.push('/agenda')
    }
  }, [user, authLoading, router])

  const loadAppointments = useCallback(() => {
    mutate()
  }, [mutate])

  // Verificar se pode confirmar (24h antes)
  function canConfirm(appointment: Appointment): boolean {
    if (appointment.status !== 'PENDING') return false
    const hoursUntil = differenceInHours(new Date(appointment.startDatetime), new Date())
    return hoursUntil <= 24 && hoursUntil > 0
  }

  // Verificar quantas horas faltam
  function getHoursUntil(appointment: Appointment): number {
    return differenceInHours(new Date(appointment.startDatetime), new Date())
  }

  // Renderizar estrelas de reputação
  function renderStars(rating: number) {
    const stars = []
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        stars.push(<span key={i} className="text-yellow-400">★</span>)
      } else if (i - 0.5 <= rating) {
        stars.push(<span key={i} className="text-yellow-400">☆</span>)
      } else {
        stars.push(<span key={i} className="text-gray-600">★</span>)
      }
    }
    return stars
  }

  async function handleConfirmByClient(appointmentId: string) {
    setActionLoading(appointmentId)
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'CONFIRMED_BY_CLIENT',
          confirmedByClientAt: new Date().toISOString()
        })
      })

      if (!response.ok) {
        throw new Error('Erro ao confirmar agendamento')
      }

      setSuccess('Agendamento confirmado! Aguarde a confirmação da estética.')
      loadAppointments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao confirmar')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleAcceptReschedule(appointmentId: string, suggestedDatetime: string) {
    setActionLoading(appointmentId)
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'CONFIRMED_BY_CLIENT',
          startDatetime: suggestedDatetime,
          confirmedByClientAt: new Date().toISOString()
        })
      })

      if (!response.ok) {
        throw new Error('Erro ao aceitar reagendamento')
      }

      setSuccess('Novo horário aceito! Aguarde a confirmação da estética.')
      loadAppointments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao aceitar')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleCancel(appointmentId: string) {
    if (!confirm('Tem certeza que deseja cancelar este agendamento?')) {
      return
    }
    setActionLoading(appointmentId)

    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELED' })
      })

      if (!response.ok) {
        throw new Error('Erro ao cancelar agendamento')
      }

      setSuccess('Agendamento cancelado.')
      loadAppointments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cancelar')
    } finally {
      setActionLoading(null)
    }
  }

  if (authLoading) {
    return (
      <div className="space-y-6">
        <Skeleton variant="text" width={300} height={32} />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (!user || user.isAdmin) {
    return null
  }

  // Skeleton para carregamento de dados
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Meus Agendamentos</h1>
            <p className="text-gray-400 mt-1">Acompanhe e confirme seus agendamentos</p>
          </div>
          <Link href="/cliente/novo">
            <Button>+ Novo Agendamento</Button>
          </Link>
        </div>
        <Card>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="border border-gray-700 rounded-lg p-4">
                <div className="flex justify-between mb-3">
                  <div className="space-y-2">
                    <Skeleton variant="text" width={200} height={24} />
                    <Skeleton variant="text" width={120} height={16} />
                  </div>
                  <Skeleton variant="rectangular" width={100} height={24} className="rounded-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton variant="text" width="70%" height={16} />
                  <Skeleton variant="text" width="50%" height={16} />
                  <Skeleton variant="text" width={100} height={16} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    )
  }

  const now = new Date()
  const filteredAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.startDatetime)
    if (filter === 'upcoming') {
      return aptDate >= now && !['COMPLETED', 'CANCELED', 'NO_SHOW'].includes(apt.status)
    } else if (filter === 'past') {
      return aptDate < now || ['COMPLETED', 'CANCELED', 'NO_SHOW'].includes(apt.status)
    }
    return true
  })

  // Ordenar por data
  filteredAppointments.sort((a, b) => 
    new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime()
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Meus Agendamentos</h1>
          <p className="text-gray-400 mt-1">Acompanhe e confirme seus agendamentos</p>
        </div>
        <Link href="/cliente/novo">
          <Button>+ Novo Agendamento</Button>
        </Link>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      {/* Info sobre confirmação */}
      <Card>
        <div className="flex items-start gap-3">
          <span className="text-2xl">ℹ️</span>
          <div>
            <h3 className="font-medium text-white">Como funciona a confirmação?</h3>
            <p className="text-sm text-gray-400 mt-1">
              1. Você agenda o serviço → 2. Confirma 24h antes → 3. A estética confirma → 4. Agendamento garantido!
            </p>
          </div>
        </div>
      </Card>

      {/* Card de Reputação - só mostra se o sistema estiver ativado */}
      {reputationSettings.enabled && (
        <Card>
          <div className="flex items-start gap-3">
            <span className="text-2xl">⭐</span>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-white">Sua Reputação</h3>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{renderStars(customerRating)}</span>
                  <span className={`font-bold ${
                    customerRating >= 4 ? 'text-green-400' :
                    customerRating >= reputationSettings.minForAdvance ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {customerRating.toFixed(1)}
                  </span>
                </div>
              </div>
              
              <div className="flex gap-6 mt-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span className="text-gray-400">Comparecimentos:</span>
                  <span className="text-white font-medium">{completedCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-red-400">✗</span>
                  <span className="text-gray-400">Faltas:</span>
                  <span className="text-white font-medium">{noShowCount}</span>
                </div>
              </div>

              {customerRating < reputationSettings.minForAdvance && (
                <div className="mt-3 p-3 bg-red-900/30 border border-red-500/30 rounded-lg">
                  <p className="text-red-300 text-sm font-medium">
                    ⚠️ Sua reputação está baixa. Novos agendamentos exigirão pagamento antecipado de {reputationSettings.advancePercent}%.
                  </p>
                  {reputationSettings.recoveryOnShow && (
                    <p className="text-green-400 text-xs mt-1">
                      💡 Ao comparecer ao próximo agendamento, sua nota volta para 5.0!
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div className="flex gap-2 mb-6">
          <Button
            variant={filter === 'upcoming' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFilter('upcoming')}
          >
            Próximos
          </Button>
          <Button
            variant={filter === 'past' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFilter('past')}
          >
            Histórico
          </Button>
          <Button
            variant={filter === 'all' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            Todos
          </Button>
        </div>

        {filteredAppointments.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>Nenhum agendamento encontrado</p>
            <Link href="/cliente/novo">
              <Button className="mt-4">Fazer meu primeiro agendamento</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAppointments.map((appointment) => {
              const hoursUntil = getHoursUntil(appointment)
              const showConfirmButton = canConfirm(appointment)
              const needsConfirmation = appointment.status === 'PENDING' && hoursUntil > 24
              
              return (
                <div 
                  key={appointment.id} 
                  className={`border rounded-lg p-4 ${
                    appointment.status === 'CONFIRMED' 
                      ? 'border-green-500/30 bg-green-900/10'
                      : appointment.status === 'RESCHEDULED'
                      ? 'border-orange-500/30 bg-orange-900/10'
                      : appointment.status === 'CONFIRMED_BY_CLIENT'
                      ? 'border-blue-500/30 bg-blue-900/10'
                      : showConfirmButton
                      ? 'border-yellow-500/30 bg-yellow-900/10'
                      : 'border-gray-700 bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-lg text-white">
                        {format(new Date(appointment.startDatetime), "EEEE, d 'de' MMMM", { locale: ptBR })}
                      </p>
                      <p className="text-gray-400">
                        {format(new Date(appointment.startDatetime), 'HH:mm')} - {format(new Date(appointment.endDatetime), 'HH:mm')}
                      </p>
                    </div>
                    <Badge variant={statusVariants[appointment.status]}>
                      {statusLabels[appointment.status]}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm text-gray-300">
                    <p>🚗 <strong>Veículo:</strong> {appointment.car.model} - {appointment.car.plate}</p>
                    <p>🔧 <strong>Serviços:</strong> {appointment.appointmentServices.map(as => as.service.name).join(', ')}</p>
                    <p className="text-cyan-400">💰 <strong>Valor:</strong> R$ {Number(appointment.totalPrice).toFixed(2)}</p>
                  </div>

                  {/* Mensagens de status */}
                  {needsConfirmation && (
                    <div className="mt-3 p-3 bg-gray-700/50 rounded-lg">
                      <p className="text-sm text-gray-300">
                        ⏳ Faltam <strong>{hoursUntil} horas</strong> para seu agendamento. 
                        Você poderá confirmar quando faltar menos de 24h.
                      </p>
                    </div>
                  )}

                  {showConfirmButton && (
                    <div className="mt-3 p-3 bg-yellow-900/30 border border-yellow-500/30 rounded-lg">
                      <p className="text-sm text-yellow-400 mb-2">
                        ⚠️ <strong>Confirmação necessária!</strong> Faltam {hoursUntil}h para seu agendamento.
                      </p>
                      <Button 
                        size="sm" 
                        variant="success"
                        onClick={() => handleConfirmByClient(appointment.id)}
                        disabled={actionLoading === appointment.id}
                      >
                        {actionLoading === appointment.id ? 'Confirmando...' : '✓ Confirmar Presença'}
                      </Button>
                    </div>
                  )}

                  {appointment.status === 'CONFIRMED_BY_CLIENT' && (
                    <div className="mt-3 p-3 bg-blue-900/30 border border-blue-500/30 rounded-lg">
                      <p className="text-sm text-blue-400">
                        ⏳ Você confirmou sua presença. Aguardando confirmação da estética...
                      </p>
                      {appointment.confirmedByClientAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          Confirmado em {format(new Date(appointment.confirmedByClientAt), "dd/MM 'às' HH:mm")}
                        </p>
                      )}
                    </div>
                  )}

                  {appointment.status === 'CONFIRMED' && (
                    <div className="mt-3 p-3 bg-green-900/30 border border-green-500/30 rounded-lg">
                      <p className="text-sm text-green-400">
                        ✓ <strong>Agendamento confirmado!</strong> Estamos te esperando.
                      </p>
                      {appointment.confirmedByBusinessAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          Estética confirmou em {format(new Date(appointment.confirmedByBusinessAt), "dd/MM 'às' HH:mm")}
                        </p>
                      )}
                    </div>
                  )}

                  {appointment.status === 'RESCHEDULED' && appointment.suggestedDatetime && (
                    <div className="mt-3 p-3 bg-orange-900/30 border border-orange-500/30 rounded-lg">
                      <p className="text-sm text-orange-400 mb-2">
                        📅 A estética sugeriu um novo horário:
                      </p>
                      <p className="text-white font-medium mb-2">
                        {format(new Date(appointment.suggestedDatetime), "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                      </p>
                      {appointment.businessNotes && (
                        <p className="text-sm text-gray-400 mb-3">
                          Motivo: {appointment.businessNotes}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="success"
                          onClick={() => handleAcceptReschedule(appointment.id, appointment.suggestedDatetime!)}
                          disabled={actionLoading === appointment.id}
                        >
                          {actionLoading === appointment.id ? 'Aceitando...' : '✓ Aceitar Novo Horário'}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="danger"
                          onClick={() => handleCancel(appointment.id)}
                          disabled={actionLoading === appointment.id}
                        >
                          {actionLoading === appointment.id ? '...' : '✗ Cancelar'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Botão de cancelar para agendamentos ainda não confirmados */}
                  {['PENDING', 'CONFIRMED_BY_CLIENT'].includes(appointment.status) && (
                    <div className="mt-4 pt-3 border-t border-gray-700">
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleCancel(appointment.id)}
                        disabled={actionLoading === appointment.id}
                      >
                        {actionLoading === appointment.id ? 'Cancelando...' : '✗ Cancelar Agendamento'}
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
