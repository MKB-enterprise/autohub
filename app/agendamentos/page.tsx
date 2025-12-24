'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { Alert } from '@/components/ui/Alert'
import { Loading } from '@/components/ui/Loading'
import { useData } from '@/lib/hooks/useFetch'
import { useAuth } from '@/lib/AuthContext'
import { useRouter } from 'next/navigation'

interface Appointment {
  id: string
  startDatetime: string
  endDatetime: string
  status: string
  totalPrice: number
  notes: string | null
  customer: {
    name: string
    phone: string
  }
  car: {
    model: string
    plate: string
    color: string | null
  }
  appointmentServices: {
    service: {
      name: string
    }
  }[]
}

const statusLabels: Record<string, string> = {
  PENDING: 'Pendente',
  CONFIRMED_BY_CLIENT: 'Cliente Confirmou',
  CONFIRMED: 'Confirmado',
  RESCHEDULED: 'Reagendamento',
  IN_PROGRESS: 'Em Andamento',
  COMPLETED: 'Concluído',
  CANCELED: 'Cancelado',
  NO_SHOW: 'Não Compareceu'
}

const statusVariants: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  PENDING: 'info',
  CONFIRMED_BY_CLIENT: 'info',
  CONFIRMED: 'success',
  RESCHEDULED: 'warning',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CANCELED: 'danger',
  NO_SHOW: 'danger'
}

export default function AppointmentsHistoryPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [status, setStatus] = useState<'ALL' | keyof typeof statusLabels | ''>('ALL')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/login')
      return
    }
    if (!user.isAdmin) {
      router.replace('/cliente')
    }
  }, [user, authLoading, router])

  if (authLoading || !user) {
    return <Loading />
  }

  if (!user.isAdmin) {
    return null
  }

  const url = useMemo(() => {
    const params = new URLSearchParams()
    params.set('limit', '200')
    if (q.trim()) params.set('q', q.trim())
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    if (status && status !== 'ALL') params.set('status', status)
    return `/api/appointments?${params.toString()}`
  }, [q, from, to, status])

  const { data: appointments = [], isLoading, mutate } = useData<Appointment[]>(url)

  const isEmpty = !isLoading && appointments.length === 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Histórico de Serviços</h1>
          <p className="text-slate-400">Busque por cliente, veículo, placa, cor ou serviço.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => mutate()}>Atualizar</Button>
          <Button
            variant="secondary"
            onClick={() => {
              setQ('')
              setFrom('')
              setTo('')
              setStatus('ALL')
            }}
          >
            Limpar filtros
          </Button>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      <Card>
        <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr]">
          <Input
            placeholder="Ex: Maria, Civic preto, PAS1794, Lavagem..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Input
            type="date"
            label="De"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            max={to || undefined}
          />
          <Input
            type="date"
            label="Até"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            min={from || undefined}
          />
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 outline-none"
            >
              <option value="ALL">Todos</option>
              <option value="COMPLETED">Concluído</option>
              <option value="CANCELED">Cancelado</option>
              <option value="NO_SHOW">No-show</option>
              <option value="IN_PROGRESS">Em andamento</option>
              <option value="CONFIRMED">Confirmado</option>
              <option value="CONFIRMED_BY_CLIENT">Cliente confirmou</option>
              <option value="PENDING">Pendente</option>
              <option value="RESCHEDULED">Reagendamento</option>
            </select>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <Card>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="border border-slate-800/70 rounded-xl p-4 bg-slate-900/40">
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="text" width="30%" />
                <Skeleton variant="rectangular" width="100%" height={18} className="rounded" />
              </div>
            ))}
          </div>
        </Card>
      ) : isEmpty ? (
        <Card>
          <div className="text-center py-10 text-slate-400">
            Nenhum serviço encontrado com esses filtros.
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {appointments.map((apt) => {
            const start = new Date(apt.startDatetime)
            const end = new Date(apt.endDatetime)
            const services = apt.appointmentServices.map((as) => as.service.name).join(' · ')

            return (
              <Card key={apt.id} className="bg-gradient-to-br from-slate-900/50 to-slate-950/60 border border-slate-800/60">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-white font-semibold text-base">
                        {format(start, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                      <p className="text-slate-400 text-sm">
                        {format(start, 'HH:mm', { locale: ptBR })} - {format(end, 'HH:mm', { locale: ptBR })}
                      </p>
                      <p className="text-slate-300 text-sm">
                        {apt.customer.name} · {apt.customer.phone}
                      </p>
                      <p className="text-slate-300 text-sm">
                        {apt.car.model} ({apt.car.plate}{apt.car.color ? ` · ${apt.car.color}` : ''})
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 text-right">
                      <Badge variant={statusVariants[apt.status] || 'default'}>
                        {statusLabels[apt.status] || apt.status}
                      </Badge>
                      <p className="text-white font-bold text-lg">R$ {Number(apt.totalPrice).toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="text-slate-200 text-sm">
                    <span className="text-slate-400">Serviços:</span> {services || '—'}
                  </div>

                  {apt.status === 'CANCELED' && apt.notes && (
                    <div className="p-3 rounded-lg border border-red-500/30 bg-red-900/10 text-sm text-red-100">
                      <div className="font-semibold text-red-200">Motivo do cliente</div>
                      <p className="mt-1 text-red-100/90 leading-relaxed">{apt.notes}</p>
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
