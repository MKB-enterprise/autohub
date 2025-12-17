'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Alert } from '@/components/ui/Alert'

interface QuickCarRegistrationProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  customerId: string
}

export default function QuickCarRegistration({ isOpen, onClose, onSuccess, customerId }: QuickCarRegistrationProps) {
  const [plate, setPlate] = useState('')
  const [model, setModel] = useState('')
  const [color, setColor] = useState('')
  const [year, setYear] = useState('')
  const [vehicleType, setVehicleType] = useState('HATCH')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const vehicleTypes = [
    { value: 'HATCH', label: 'Hatchback' },
    { value: 'SEDAN', label: 'Sedan' },
    { value: 'SUV', label: 'SUV' },
    { value: 'PICKUP', label: 'Pickup' },
    { value: 'MOTO', label: 'Moto' },
    { value: 'VAN', label: 'Van' },
  ]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await fetch('/api/cars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          plate,
          model,
          color: color || null,
          year: year ? parseInt(year) : null,
          vehicleType,
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao cadastrar veículo')
      }

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar veículo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cadastrar Veículo">
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <Input
          label="Placa"
          type="text"
          value={plate}
          onChange={(e) => setPlate(e.target.value.toUpperCase())}
          required
          placeholder="ABC-1234"
        />

        <Input
          label="Modelo"
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          required
          placeholder="Ex: Honda Civic"
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Cor"
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="Ex: Preto"
          />

          <Input
            label="Ano"
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="Ex: 2020"
          />
        </div>

        <Select
          label="Tipo de Veículo"
          value={vehicleType}
          onChange={(e) => setVehicleType(e.target.value)}
          options={vehicleTypes}
        />

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? '🔄 Cadastrando...' : '✅ Cadastrar'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
