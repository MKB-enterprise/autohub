'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { useData } from '@/lib/hooks/useFetch'
import { useAuth } from '@/lib/AuthContext'
import QuickCarRegistration from '@/components/QuickCarRegistration'

interface Car {
  id: string
  plate: string
  model: string
  color: string | null
  customer: {
    id: string
    name: string
  }
  appointments: {
    id: string
    status: string
  }[]
}

interface Customer {
  id: string
  name: string
}

export default function CarrosPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { data: cars = [], isLoading: loading, mutate } = useData<Car[]>('/api/cars')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  function getCarStatus(car: Car): { label: string; variant: 'success' | 'warning' | 'default' } {
    const hasInProgress = car.appointments.some(a => a.status === 'IN_PROGRESS')
    if (hasInProgress) {
      return { label: 'Em manutenção', variant: 'warning' }
    }
    return { label: 'Ativo', variant: 'success' }
  }

  const filteredCars = cars.filter(car => 
    car.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    car.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    car.customer.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Carros</h1>
          <p className="text-gray-400 mt-1">Cadastro de veículos</p>
        </div>
        <Button onClick={() => setShowNewModal(true)}>
          + Novo Carro
        </Button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      <Card>
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Buscar por placa, modelo ou proprietário..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">Veículo</th>
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">Placa</th>
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">Proprietário</th>
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">Status</th>
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {[...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-gray-800">
                    <td className="py-4 px-4">
                      <Skeleton variant="text" width={120} height={18} />
                      <Skeleton variant="text" width={60} height={14} className="mt-1" />
                    </td>
                    <td className="py-4 px-4"><Skeleton variant="text" width={80} /></td>
                    <td className="py-4 px-4"><Skeleton variant="text" width={100} /></td>
                    <td className="py-4 px-4"><Skeleton variant="rectangular" width={70} height={24} className="rounded-full" /></td>
                    <td className="py-4 px-4"><Skeleton variant="rectangular" width={100} height={32} className="rounded" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : filteredCars.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>Nenhum veículo encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">Veículo</th>
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">Placa</th>
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">Proprietário</th>
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">Status</th>
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredCars.map((car) => {
                  const status = getCarStatus(car)
                  return (
                    <tr key={car.id} className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-white">{car.model}</p>
                          {car.color && <p className="text-sm text-gray-400">{car.color}</p>}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-mono text-gray-300">{car.plate}</span>
                      </td>
                      <td className="py-4 px-4 text-gray-300">{car.customer.name}</td>
                      <td className="py-4 px-4">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </td>
                      <td className="py-4 px-4">
                        <Button size="sm" variant="secondary">
                          Ver histórico
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {user && (
        <QuickCarRegistration
          isOpen={showNewModal}
          onClose={() => setShowNewModal(false)}
          onSuccess={() => {
            setShowNewModal(false)
            setSuccess('Veículo cadastrado com sucesso!')
            router.refresh()
            mutate()
          }}
          customerId={user.id}
        />
      )}
    </div>
  )
}
