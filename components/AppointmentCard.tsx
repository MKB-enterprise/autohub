'use client'

import { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

interface Appointment {
  id: string
  customer: { name: string; phone: string }
  car: { model: string; plate: string }
  appointmentServices: { service: { name: string } }[]
  startDatetime: string
  endDatetime: string
  status: string
  totalPrice: number
  notes?: string | null
}

interface AppointmentCardProps {
  appointment: Appointment
  hideValues?: boolean
  onStartAppointment?: (id: string) => void
  onNoShow?: (id: string) => void
  onReschedule?: (id: string) => void
  onCancel?: (id: string) => void
  isCustomer?: boolean
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

const statusVariants: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  PENDING: 'info',
  CONFIRMED_BY_CLIENT: 'info',
  CONFIRMED: 'warning',
  RESCHEDULED: 'warning',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CANCELED: 'danger',
  NO_SHOW: 'danger'
}

export function AppointmentCard({
  appointment,
  hideValues = false,
  onStartAppointment,
  onNoShow,
  onReschedule,
  onCancel,
  isCustomer = false
}: AppointmentCardProps) {
  const [openMenu, setOpenMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(false)
      }
    }

    if (openMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openMenu])

  const startTime = new Date(appointment.startDatetime)
  const endTime = new Date(appointment.endDatetime)

  // Calculate if appointment is today/tomorrow
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const appointmentDate = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate())

  const isToday = appointmentDate.getTime() === today.getTime()
  const isTomorrow = appointmentDate.getTime() === tomorrow.getTime()

  // Time remaining indicator
  const diffMinutes = Math.round((startTime.getTime() - Date.now()) / 60000)
  
  let timeIndicator: { label: string; color: string } | null = null
  if (appointment.status === 'IN_PROGRESS') {
    timeIndicator = { label: 'Em andamento', color: 'text-green-400' }
  } else if (appointment.status === 'COMPLETED') {
    timeIndicator = { label: 'Finalizado', color: 'text-slate-400' }
  } else if (diffMinutes < 0) {
    timeIndicator = { label: 'Atrasado', color: 'text-red-400' }
  } else if (diffMinutes < 60) {
    timeIndicator = { label: `Em ${diffMinutes}min`, color: 'text-yellow-400' }
  } else {
    const hours = Math.floor(diffMinutes / 60)
    const mins = diffMinutes % 60
    timeIndicator = { 
      label: `Em ${hours}h${mins ? ` ${mins}m` : ''}`,
      color: 'text-blue-400'
    }
  }

  const durationMinutes = Math.max(0, Math.round((endTime.getTime() - startTime.getTime()) / 60000))
  const durationLabel = `${durationMinutes} min`

  const visibleServices = appointment.appointmentServices.slice(0, 2)
  const extraServices = appointment.appointmentServices.length - visibleServices.length

  const shouldShowActions = startTime > now && appointment.status !== 'RESCHEDULED' && appointment.status !== 'COMPLETED'

  return (
    <Card className="relative bg-gradient-to-br from-slate-900/50 to-slate-950/50 border border-slate-800/60 hover:border-slate-700/80 transition-all hover:shadow-lg hover:shadow-slate-600/10">
      {/* Main grid layout: time | client | vehicle | actions | price */}
      <div className="flex flex-col gap-4 lg:gap-3 relative z-10">
        
        {/* Top row - Date/Time and Status */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-4 border-b border-slate-800/40">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-slate-300">
                {format(startTime, "dd 'de' MMM", { locale: ptBR })}
              </span>
              {isToday && (
                <span className="px-2 py-0.5 bg-orange-500/80 text-white text-[10px] font-bold rounded-full">HOJE</span>
              )}
              {isTomorrow && (
                <span className="px-2 py-0.5 bg-blue-600/80 text-white text-[10px] font-bold rounded-full">AMANHÃ</span>
              )}
            </div>
            <div className="text-blue-300 font-semibold text-sm">
              {format(startTime, 'HH:mm', { locale: ptBR })} - {format(endTime, 'HH:mm', { locale: ptBR })}
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Badge variant={statusVariants[appointment.status]} className="text-xs whitespace-nowrap">
              {statusLabels[appointment.status]}
            </Badge>
            {timeIndicator && (
              <span className={`text-xs font-semibold whitespace-nowrap ${timeIndicator.color}`}>
                {timeIndicator.label}
              </span>
            )}
          </div>
        </div>

        {/* Middle row - Client, Vehicle, Services */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Client */}
          <div className="flex gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {appointment.customer.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-slate-400 text-[10px] uppercase tracking-wide font-semibold">Cliente</div>
              <p className="text-white font-semibold truncate text-sm">{appointment.customer.name}</p>
              <p className="text-slate-500 text-xs flex items-center gap-1">
                📞 {appointment.customer.phone}
              </p>
            </div>
          </div>

          {/* Vehicle */}
          <div className="flex gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-slate-800/70 border border-slate-700 flex items-center justify-center text-slate-300 flex-shrink-0">
              🚗
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-slate-400 text-[10px] uppercase tracking-wide font-semibold">Veículo</div>
              <p className="text-white font-semibold truncate text-sm">{appointment.car.model}</p>
              <p className="text-slate-500 text-xs">Placa {appointment.car.plate}</p>
            </div>
          </div>

          {/* Services summary */}
          <div className="min-w-0">
            <div className="text-slate-400 text-[10px] uppercase tracking-wide font-semibold mb-1">Serviços</div>
            <div className="flex flex-wrap gap-1">
              {visibleServices.map((as, idx) => (
                <span key={idx} className="text-xs text-slate-300 bg-slate-800/50 px-2 py-0.5 rounded-md border border-slate-700/50 whitespace-nowrap">
                  {as.service.name}
                </span>
              ))}
              {extraServices > 0 && (
                <span className="text-xs text-slate-400 px-2 py-0.5">+{extraServices}</span>
              )}
            </div>
          </div>
        </div>

        {/* Cancellation reason (visible when canceled) */}
        {appointment.status === 'CANCELED' && appointment.notes && (
          <div className="p-3 rounded-lg border border-red-500/30 bg-red-900/10 text-sm text-red-100">
            <div className="flex items-center gap-2 font-semibold text-red-200">
              <span>❌ Motivo informado pelo cliente</span>
            </div>
            <p className="text-red-100/90 mt-1 leading-relaxed">{appointment.notes}</p>
          </div>
        )}

        {/* Bottom row - Duration, Price, Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-800/40">
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span>⏱️ {durationLabel}</span>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3">
            <div className="text-right">
              <div className="text-slate-400 text-[10px] uppercase tracking-wide font-semibold">Total</div>
              <div className="text-white font-bold text-lg">
                {hideValues ? 'R$ •••' : `R$ ${Number(appointment.totalPrice).toFixed(2)}`}
              </div>
            </div>

            {/* Menu button */}
            <div className="relative z-[60]" ref={menuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setOpenMenu(!openMenu)
                }}
                className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-800/40 border border-slate-700/40 hover:bg-slate-800/60 hover:border-slate-600/60 transition text-slate-400 hover:text-white"
                aria-label="Menu de ações"
                aria-expanded={openMenu}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="5" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="19" r="2" />
                </svg>
              </button>

              {openMenu && (
                <>
                  <div className="absolute top-full right-0 mt-1 w-48 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-lg shadow-xl overflow-hidden z-[60]">
                    {shouldShowActions && onReschedule && (
                      <button
                        onClick={() => {
                          onReschedule(appointment.id)
                          setOpenMenu(false)
                        }}
                        className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:bg-slate-800/60 hover:text-white border-b border-slate-800/50 transition"
                      >
                        📅 Reagendar
                      </button>
                    )}

                    {shouldShowActions && onCancel && appointment.status !== 'CANCELED' && appointment.status !== 'COMPLETED' && appointment.status !== 'NO_SHOW' && (
                      <button
                        onClick={() => {
                          if (confirm('Tem certeza que deseja cancelar este agendamento?')) {
                            onCancel(appointment.id)
                            setOpenMenu(false)
                          }
                        }}
                        className="w-full px-3 py-2 text-left text-xs text-red-400 hover:bg-red-500/10 border-b border-slate-800/50 transition"
                      >
                        ❌ {isCustomer ? 'Cancelar Agendamento' : 'Cancelar'}
                      </button>
                    )}

                    {startTime > now && onStartAppointment && !isCustomer && (
                      <button
                        onClick={() => {
                          onStartAppointment(appointment.id)
                          setOpenMenu(false)
                        }}
                        className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:bg-slate-800/60 hover:text-white border-b border-slate-800/50 transition"
                      >
                        ▶ Iniciar agora
                      </button>
                    )}

                    {startTime <= now && (appointment.status === 'PENDING' || appointment.status === 'CONFIRMED' || appointment.status === 'CONFIRMED_BY_CLIENT' || appointment.status === 'NO_SHOW') && onNoShow && !isCustomer && (
                      <button
                        onClick={() => {
                          onNoShow(appointment.id)
                          setOpenMenu(false)
                        }}
                        className="w-full px-3 py-2 text-left text-xs text-red-400 hover:bg-red-500/10 transition"
                      >
                        ✗ Não Compareceu
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
