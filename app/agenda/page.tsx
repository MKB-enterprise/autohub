'use client'

import { useState, useCallback } from 'react'
import { format, addDays, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton'
import { Alert } from '@/components/ui/Alert'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { useData } from '@/lib/hooks/useFetch'
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
  customer: {
    name: string
    phone: string
  }
  car: {
    plate: string
    model: string
  }
  appointmentServices: {
    service: {
      name: string
      durationMinutes: number
    }
  }[]
}

interface TimeSlot {
  time: string
  hour: number
  minute: number
  appointment: Appointment | null
  isBlocked: boolean
  blockedBy?: Appointment
  isLunchBreak: boolean
}

const statusLabels: Record<string, string> = {
  PENDING: 'Aguardando Cliente',
  CONFIRMED_BY_CLIENT: 'Cliente Confirmou',
  CONFIRMED: 'Confirmado',
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

// Horário de almoço
const LUNCH_START_HOUR = 12
const LUNCH_END_HOUR = 13

export default function AgendaPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null) // ID do appointment em ação
  
  // Modal para sugerir reagendamento
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [suggestedDate, setSuggestedDate] = useState('')
  const [suggestedTime, setSuggestedTime] = useState('')
  const [businessNotes, setBusinessNotes] = useState('')
  const [savingReschedule, setSavingReschedule] = useState(false)

  // SWR para cache e revalidação automática
  const dateStr = format(currentDate, 'yyyy-MM-dd')
  const { data: appointments = [], isLoading, mutate } = useData<Appointment[]>(`/api/appointments?date=${dateStr}`)

  const loadAppointments = useCallback(() => {
    mutate()
  }, [mutate])

  async function handleConfirmByBusiness(appointmentId: string) {
    setActionLoading(appointmentId)
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'CONFIRMED',
          confirmedByBusinessAt: new Date().toISOString()
        })
      })

      if (!response.ok) {
        throw new Error('Erro ao confirmar agendamento')
      }

      setSuccess('Agendamento confirmado!')
      loadAppointments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao confirmar')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleSuggestReschedule() {
    if (!selectedAppointment || !suggestedDate || !suggestedTime) {
      setError('Preencha a data e horário sugerido')
      return
    }
    setSavingReschedule(true)

    try {
      const suggestedDatetime = `${suggestedDate}T${suggestedTime}:00`
      
      const response = await fetch(`/api/appointments/${selectedAppointment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'RESCHEDULED',
          suggestedDatetime,
          businessNotes
        })
      })

      if (!response.ok) {
        throw new Error('Erro ao sugerir reagendamento')
      }

      setSuccess('Reagendamento sugerido ao cliente!')
      setShowRescheduleModal(false)
      setSelectedAppointment(null)
      setSuggestedDate('')
      setSuggestedTime('')
      setBusinessNotes('')
      loadAppointments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao sugerir reagendamento')
    } finally {
      setSavingReschedule(false)
    }
  }

  async function handleStatusChange(appointmentId: string, newStatus: string) {
    setActionLoading(appointmentId)
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        throw new Error('Erro ao atualizar status')
      }

      setSuccess('Status atualizado!')
      loadAppointments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar status')
    } finally {
      setActionLoading(null)
    }
  }

  function openRescheduleModal(appointment: Appointment) {
    setSelectedAppointment(appointment)
    setSuggestedDate(format(new Date(appointment.startDatetime), 'yyyy-MM-dd'))
    setSuggestedTime(format(new Date(appointment.startDatetime), 'HH:mm'))
    setBusinessNotes('')
    setShowRescheduleModal(true)
  }

  function goToPreviousDay() {
    setCurrentDate(subDays(currentDate, 1))
  }

  function goToNextDay() {
    setCurrentDate(addDays(currentDate, 1))
  }

  // Gerar slots de tempo (08:00 às 18:00, a cada 30 minutos)
  function generateTimeSlots(): TimeSlot[] {
    const slots: TimeSlot[] = []
    const activeAppointments = appointments.filter(apt => 
      apt.status !== 'CANCELED' && apt.status !== 'NO_SHOW'
    )
    
    for (let hour = 8; hour <= 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === 17 && minute === 30) continue
        
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        const isLunchBreak = hour >= LUNCH_START_HOUR && hour < LUNCH_END_HOUR
        
        const appointment = activeAppointments.find(apt => {
          const aptDate = new Date(apt.startDatetime)
          return aptDate.getHours() === hour && aptDate.getMinutes() === minute
        })
        
        let isBlocked = false
        let blockedBy: Appointment | undefined
        
        if (!appointment && !isLunchBreak) {
          const slotDate = new Date(currentDate)
          slotDate.setHours(hour, minute, 0, 0)
          
          for (const apt of activeAppointments) {
            const aptStart = new Date(apt.startDatetime)
            const aptEnd = new Date(apt.endDatetime)
            
            // Slot está bloqueado se está DENTRO do período do agendamento
            // (não inclui o horário exato de término)
            if (slotDate >= aptStart && slotDate < aptEnd) {
              isBlocked = true
              blockedBy = apt
              break
            }
          }
        }
        
        slots.push({ 
          time: timeStr, 
          hour, 
          minute,
          appointment: appointment || null,
          isBlocked,
          blockedBy,
          isLunchBreak
        })
      }
    }
    return slots
  }

  const timeSlots = generateTimeSlots()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Agenda</h1>
          <p className="text-gray-400 mt-1">Gerencie seus agendamentos e confirmações</p>
        </div>
        <Link href="/agendamentos/novo">
          <Button>+ Novo Agendamento</Button>
        </Link>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      {/* Legenda de Status */}
      <Card>
        <h3 className="text-sm font-medium text-gray-400 mb-3">Legenda de Status</h3>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="default">Aguardando Cliente</Badge>
            <span className="text-xs text-gray-500">Cliente precisa confirmar 24h antes</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="info">Cliente Confirmou</Badge>
            <span className="text-xs text-gray-500">Aguardando sua confirmação</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="success">Confirmado</Badge>
            <span className="text-xs text-gray-500">Agendamento garantido</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="warning">Reagendamento</Badge>
            <span className="text-xs text-gray-500">Você sugeriu outro horário</span>
          </div>
        </div>
      </Card>

      <Card>
        {/* Date Navigation */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <button
            onClick={goToPreviousDay}
            className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            ‹
          </button>
          
          <div className="flex items-center gap-3 text-white">
            <span className="text-cyan-500">📅</span>
            <span className="text-xl font-medium">
              {format(currentDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </span>
          </div>
          
          <button
            onClick={goToNextDay}
            className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            ›
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-6 p-4 rounded-lg border border-gray-800">
                <Skeleton variant="text" width={60} />
                <div className="flex-1 space-y-2">
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="40%" height={14} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {timeSlots.map((slot) => (
              <div
                key={slot.time}
                className={`flex items-center gap-6 p-4 rounded-lg border transition-all ${
                  slot.isLunchBreak
                    ? 'border-yellow-500/30 bg-yellow-900/10'
                    : slot.appointment 
                    ? slot.appointment.status === 'CONFIRMED_BY_CLIENT'
                      ? 'border-blue-500/30 bg-blue-900/10'
                      : slot.appointment.status === 'CONFIRMED'
                      ? 'border-green-500/30 bg-green-900/10'
                      : slot.appointment.status === 'RESCHEDULED'
                      ? 'border-orange-500/30 bg-orange-900/10'
                      : 'border-cyan-500/30 bg-cyan-900/10' 
                    : slot.isBlocked
                    ? 'border-gray-600/20 bg-gray-800/30'
                    : 'border-gray-800 bg-gray-900/30 hover:bg-gray-800/50'
                }`}
              >
                <span className={`text-lg font-semibold w-16 ${
                  slot.isLunchBreak 
                    ? 'text-yellow-500' 
                    : slot.isBlocked && !slot.appointment 
                    ? 'text-gray-600' 
                    : 'text-white'
                }`}>
                  {slot.time}
                </span>
                
                {slot.isLunchBreak ? (
                  <span className="text-yellow-500 text-sm flex items-center gap-2">
                    🍽️ Horário de Almoço
                  </span>
                ) : slot.appointment ? (
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-white">{slot.appointment.customer.name}</p>
                          <Badge variant={statusVariants[slot.appointment.status]}>
                            {statusLabels[slot.appointment.status]}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-400">
                          📱 {slot.appointment.customer.phone}
                        </p>
                        <p className="text-sm text-gray-400">
                          🚗 {slot.appointment.car.model} - {slot.appointment.car.plate}
                        </p>
                        <p className="text-sm text-gray-400">
                          🔧 {slot.appointment.appointmentServices.map(s => s.service.name).join(', ')}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          ⏰ {format(new Date(slot.appointment.startDatetime), 'HH:mm')} - {format(new Date(slot.appointment.endDatetime), 'HH:mm')}
                          {' · '}
                          💰 R$ {Number(slot.appointment.totalPrice).toFixed(2)}
                        </p>
                        
                        {/* Mostrar info de confirmação */}
                        {slot.appointment.confirmedByClientAt && (
                          <p className="text-xs text-blue-400 mt-1">
                            ✓ Cliente confirmou em {format(new Date(slot.appointment.confirmedByClientAt), "dd/MM 'às' HH:mm")}
                          </p>
                        )}
                        {slot.appointment.confirmedByBusinessAt && (
                          <p className="text-xs text-green-400">
                            ✓ Você confirmou em {format(new Date(slot.appointment.confirmedByBusinessAt), "dd/MM 'às' HH:mm")}
                          </p>
                        )}
                        {slot.appointment.status === 'RESCHEDULED' && slot.appointment.suggestedDatetime && (
                          <p className="text-xs text-orange-400 mt-1">
                            📅 Horário sugerido: {format(new Date(slot.appointment.suggestedDatetime), "dd/MM 'às' HH:mm")}
                          </p>
                        )}
                      </div>
                      
                      {/* Ações baseadas no status */}
                      <div className="flex flex-col gap-2">
                        {/* Cliente confirmou, estética pode confirmar ou sugerir reagendamento */}
                        {slot.appointment.status === 'CONFIRMED_BY_CLIENT' && (
                          <>
                            <Button 
                              size="sm" 
                              variant="success"
                              onClick={() => handleConfirmByBusiness(slot.appointment!.id)}
                              disabled={actionLoading === slot.appointment!.id}
                            >
                              {actionLoading === slot.appointment!.id ? '...' : '✓ Confirmar'}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="secondary"
                              onClick={() => openRescheduleModal(slot.appointment!)}
                              disabled={actionLoading === slot.appointment!.id}
                            >
                              📅 Sugerir Outro Horário
                            </Button>
                          </>
                        )}
                        
                        {/* Agendamento confirmado, pode iniciar ou marcar não compareceu */}
                        {slot.appointment.status === 'CONFIRMED' && (
                          <>
                            <Button 
                              size="sm" 
                              variant="success"
                              onClick={() => handleStatusChange(slot.appointment!.id, 'IN_PROGRESS')}
                              disabled={actionLoading === slot.appointment!.id}
                            >
                              {actionLoading === slot.appointment!.id ? '...' : '▶ Iniciar'}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="danger"
                              onClick={() => handleStatusChange(slot.appointment!.id, 'NO_SHOW')}
                              disabled={actionLoading === slot.appointment!.id}
                            >
                              {actionLoading === slot.appointment!.id ? '...' : '✗ Não Compareceu'}
                            </Button>
                          </>
                        )}
                        
                        {/* Em andamento, pode concluir */}
                        {slot.appointment.status === 'IN_PROGRESS' && (
                          <Button 
                            size="sm" 
                            variant="success"
                            onClick={() => handleStatusChange(slot.appointment!.id, 'COMPLETED')}
                            disabled={actionLoading === slot.appointment!.id}
                          >
                            {actionLoading === slot.appointment!.id ? '...' : '✓ Concluir'}
                          </Button>
                        )}
                        
                        {/* Pendente ou aguardando, pode cancelar */}
                        {['PENDING', 'CONFIRMED_BY_CLIENT', 'RESCHEDULED'].includes(slot.appointment.status) && (
                          <Button 
                            size="sm" 
                            variant="danger"
                            onClick={() => handleStatusChange(slot.appointment!.id, 'CANCELED')}
                            disabled={actionLoading === slot.appointment!.id}
                          >
                            {actionLoading === slot.appointment!.id ? '...' : '✗ Cancelar'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : slot.isBlocked ? (
                  <span className="text-gray-500 text-sm">
                    ⏳ Em atendimento ({slot.blockedBy?.customer.name})
                  </span>
                ) : (
                  <span className="text-gray-500">Disponível</span>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modal de Reagendamento */}
      <Modal
        isOpen={showRescheduleModal}
        onClose={() => setShowRescheduleModal(false)}
        title="Sugerir Novo Horário"
      >
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">
            Sugira um novo horário para o cliente. Ele receberá uma notificação e poderá aceitar ou recusar.
          </p>
          
          <Input
            label="Nova Data"
            type="date"
            value={suggestedDate}
            onChange={(e) => setSuggestedDate(e.target.value)}
            min={format(new Date(), 'yyyy-MM-dd')}
            required
          />
          
          <Input
            label="Novo Horário"
            type="time"
            value={suggestedTime}
            onChange={(e) => setSuggestedTime(e.target.value)}
            required
          />
          
          <Textarea
            label="Motivo (opcional)"
            value={businessNotes}
            onChange={(e) => setBusinessNotes(e.target.value)}
            placeholder="Ex: Tivemos um imprevisto com equipamento..."
            rows={3}
          />
          
          <div className="flex gap-2 pt-4">
            <Button onClick={handleSuggestReschedule} disabled={savingReschedule}>
              {savingReschedule ? 'Enviando...' : 'Enviar Sugestão'}
            </Button>
            <Button variant="secondary" onClick={() => setShowRescheduleModal(false)} disabled={savingReschedule}>
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
