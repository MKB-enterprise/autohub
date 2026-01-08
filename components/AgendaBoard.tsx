'use client'

import { useMemo } from 'react'
import { format, eachHourOfInterval, startOfDay, endOfDay, isSameDay, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Appointment, User } from '@/lib/types'

interface AgendaBoardProps {
  date: Date
  appointments: Appointment[]
  employees: User[]
  onAppointmentClick?: (appointment: Appointment) => void
}

export function AgendaBoard({
  date,
  appointments,
  employees,
  onAppointmentClick
}: AgendaBoardProps) {
  // Gerar horas do dia (ex: 08:00, 09:00, 10:00...)
  const hours = useMemo(() => {
    const start = startOfDay(date)
    const end = endOfDay(date)
    return eachHourOfInterval({ start, end })
  }, [date])

  // Agrupar agendamentos por funcionário e hora
  const appointmentsByEmployeeAndHour = useMemo(() => {
    const map = new Map<string, Map<string, Appointment[]>>()

    // Inicializar mapa vazio
    employees.forEach((emp) => {
      map.set(emp.id, new Map())
      hours.forEach((hour) => {
        const hourKey = format(hour, 'HH:00')
        map.get(emp.id)?.set(hourKey, [])
      })
    })

    // Preencher com agendamentos
    appointments.forEach((apt) => {
      const aptDate = parseISO(apt.startDatetime.toString())
      const hourKey = format(aptDate, 'HH:00')

      // Para agora, assumir que não temos employee_id no appointment
      // Então vamos distribuir entre todos os funcionários
      // Ou usar o primeiro funcionário disponível
      if (employees.length > 0) {
        const empId = employees[0].id // TODO: substituir por employee_id real quando disponível
        map.get(empId)?.get(hourKey)?.push(apt)
      }
    })

    return map
  }, [appointments, employees, hours])

  if (employees.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Nenhum funcionário cadastrado</p>
        <p className="text-sm text-gray-500 mt-2">Adicione funcionários nas configurações</p>
      </div>
    )
  }

  return (
    <div className="bg-slate-800 rounded-lg overflow-hidden border border-gray-700">
      {/* Header com funcionários */}
      <div className="flex border-b border-gray-700">
        {/* Coluna de horários */}
        <div className="w-24 bg-slate-900 border-r border-gray-700 p-3">
          <div className="text-xs font-semibold text-gray-400 uppercase">Horário</div>
        </div>

        {/* Colunas de funcionários */}
        {employees.map((employee) => (
          <div
            key={employee.id}
            className="flex-1 border-r border-gray-700 p-3 bg-slate-900"
          >
            <div className="text-sm font-semibold text-white truncate">
              {employee.fullName}
            </div>
            <div className="text-xs text-gray-400">
              {employee.role === 'STAFF' && '👤 Funcionário'}
            </div>
          </div>
        ))}
      </div>

      {/* Grid de horários e agendamentos */}
      <div className="max-h-[600px] overflow-y-auto">
        {hours.map((hour, idx) => (
          <div key={idx} className="flex border-b border-gray-700">
            {/* Coluna de horário */}
            <div className="w-24 bg-slate-900 border-r border-gray-700 p-3 sticky left-0 z-10">
              <div className="text-xs font-semibold text-gray-300">
                {format(hour, 'HH:mm')}
              </div>
            </div>

            {/* Slots de agendamentos por funcionário */}
            {employees.map((employee) => {
              const hourKey = format(hour, 'HH:00')
              const aptsInSlot = appointmentsByEmployeeAndHour
                .get(employee.id)
                ?.get(hourKey) || []

              return (
                <div
                  key={`${employee.id}-${hourKey}`}
                  className="flex-1 border-r border-gray-700 p-2 min-h-[80px] bg-slate-800/50 hover:bg-slate-800 transition-colors"
                >
                  {aptsInSlot.map((apt) => (
                    <button
                      key={apt.id}
                      onClick={() => onAppointmentClick?.(apt)}
                      className="w-full text-left p-2 mb-2 rounded-lg bg-blue-600/30 border border-blue-500/50 hover:bg-blue-600/50 transition-colors cursor-pointer"
                    >
                      <div className="text-xs font-semibold text-white truncate">
                        {apt.customer.name}
                      </div>
                      <div className="text-xs text-gray-300 truncate">
                        {format(parseISO(apt.startDatetime.toString()), 'HH:mm')}
                      </div>
                      {apt.car && (
                        <div className="text-xs text-gray-400 truncate">
                          {apt.car.plate}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
