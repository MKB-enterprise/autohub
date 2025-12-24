'use client'

import { useEffect, useRef, useState } from 'react'
import { Appointment } from '@/lib/types'
import { Button } from './ui/Button'

interface AppointmentMenuProps {
  appointment: Appointment
  actionLoading: string | null
  onConfirm?: () => void
  onReschedule?: () => void
  onNoShow?: () => void
}

const statusLabels: Record<string, string> = {
  PENDING: 'Pendente',
  CONFIRMED_BY_CLIENT: 'Confirmado pelo Cliente',
  CONFIRMED: 'Confirmado',
  IN_PROGRESS: 'Em Andamento',
  COMPLETED: 'Concluído',
  CANCELED: 'Cancelado',
  RESCHEDULED: 'Reagendado',
  NO_SHOW: 'Não Compareceu'
}

export function AppointmentMenu({
  appointment,
  actionLoading,
  onConfirm,
  onReschedule,
  onNoShow
}: AppointmentMenuProps) {
  const [openMenu, setOpenMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu on click outside
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

  const now = new Date()
  const startTime = new Date(appointment.startDatetime)
  const endTime = new Date(appointment.endDatetime)
  const hasStarted = now >= startTime

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpenMenu(!openMenu)}
        className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors text-slate-400 hover:text-white"
        title="Ações"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10.5 1.5H9.5V3.5H10.5V1.5ZM10.5 8.5H9.5V10.5H10.5V8.5ZM10.5 15.5H9.5V17.5H10.5V15.5Z" />
        </svg>
      </button>

      {/* Menu Dropdown */}
      {openMenu && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(false)} />

          {/* Menu Items */}
          <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-[60] py-1">
            {/* Cliente confirmou */}
            {appointment.status === 'CONFIRMED_BY_CLIENT' && (
              <>
                <button
                  onClick={() => {
                    onConfirm?.()
                    setOpenMenu(false)
                  }}
                  disabled={actionLoading === appointment.id}
                  className="w-full text-left px-4 py-2 text-sm text-green-400 hover:bg-slate-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirmar agendamento
                </button>
                <button
                  onClick={() => {
                    onReschedule?.()
                    setOpenMenu(false)
                  }}
                  disabled={actionLoading === appointment.id}
                  className="w-full text-left px-4 py-2 text-sm text-blue-400 hover:bg-slate-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reagendar
                </button>
              </>
            )}

            {/* Confirmado e chegou a hora ou passou */}
            {appointment.status === 'CONFIRMED' && hasStarted && (
              <button
                onClick={() => {
                  onNoShow?.()
                  setOpenMenu(false)
                }}
                disabled={actionLoading === appointment.id}
                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Marcar como não compareceu
              </button>
            )}

            {/* Em andamento */}
            {appointment.status === 'IN_PROGRESS' && (
              <button
                onClick={() => {
                  onNoShow?.()
                  setOpenMenu(false)
                }}
                disabled={actionLoading === appointment.id}
                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Marcar como não compareceu
              </button>
            )}

            {/* Divider if there are more options */}
            {(appointment.status === 'CONFIRMED_BY_CLIENT' || appointment.status === 'CONFIRMED' || appointment.status === 'IN_PROGRESS') && (
              <div className="border-t border-slate-700 my-1" />
            )}

            {/* Info */}
            <div className="px-4 py-2 text-xs text-slate-400 bg-slate-700/20">
              {statusLabels[appointment.status]}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
