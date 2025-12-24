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
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'
import { LottieAnimation } from '@/components/ui/LottieAnimation'
import carGarageAnimation from '@/public/animations/Car Garage animation.json'

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
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
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
  
  console.log('=== DEBUG CLIENTE ===')
  console.log('User ID:', user?.id)
  console.log('Customer Data:', customerData)
  console.log('Appointments:', customerData?.appointments)
  console.log('Is Loading:', isLoading)
  console.log('====================')
  
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

  const toggleCard = (appointmentId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev)
      if (newSet.has(appointmentId)) {
        newSet.delete(appointmentId)
      } else {
        newSet.add(appointmentId)
      }
      return newSet
    })
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
            <p className="text-slate-400 mt-1">Acompanhe seus agendamentos</p>
          </div>
          <Link href="/cliente/novo">
            <Button>+ Novo Agendamento</Button>
          </Link>
        </div>
        <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/60">
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="border border-slate-700/50 rounded-lg p-5 bg-slate-800/30">
                <div className="flex justify-between mb-4">
                  <div className="space-y-2 flex-1">
                    <Skeleton variant="text" width={200} height={28} />
                    <Skeleton variant="text" width={120} height={20} />
                  </div>
                  <Skeleton variant="rectangular" width={100} height={24} className="rounded-full" />
                </div>
                <div className="space-y-3">
                  <Skeleton variant="rectangular" width="100%" height={80} className="rounded-lg" />
                  <Skeleton variant="rectangular" width="100%" height={60} className="rounded-lg" />
                  <Skeleton variant="rectangular" width="100%" height={60} className="rounded-lg" />
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
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Meus Agendamentos</h1>
          <p className="text-sm md:text-base text-slate-400 mt-1">Acompanhe seus agendamentos e histórico</p>
        </div>
        <Link href="/cliente/novo" className="w-full md:w-auto">
          <Button className="w-full md:w-auto">➕ Novo Agendamento</Button>
        </Link>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      {/* Filtros - modernizados */}
      <div className="flex gap-2 md:gap-3">
        <button
          onClick={() => setFilter('upcoming')}
          className={`py-2 px-4 md:px-6 rounded-lg text-sm font-medium transition-all ${
            filter === 'upcoming' 
              ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30' 
              : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Próximos
        </button>
        <button
          onClick={() => setFilter('past')}
          className={`py-2 px-4 md:px-6 rounded-lg text-sm font-medium transition-all ${
            filter === 'past' 
              ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30' 
              : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Histórico
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`py-2 px-4 md:px-6 rounded-lg text-sm font-medium transition-all ${
            filter === 'all' 
              ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30' 
              : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Todos
        </button>
      </div>
      {(() => {
        const today = new Date()
        const todaysAppointment = filteredAppointments
          .filter((apt) => {
            const d = new Date(apt.startDatetime)
            const sameDay = d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
            const allowed = !['CANCELED', 'NO_SHOW', 'COMPLETED'].includes(apt.status)
            return sameDay && allowed
          })
          .sort((a, b) => new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime())[0]

        if (!todaysAppointment) return null

        return (
          <Card className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border-blue-500/30">
            <div className="flex items-start gap-4">
              <div className="text-4xl">⏰</div>
              <div className="flex-1">
                <h3 className="font-semibold text-white text-lg">Agendamento de Hoje</h3>
                <p className="text-slate-300 mt-2">
                  Você tem um horário às <strong className="text-blue-400">{format(new Date(todaysAppointment.startDatetime), 'HH:mm')}</strong> para o veículo <strong>{todaysAppointment.car.model}</strong> ({todaysAppointment.car.plate}).
                </p>
                <p className="text-sm text-slate-400 mt-2">💡 Caso precise cancelar, a estética registrará o motivo.</p>
              </div>
            </div>
          </Card>
        )
      })()}

      {/* Card de Reputação - só mostra se o sistema estiver ativado */}
      {reputationSettings.enabled && (
        <Card className="bg-gradient-to-br from-amber-900/20 to-amber-800/10 border-amber-500/20">
          <div className="flex items-start gap-4">
            <div className="text-4xl">⭐</div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white text-lg">Sua Reputação</h3>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{renderStars(customerRating)}</span>
                  <span className={`font-bold text-xl ${
                    customerRating >= 4 ? 'text-green-400' :
                    customerRating >= reputationSettings.minForAdvance ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {customerRating.toFixed(1)}
                  </span>
                </div>
              </div>
              
              <div className="flex gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-green-400 text-lg">✓</span>
                  <span className="text-slate-400">Comparecimentos:</span>
                  <span className="text-white font-semibold">{completedCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-red-400 text-lg">✗</span>
                  <span className="text-slate-400">Faltas:</span>
                  <span className="text-white font-semibold">{noShowCount}</span>
                </div>
              </div>

              {customerRating < reputationSettings.minForAdvance && (
                <div className="mt-4 p-4 bg-red-900/30 border border-red-500/30 rounded-lg">
                  <p className="text-red-300 text-sm font-medium">
                    ⚠️ Sua reputação está baixa. Novos agendamentos exigirão pagamento antecipado de {reputationSettings.advancePercent}%.
                  </p>
                  {reputationSettings.recoveryOnShow && (
                    <p className="text-green-400 text-xs mt-2">
                      💡 Ao comparecer ao próximo agendamento, sua nota volta para 5.0!
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/60">
        {filteredAppointments.length === 0 ? (
          <div className="text-center py-12">
            <div className="flex justify-center mb-6">
              <LottieAnimation 
                animationData={carGarageAnimation} 
                className="w-48 h-48"
                loop={true}
              />
            </div>
            <p className="text-slate-400 text-lg mb-2">Nenhum agendamento encontrado</p>
            <p className="text-slate-500 text-sm mb-6">Faça seu primeiro agendamento e aproveite nossos serviços!</p>
            <Link href="/cliente/novo">
              <Button>Fazer meu primeiro agendamento</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredAppointments.map((appointment) => {
              const startTime = new Date(appointment.startDatetime)
              const endTime = new Date(appointment.endDatetime)
              
              // Verificar se é hoje ou amanhã
              const now = new Date()
              const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
              const tomorrow = new Date(today)
              tomorrow.setDate(tomorrow.getDate() + 1)
              const appointmentDate = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate())
              
              const isToday = appointmentDate.getTime() === today.getTime()
              const isTomorrow = appointmentDate.getTime() === tomorrow.getTime()
              
              const isExpanded = expandedCards.has(appointment.id)
              
              return (
                <div 
                  key={appointment.id} 
                  className="bg-gradient-to-br from-slate-800/40 to-slate-900/50 border border-slate-700/50 rounded-xl overflow-hidden hover:border-slate-600/50 transition-all shadow-lg shadow-black/20"
                >
                  {/* Header compacto - sempre visível */}
                  <div className="p-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                          <h3 className="text-lg md:text-xl font-bold text-white">
                            {format(startTime, "EEE, d 'de' MMM", { locale: ptBR })}
                          </h3>
                          {isToday && (
                            <span className="px-3 py-1 bg-gradient-to-r from-orange-600 to-orange-500 text-white text-xs font-bold rounded-full shadow-lg shadow-orange-500/30">
                              HOJE
                            </span>
                          )}
                          {isTomorrow && (
                            <span className="px-3 py-1 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-xs font-bold rounded-full shadow-lg shadow-blue-500/30">
                              AMANHÃ
                            </span>
                          )}
                          <Badge variant={statusVariants[appointment.status]} className="whitespace-nowrap text-xs">
                            {statusLabels[appointment.status]}
                          </Badge>
                        </div>
                        <p className="text-slate-400 text-base">
                          {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">VALOR TOTAL</p>
                        <p className="text-2xl font-bold text-green-400">
                          R$ {Number(appointment.totalPrice).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Botão Ver Mais */}
                    <button
                      onClick={() => toggleCard(appointment.id)}
                      className="mt-4 w-full flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-white transition-colors py-2 border-t border-slate-700/30"
                    >
                      <span>{isExpanded ? 'Ver menos' : 'Ver mais'}</span>
                      <svg 
                        className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  {/* Detalhes - expandível */}
                  {isExpanded && (
                    <div className="px-5 pb-5 space-y-4 border-t border-slate-700/30 pt-4">
                      {/* Grid: Veículo e Serviços lado a lado */}
                      <div className="grid md:grid-cols-2 gap-4">
                        {/* Seção: Veículo */}
                        <div className="p-4 bg-slate-800/50 border border-slate-700/30 rounded-lg">
                          <h4 className="text-xs font-semibold text-slate-400 mb-3">VEÍCULO</h4>
                          <p className="text-white font-medium text-lg">🚗 {appointment.car.model}</p>
                          <p className="text-slate-400 mt-1">Placa: <span className="text-white font-mono">{appointment.car.plate}</span></p>
                        </div>

                        {/* Seção: Serviços */}
                        <div className="p-4 bg-slate-800/50 border border-slate-700/30 rounded-lg">
                          <h4 className="text-xs font-semibold text-slate-400 mb-3">SERVIÇOS</h4>
                          <div className="flex flex-wrap gap-2">
                            {appointment.appointmentServices.map((as, idx) => (
                              <Badge key={idx} variant="info" className="text-xs">
                                {as.service.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Estados - colapsáveis */}
                      {appointment.status === 'RESCHEDULED' && appointment.suggestedDatetime && (
                        <div className="p-4 bg-orange-900/30 border border-orange-500/40 rounded-lg">
                          <p className="text-orange-300 font-semibold mb-2">📅 Novo horário sugerido:</p>
                          <p className="text-orange-200 text-lg mb-3">
                            {format(new Date(appointment.suggestedDatetime), "d/MM 'às' HH:mm", { locale: ptBR })}
                          </p>
                          <div className="flex gap-3">
                            <Button
                              size="sm"
                              onClick={() => handleAcceptReschedule(appointment.id, appointment.suggestedDatetime!)}
                              disabled={actionLoading === appointment.id}
                              className="flex-1"
                            >
                              {actionLoading === appointment.id ? '⏳ Processando...' : '✅ Aceitar'}
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="flex-1"
                            >
                              ❌ Recusar
                            </Button>
                          </div>
                        </div>
                      )}

                      {appointment.notes && (
                        <div className="p-4 bg-slate-800/50 border border-slate-700/30 rounded-lg">
                          <p className="text-xs font-semibold text-slate-400 mb-1">OBSERVAÇÕES</p>
                          <p className="text-slate-300">{appointment.notes}</p>
                        </div>
                      )}
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
