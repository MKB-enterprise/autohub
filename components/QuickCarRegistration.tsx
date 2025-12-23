'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { VehicleTypeSelector, VehicleType } from '@/components/ui/CarCard'

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
  const [vehicleType, setVehicleType] = useState<VehicleType>('HATCH')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function resetForm() {
    setPlate('')
    setModel('')
    setColor('')
    setYear('')
    setVehicleType('HATCH')
    setError(null)
  }

  function handleClose() {
    resetForm()
    onClose()
  }

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

      resetForm()
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar veículo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Novo Veículo">
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div>
          <label className="text-sm font-medium text-gray-300 mb-3 block">Tipo de Veículo</label>
          <VehicleTypeSelector value={vehicleType} onChange={setVehicleType} />
        </div>

        <Input
          label="Modelo"
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          required
          placeholder="Ex: Honda Civic"
        />

        <Input
          label="Placa"
          type="text"
          value={plate}
          onChange={(e) => setPlate(e.target.value.toUpperCase())}
          required
          placeholder="ABC1D23"
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Ano"
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="Ex: 2020"
          />

          <Input
            label="Cor"
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="Ex: Preto"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? '🔄 Cadastrando...' : '✅ Salvar'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
