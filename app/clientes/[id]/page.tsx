'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Loading } from '@/components/ui/Loading'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface CustomerDetail {
  id: string
  name: string
  phone: string
  notes: string | null
  cars: {
    id: string
    plate: string
    model: string
    color: string | null
  }[]
  appointments: {
    id: string
    startDatetime: string
    endDatetime: string
    status: string
    totalPrice: number
    car: {
      plate: string
      model: string
    }
    appointmentServices: {
      service: {
        name: string
      }
    }[]
  }[]
}

const statusLabels: Record<string, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em Andamento',
  COMPLETED: 'Concluído',
  CANCELED: 'Cancelado',
  NO_SHOW: 'Não Compareceu'
}

const statusVariants: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  PENDING: 'default',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CANCELED: 'danger',
  NO_SHOW: 'danger'
}

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadCustomer()
  }, [params.id])

  async function loadCustomer() {
    try {
      setLoading(true)
      const response = await fetch(`/api/customers/${params.id}`)
      
      if (!response.ok) {
        throw new Error('Erro ao carregar cliente')
      }

      const data = await response.json()
      setCustomer(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <Loading />
  }

  if (error || !customer) {
    return (
      <div className="space-y-6">
        <Alert type="error" message={error || 'Cliente não encontrado'} />
        <Button onClick={() => router.push('/clientes')}>Voltar</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{customer.name}</h1>
        <Button variant="secondary" onClick={() => router.push('/clientes')}>
          Voltar
        </Button>
      </div>

      <Card title="Informações do Cliente">
        <div className="space-y-2">
          <p><strong>Telefone:</strong> {customer.phone}</p>
          {customer.notes && (
            <p><strong>Observações:</strong> {customer.notes}</p>
          )}
        </div>
      </Card>

      <Card title="Veículos">
        {customer.cars.length === 0 ? (
          <p className="text-gray-500">Nenhum veículo cadastrado</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customer.cars.map((car) => (
              <div key={car.id} className="border border-gray-700 rounded-lg p-4 bg-gray-800/50">
                <p className="font-semibold text-white">{car.model}</p>
                <p className="text-sm text-gray-400">Placa: {car.plate}</p>
                {car.color && (
                  <p className="text-sm text-gray-400">Cor: {car.color}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Histórico de Agendamentos">
        {customer.appointments.length === 0 ? (
          <p className="text-gray-500">Nenhum agendamento encontrado</p>
        ) : (
          <div className="space-y-4">
            {customer.appointments.map((appointment) => (
              <div key={appointment.id} className="border border-gray-700 rounded-lg p-4 bg-gray-800/50">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-white">
                      {format(new Date(appointment.startDatetime), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                    <p className="text-sm text-gray-400">
                      {appointment.car.model} - {appointment.car.plate}
                    </p>
                  </div>
                  <Badge variant={statusVariants[appointment.status]}>
                    {statusLabels[appointment.status]}
                  </Badge>
                </div>
                <div className="text-sm space-y-1 text-gray-300">
                  <p><strong>Serviços:</strong> {appointment.appointmentServices.map(as => as.service.name).join(', ')}</p>
                  <p><strong>Valor:</strong> R$ {Number(appointment.totalPrice).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
