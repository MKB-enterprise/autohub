'use client'

import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { useData } from '@/lib/hooks/useFetch'

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
  customer: { name: string }
  car: { model: string }
  appointmentServices: { service: { name: string } }[]
  startDatetime: string
  status: string
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
  const { data: appointmentsData, isLoading: loadingAppointments } = useData<RecentAppointment[]>('/api/appointments?limit=5')
  
  const recentAppointments = appointmentsData?.slice(0, 5) || []
  const loading = loadingStats || loadingAppointments

  function formatRevenue(value: number): string {
    if (value >= 1000) {
      return (value / 1000).toFixed(3).replace('.', '.')
    }
    return value.toFixed(2).replace('.', ',')
  }

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
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">Visão geral do seu negócio</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Agendamentos Hoje */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-400 text-sm">Agendamentos</p>
              <p className="text-gray-500 text-xs">Hoje</p>
              <p className="text-4xl font-bold text-white mt-2">{stats?.appointmentsToday || 0}</p>
              <p className="text-blue-400 text-sm mt-1">
                {(stats?.appointmentsToday || 0) - (stats?.appointmentsYesterday || 0) >= 0 ? '+' : ''}
                {(stats?.appointmentsToday || 0) - (stats?.appointmentsYesterday || 0)} vs ontem
              </p>
            </div>
            <div className="text-blue-500 text-3xl opacity-50">📅</div>
          </div>
        </div>

        {/* Clientes Ativos */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-400 text-sm">Clientes Ativos</p>
              <p className="text-4xl font-bold text-white mt-2">{stats?.totalClients || 0}</p>
              <p className="text-blue-400 text-sm mt-1">
                +{stats?.clientsGrowth || 0}% este mês
              </p>
            </div>
            <div className="text-blue-500 text-3xl opacity-50">👥</div>
          </div>
        </div>

        {/* Carros em Serviço */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-400 text-sm">Carros em Serviço</p>
              <p className="text-4xl font-bold text-white mt-2">{stats?.carsInService || 0}</p>
            </div>
            <div className="text-blue-500 text-3xl opacity-50">🚗</div>
          </div>
        </div>

        {/* Receita Hoje */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-400 text-sm">Receita Hoje</p>
              <p className="text-4xl font-bold text-white mt-2">
                R$ {formatRevenue(stats?.revenueToday || 0)}
              </p>
              <p className="text-blue-400 text-sm mt-1">
                {(stats?.revenueAverage || 0) >= 0 ? '+' : ''}{stats?.revenueAverage || 0}% vs média
              </p>
            </div>
            <div className="text-blue-500 text-3xl opacity-50">💰</div>
          </div>
        </div>
      </div>

      {/* Agendamentos Recentes */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-6">Agendamentos Recentes</h2>
        
        {recentAppointments.length === 0 ? (
          <p className="text-gray-400 text-center py-8">Nenhum agendamento recente</p>
        ) : (
          <div className="space-y-1">
            {recentAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className="flex items-center justify-between py-4 border-b border-gray-800 last:border-0 hover:bg-gray-800/30 transition-colors rounded-lg px-2"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-white text-sm">
                    {appointment.customer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-white">{appointment.customer.name}</p>
                    <p className="text-sm text-gray-400">
                      {appointment.car.model}
                    </p>
                  </div>
                </div>
                
                <div className="text-right flex items-center gap-4">
                  <div>
                    <p className="text-sm text-gray-400">
                      {appointment.appointmentServices.map(s => s.service.name).join(', ')}
                    </p>
                    <p className="text-white font-medium">
                      {new Date(appointment.startDatetime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <Badge 
                    variant={
                      appointment.status === 'COMPLETED' ? 'success' :
                      appointment.status === 'IN_PROGRESS' ? 'warning' :
                      appointment.status === 'CANCELED' ? 'danger' : 'info'
                    }
                  >
                    {statusLabels[appointment.status]}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
