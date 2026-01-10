'use client'

import { useState, useEffect } from 'react'
import { format, addDays, subDays, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { useData } from '@/lib/hooks/useFetch'
import { useAuth } from '@/lib/AuthContext'
import { useRequireBusinessAuth } from '@/lib/hooks/useRequireBusinessAuth'
import { useTenantPath } from '@/lib/tenant-path'
import { RequireLoadingComplete } from '@/components/RequireLoadingComplete'
import { AgendaBoard } from '@/components/AgendaBoard'
import Link from 'next/link'
import type { Appointment, User } from '@/lib/types'

export default function AgendaPage() {
  const isAuthorized = useRequireBusinessAuth()
  if (!isAuthorized) return null
  
  return (
    <RequireLoadingComplete>
      <AgendaContent />
    </RequireLoadingComplete>
  )
}

function AgendaContent() {
  const getTenantPath = useTenantPath()
  const { business } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [error, setError] = useState<string | null>(null)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [transitioning, setTransitioning] = useState(false)

  const dateStr = format(currentDate, 'yyyy-MM-dd')
  const { data: appointments = [], isLoading } = useData<Appointment[]>(
    business ? `/api/appointments?date=${dateStr}` : null
  )

  // Buscar funcionários ativos
  const { data: employees = [] } = useData<User[]>(
    business ? '/api/users?role=STAFF&isActive=true' : null
  )

  function goToPreviousDay() {
    if (transitioning) return
    setTransitioning(true)
    setCurrentDate(subDays(currentDate, 1))
    setTimeout(() => setTransitioning(false), 300)
  }

  function goToNextDay() {
    if (transitioning) return
    setTransitioning(true)
    setCurrentDate(addDays(currentDate, 1))
    setTimeout(() => setTransitioning(false), 300)
  }

  function goToToday() {
    if (transitioning) return
    setTransitioning(true)
    setCurrentDate(new Date())
    setTimeout(() => setTransitioning(false), 300)
  }

  const dateDisplay = isToday(currentDate) 
    ? `Hoje, ${format(currentDate, 'dd \'de\' MMMM', { locale: ptBR })}`
    : format(currentDate, "EEEE, dd \'de\' MMMM", { locale: ptBR })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Agenda</h1>
          <p className="text-slate-400 mt-1">Visualize seus agendamentos em tempo real</p>
        </div>
        <Link href={getTenantPath('agendamentos/novo')}>
          <Button className="bg-blue-600 hover:bg-blue-700">+ Novo Agendamento</Button>
        </Link>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      <Card className="bg-slate-900 border border-gray-700">
        {/* Data Navigation */}
        <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-700">
          <button
            onClick={goToPreviousDay}
            disabled={transitioning}
            className={`flex items-center justify-center w-10 h-10 rounded-lg border border-gray-600 hover:border-blue-500 hover:bg-slate-800 transition-colors text-gray-300 hover:text-blue-400 text-lg ${
              transitioning ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            title="Dia anterior"
          >
            ←
          </button>

          <div className="flex flex-col items-center flex-1">
            <div className="text-xl font-semibold text-white capitalize">
              {dateDisplay}
            </div>
            <div className="text-sm text-gray-400 mt-1">
              {format(currentDate, 'dd/MM/yyyy')}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={goToToday}
              disabled={transitioning}
              className={`px-4 py-2 rounded-lg border border-gray-600 hover:border-blue-500 hover:bg-slate-800 transition-colors text-gray-300 hover:text-blue-400 text-sm ${
                transitioning ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {transitioning ? 'Carregando...' : 'Hoje'}
            </button>
            <button
              onClick={goToNextDay}
              disabled={transitioning}
              className={`flex items-center justify-center w-10 h-10 rounded-lg border border-gray-600 hover:border-blue-500 hover:bg-slate-800 transition-colors text-gray-300 hover:text-blue-400 text-lg ${
                transitioning ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              title="Próximo dia"
            >
              →
            </button>
          </div>
        </div>

        {/* Board */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <p className="text-gray-400 mt-4">Carregando agenda...</p>
            </div>
          </div>
        ) : (
          <AgendaBoard
            date={currentDate}
            appointments={appointments}
            employees={employees.length > 0 ? employees : generatePlaceholderEmployee()}
            onAppointmentClick={(apt) => setSelectedAppointment(apt)}
          />
        )}

        {/* Info Footer */}
        <div className="mt-6 pt-6 border-t border-gray-700 text-sm text-gray-400">
          <p>
            Total de agendamentos: <span className="text-white font-semibold">{appointments.length}</span>
          </p>
          {employees.length === 0 && (
            <p className="text-yellow-600 mt-2">
              ⚠️ Nenhum funcionário cadastrado. Configure na aba "Funcionários" das configurações.
            </p>
          )}
        </div>
      </Card>

      {/* Appointment Details Modal (pode ser expandido depois) */}
      {selectedAppointment && (
        <Card className="bg-slate-900 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Detalhes do Agendamento</h3>
            <button
              onClick={() => setSelectedAppointment(null)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="space-y-3 text-gray-300">
            <p><span className="font-semibold">Cliente:</span> {selectedAppointment.customer.name}</p>
            <p><span className="font-semibold">Veículo:</span> {selectedAppointment.car?.plate} - {selectedAppointment.car?.model}</p>
            <p><span className="font-semibold">Status:</span> {selectedAppointment.status}</p>
            <p><span className="font-semibold">Horário:</span> {format(new Date(selectedAppointment.startDatetime), 'HH:mm')}</p>
          </div>
        </Card>
      )}
    </div>
  )
}

// Funcionário placeholder quando nenhum estiver cadastrado
function generatePlaceholderEmployee(): User[] {
  return [{
    id: 'placeholder',
    businessId: '',
    email: '',
    password: '',
    fullName: 'Sem Funcionários',
    phone: null,
    role: 'STAFF',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }]
}