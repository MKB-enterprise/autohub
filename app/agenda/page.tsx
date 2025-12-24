'use client'

import { useState, useCallback, useEffect } from 'react'
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
import { AppointmentMenu } from '@/components/AppointmentMenu'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'

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
  const router = useRouter()
  const { user, loading } = useAuth()
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

  // Bloqueio de acesso: apenas admin
  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/')
      return
    }
    if (!user.isAdmin) {
      router.replace('/cliente')
    }
  }, [user, loading, router])

  // SWR para cache e revalidação automática (só inicia se admin)
  const dateStr = format(currentDate, 'yyyy-MM-dd')
  const { data: appointments = [], isLoading, mutate } = useData<Appointment[]>(user?.isAdmin ? `/api/appointments?date=${dateStr}` : null)

  const loadAppointments = useCallback(() => {
    mutate()
  }, [mutate])

  // Auto-iniciar e auto-concluir agendamentos
  useEffect(() => {
    if (!appointments.length) return

    const checkAndUpdateAppointments = async () => {
      const now = new Date()
      
      for (const apt of appointments) {
        const startTime = new Date(apt.startDatetime)
        const endTime = new Date(apt.endDatetime)
        
        // Auto-iniciar: Se chegou a hora de início e ainda não iniciou
        if (apt.status === 'CONFIRMED' && now >= startTime && now < endTime) {
          try {
            await fetch(`/api/appointments/${apt.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'IN_PROGRESS' })
            })
          } catch (err) {
            console.error('Erro ao auto-iniciar:', err)
          }
        }
        
        // Auto-concluir: Se passou o horário de término e ainda não concluiu
        if (apt.status === 'IN_PROGRESS' && now >= endTime) {
          try {
            await fetch(`/api/appointments/${apt.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'COMPLETED' })
            })
          } catch (err) {
            console.error('Erro ao auto-concluir:', err)
          }
        }
      }
    }

    checkAndUpdateAppointments()
    const interval = setInterval(checkAndUpdateAppointments, 30000) // Check a cada 30 segundos
    
    return () => clearInterval(interval)
  }, [appointments])

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
          <h1 className="text-3xl font-bold text-white">Agenda do Dia</h1>
          <p className="text-slate-400 mt-1">Gerencie seus agendamentos e confirmações</p>
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
          <div className="space-y-3">
            {timeSlots.map((slot) => (
              <div
                key={slot.time}
                className={`rounded-2xl border transition-all ${
                  slot.isLunchBreak
                    ? 'border-orange-500/40 bg-gradient-to-r from-orange-900/20 to-orange-800/10'
                    : slot.appointment 
                    ? 'border-slate-700/60 bg-gradient-to-br from-slate-900/50 to-slate-950/50 hover:border-slate-600/80'
                    : slot.isBlocked
                    ? 'border-slate-700/20 bg-slate-800/20'
                    : 'border-slate-800 bg-slate-900/30 hover:bg-slate-800/40 hover:border-slate-700'
                }`}
              >
                {slot.isLunchBreak ? (
                  // Lunch Break Row
                  <div className="p-4 flex items-center gap-4">
                    <div className="text-2xl font-bold text-orange-400 w-20 text-center">
                      {slot.time}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-orange-500 text-lg">🍽️</span>
                        <span className="text-orange-400 font-semibold">Horário de Almoço</span>
                      </div>
                    </div>
                  </div>
                ) : slot.appointment ? (
                  // Appointment Row
                  <div className="p-4">
                    <div className="grid grid-cols-1 lg:grid-cols-[60px_1fr_1fr_auto] gap-4">
                      {/* Time */}
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white">{slot.time}</div>
                      </div>

                      {/* Client Info */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-white text-sm">{slot.appointment.customer.name}</span>
                          <Badge variant={statusVariants[slot.appointment.status]} className="text-xs">
                            {statusLabels[slot.appointment.status]}
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-400">📱 {slot.appointment.customer.phone}</div>
                      </div>

                      {/* Service Info */}
                      <div className="space-y-1">
                        <div className="text-xs font-semibold text-slate-300">
                          {slot.appointment.appointmentServices.map(s => s.service.name).join(' + ')}
                        </div>
                        <div className="text-xs text-slate-400">
                          🚗 {slot.appointment.car.model} · {slot.appointment.car.plate}
                        </div>
                        <div className="text-xs text-slate-400">
                          ⏰ {format(new Date(slot.appointment.startDatetime), 'HH:mm')} - {format(new Date(slot.appointment.endDatetime), 'HH:mm')} · 💰 R$ {Number(slot.appointment.totalPrice).toFixed(2)}
                        </div>
                      </div>

                      {/* Menu 3-pontinhos */}
                      <AppointmentMenu 
                        appointment={slot.appointment}
                        actionLoading={actionLoading}
                        onConfirm={() => handleConfirmByBusiness(slot.appointment!.id)}
                        onReschedule={() => openRescheduleModal(slot.appointment!)}
                        onNoShow={() => handleStatusChange(slot.appointment!.id, 'NO_SHOW')}
                      />
                    </div>

                    {/* Extra Info */}
                    <div className="mt-3 pt-3 border-t border-slate-700/40 space-y-1">
                      {slot.appointment.confirmedByClientAt && (
                        <div className="text-xs text-blue-400">
                          ✓ Cliente confirmou em {format(new Date(slot.appointment.confirmedByClientAt), "dd/MM 'às' HH:mm")}
                        </div>
                      )}
                      {slot.appointment.confirmedByBusinessAt && (
                        <div className="text-xs text-green-400">
                          ✓ Você confirmou em {format(new Date(slot.appointment.confirmedByBusinessAt), "dd/MM 'às' HH:mm")}
                        </div>
                      )}
                      {slot.appointment.status === 'RESCHEDULED' && slot.appointment.suggestedDatetime && (
                        <div className="text-xs text-orange-400">
                          📅 Horário sugerido: {format(new Date(slot.appointment.suggestedDatetime), "dd/MM 'às' HH:mm")}
                        </div>
                      )}
                      {slot.appointment.status === 'CANCELED' && slot.appointment.notes && (
                        <div className="text-xs text-red-300">
                          ❌ Motivo do cliente: <span className="text-slate-200">{slot.appointment.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : slot.isBlocked ? (
                  // Blocked Slot
                  <div className="p-4 flex items-center gap-4">
                    <div className="text-xl font-bold text-slate-500 w-16 text-center">
                      {slot.time}
                    </div>
                    <div className="flex-1">
                      <span className="text-slate-500 text-sm">
                        ⏳ Em atendimento ({slot.blockedBy?.customer.name})
                      </span>
                    </div>
                  </div>
                ) : (
                  // Available Slot
                  <div className="p-4 flex items-center gap-4">
                    <div className="text-xl font-bold text-slate-400 w-16 text-center">
                      {slot.time}
                    </div>
                    <div className="flex-1">
                      <span className="text-slate-500 text-sm">Disponível</span>
                    </div>
                  </div>
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
