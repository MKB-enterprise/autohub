'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { AppointmentCard } from '@/components/AppointmentCard'
import { useData } from '@/lib/hooks/useFetch'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAsyncAction } from '@/lib/hooks/useAsyncAction'

interface DashboardStats {
  appointmentsToday: number
  appointmentsYesterday: number
  totalClients: number
  clientsGrowth: number
  carsInService: number
  revenueToday: number
  revenueAverage: number
}

interface RecentAppointment {
  id: string
  customer: { name: string; phone: string }
  car: { model: string; plate: string }
  appointmentServices: { service: { name: string } }[]
  startDatetime: string
  endDatetime: string
  status: string
  totalPrice: number
}

const statusLabels: Record<string, string> = {
  PENDING: 'Pendente',
  CONFIRMED_BY_CLIENT: 'Cliente Confirmou',
  CONFIRMED: 'Confirmado',
  RESCHEDULED: 'Reagendamento',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluído',
  CANCELED: 'Cancelado',
  NO_SHOW: 'Não Compareceu'
}

export default function DashboardPage() {
  // SWR para cache e revalidação automática
  const { data: stats, isLoading: loadingStats } = useData<DashboardStats>('/api/dashboard/stats')
  const { data: appointmentsData, isLoading: loadingAppointments, mutate: refreshAppointments } = useData<RecentAppointment[]>('/api/appointments?limit=5')
  
  const recentAppointments = appointmentsData?.slice(0, 5) || []
  const [hideValues, setHideValues] = useState(false)
  const [rescheduleModal, setRescheduleModal] = useState<string | null>(null)
  const [rescheduleReason, setRescheduleReason] = useState('')
  const loading = loadingStats || loadingAppointments

  // Auto-check status changes a cada minuto
  useEffect(() => {
    const interval = setInterval(() => {
      refreshAppointments()
    }, 60000)
    return () => clearInterval(interval)
  }, [refreshAppointments])

  // Persistir modo privacidade (ocultar valores)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = window.localStorage.getItem('dashboard-hide-values')
    if (saved === 'true') setHideValues(true)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('dashboard-hide-values', hideValues ? 'true' : 'false')
  }, [hideValues])

  function formatRevenue(value: number): string {
    if (value >= 1000) {
      return (value / 1000).toFixed(3).replace('.', '.')
    }
    return value.toFixed(2).replace('.', ',')
  }



    const [updatingAppointment, setUpdatingAppointment] = useState<string | null>(null)

    const handleStartAppointment = async (appointmentId: string) => {
      if (updatingAppointment) return
      setUpdatingAppointment(appointmentId)
      try {
        const res = await fetch(`/api/appointments/${appointmentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'IN_PROGRESS' })
        })
        if (res.ok) refreshAppointments()
      } finally {
        setUpdatingAppointment(null)
      }
    }

    const handleNoShow = async (appointmentId: string) => {
      if (updatingAppointment) return
      setUpdatingAppointment(appointmentId)
      try {
        const res = await fetch(`/api/appointments/${appointmentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'NO_SHOW' })
        })
        if (res.ok) refreshAppointments()
      } finally {
        setUpdatingAppointment(null)
      }
    }

    const handleRequestReschedule = async (appointmentId: string) => {
      if (!rescheduleReason.trim() || updatingAppointment) return
      setUpdatingAppointment(appointmentId)
      try {
        const res = await fetch(`/api/appointments/${appointmentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'RESCHEDULED', rescheduleReason: rescheduleReason.trim() })
        })
        if (res.ok) {
          setRescheduleModal(null)
          setRescheduleReason('')
          refreshAppointments()
        }
      } finally {
        setUpdatingAppointment(null)
      }
    }

  const sortedAppointments = [...recentAppointments].sort((a, b) =>
    new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime()
  )

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1">Visão geral do seu negócio</p>
        </div>
        
        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
              <Skeleton variant="text" width={100} height={16} />
              <Skeleton variant="text" width={80} height={40} className="mt-2" />
              <Skeleton variant="text" width={60} height={14} className="mt-1" />
            </div>
          ))}
        </div>
        
        {/* Recent Appointments Skeleton */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <Skeleton variant="text" width={200} height={24} className="mb-6" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-4 border-b border-gray-800 last:border-0">
                <div className="flex items-center gap-4">
                  <Skeleton variant="circular" width={40} height={40} />
                  <div className="space-y-2">
                    <Skeleton variant="text" width={120} height={16} />
                    <Skeleton variant="text" width={80} height={14} />
                  </div>
                </div>
                <Skeleton variant="rectangular" width={80} height={24} className="rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1">Visão geral do seu negócio</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setHideValues(v => !v)}
            className="flex items-center gap-2 text-sm text-slate-200 bg-slate-800/60 border border-slate-700/60 rounded-full px-3 py-1.5 hover:border-slate-500/60 hover:text-white transition-colors"
            aria-label={hideValues ? 'Mostrar valores' : 'Ocultar valores'}
          >
            {hideValues ? (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94a10.94 10.94 0 0 1-5.94 1.73c-5 0-9.27-3.11-11-7.67a12.77 12.77 0 0 1 2.94-4.18" />
                <path d="m1 1 22 22" />
                <path d="M9.53 9.53a3 3 0 0 0 4.24 4.24" />
                <path d="M9.88 4.24A10.93 10.93 0 0 1 12 4c5 0 9.27 3.11 11 7.67a12.76 12.76 0 0 1-2.17 3.19" />
              </svg>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
            <span>{hideValues ? 'Mostrar valores' : 'Ocultar valores'}</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Agendamentos Hoje */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/60 border border-slate-700/40 hover:border-blue-500/40 rounded-2xl p-6 transition-all hover:shadow-lg hover:shadow-blue-500/5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Agendamentos</p>
              <p className="text-slate-500 text-xs">Hoje</p>
              <p className="text-4xl font-bold text-white mt-3">{hideValues ? '•••' : stats?.appointmentsToday || 0}</p>
              <p className="text-blue-400 text-xs font-semibold mt-2">
                {hideValues ? '•••' : `+${Math.max(0, (stats?.appointmentsToday || 0) - (stats?.appointmentsYesterday || 0))} vs ontem`}
              </p>
            </div>
            <div className="text-blue-500/40 text-3xl">📅</div>
          </div>
        </div>

        {/* Clientes Ativos */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/60 border border-slate-700/40 hover:border-purple-500/40 rounded-2xl p-6 transition-all hover:shadow-lg hover:shadow-purple-500/5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Clientes</p>
              <p className="text-slate-500 text-xs">Ativos</p>
              <p className="text-4xl font-bold text-white mt-3">{hideValues ? '•••' : stats?.totalClients || 0}</p>
              <p className="text-purple-400 text-xs font-semibold mt-2">
                {hideValues ? '•••' : `+${stats?.clientsGrowth || 0}% este mês`}
              </p>
            </div>
            <div className="text-purple-500/40 text-3xl">👥</div>
          </div>
        </div>

        {/* Carros em Serviço */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/60 border border-slate-700/40 hover:border-amber-500/40 rounded-2xl p-6 transition-all hover:shadow-lg hover:shadow-amber-500/5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Carros</p>
              <p className="text-slate-500 text-xs">Em Serviço</p>
              <p className="text-4xl font-bold text-white mt-3">{hideValues ? '•••' : stats?.carsInService || 0}</p>
            </div>
            <div className="text-amber-500/40 text-3xl">🚗</div>
          </div>
        </div>

        {/* Receita Hoje */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/60 border border-slate-700/40 hover:border-green-500/40 rounded-2xl p-6 transition-all hover:shadow-lg hover:shadow-green-500/5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Receita</p>
              <p className="text-slate-500 text-xs">Hoje</p>
              <p className="text-4xl font-bold text-white mt-3">
                {hideValues ? 'R$ •••' : `R$ ${formatRevenue(stats?.revenueToday || 0)}`}
              </p>
              <p className="text-green-400 text-xs font-semibold mt-2">
                {hideValues ? '•••' : `+${stats?.revenueAverage || 0}% vs média`}
              </p>
            </div>
            <div className="text-green-500/40 text-3xl">💰</div>
          </div>
        </div>
      </div>

      {/* Agendamentos Recentes */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-6">Próximos Agendamentos</h2>
        
        {(() => {
          const now = new Date()
          const futureAppointments = sortedAppointments.filter(apt => new Date(apt.startDatetime) >= now)
          
          if (futureAppointments.length === 0) {
            return (
              <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/50 border border-slate-700/40 rounded-2xl p-8 text-center">
                <p className="text-slate-400">Nenhum agendamento próximo</p>
              </div>
            )
          }

          return (
            <div className="space-y-4">
              {futureAppointments.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  hideValues={hideValues}
                  onStartAppointment={handleStartAppointment}
                  onNoShow={handleNoShow}
                  onReschedule={(id) => {
                    setRescheduleModal(id)
                  }}
                />
              ))}
            </div>
          )
        })()}
      </div>

      {/* Modal para solicitar reagendamento */}
      {rescheduleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Solicitar Reagendamento</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-slate-300 text-sm font-semibold block mb-2">Motivo da alteração</label>
                <textarea
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="Explique brevemente por que precisa reagendar..."
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-lg p-3 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 outline-none transition resize-none"
                  rows={4}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setRescheduleModal(null)
                    setRescheduleReason('')
                  }}
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-700 text-slate-300 font-semibold hover:border-slate-600 hover:text-white transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleRequestReschedule(rescheduleModal)}
                    disabled={!rescheduleReason.trim() || updatingAppointment === rescheduleModal}
                  className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                    {updatingAppointment === rescheduleModal ? 'Solicitando...' : 'Solicitar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
