'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/ui/Modal'
import { Loading } from '@/components/ui/Loading'
import { useOptimisticUpdate } from '@/lib/hooks/useOptimisticUpdate'

interface Service {
  id: string
  name: string
  price: number
  durationMinutes: number
}

interface Package {
  id: string
  name: string
  description: string | null
  discountPercent: number
  isActive: boolean
  originalPrice: number
  finalPrice: number
  totalDuration: number
  savings: number
  services: Array<{
    service: Service
  }>
}

export default function PacotesPage() {
  const [packages, setPackages] = useState<Package[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPackage, setEditingPackage] = useState<Package | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    discountPercent: 10,
    serviceIds: [] as string[],
    isActive: true
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [pkgRes, svcRes] = await Promise.all([
        fetch('/api/packages'),
        fetch('/api/services?activeOnly=true')
      ])
      const pkgData = await pkgRes.json()
      const svcData = await svcRes.json()
      setPackages(pkgData)
      setServices(svcData)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const { execute: handleSave, isLoading: isSaving } = useOptimisticUpdate({
    onOptimistic: () => {
      setShowModal(false)
      resetForm()
      loadData()
    },
    onAsync: async () => {
      const url = editingPackage ? `/api/packages/${editingPackage.id}` : '/api/packages'
      const method = editingPackage ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erro ao salvar pacote')
      }
    },
    onError: (error) => {
      alert(error.message)
    }
  })

  const handleEdit = (pkg: Package) => {
    setEditingPackage(pkg)
    setFormData({
      name: pkg.name,
      description: pkg.description || '',
      discountPercent: Number(pkg.discountPercent),
      serviceIds: pkg.services.map(ps => ps.service.id),
      isActive: pkg.isActive
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este pacote?')) return

    // Remove otimisticamente
    const previousPackages = packages
    setPackages(packages.filter(p => p.id !== id))

    try {
      const res = await fetch(`/api/packages/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        // Restaura se falhar
        setPackages(previousPackages)
        throw new Error('Erro ao deletar')
      }
    } catch (error) {
      console.error('Erro ao deletar:', error)
      alert('Erro ao deletar pacote')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      discountPercent: 10,
      serviceIds: [],
      isActive: true
    })
    setEditingPackage(null)
  }

  const toggleService = (serviceId: string) => {
    setFormData(prev => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(serviceId)
        ? prev.serviceIds.filter(id => id !== serviceId)
        : [...prev.serviceIds, serviceId]
    }))
  }

  if (loading) return <Loading />

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Pacotes e Combos</h1>
        <Button
          onClick={() => {
            resetForm()
            setShowModal(true)
          }}
        >
          + Novo Pacote
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages.map(pkg => (
          <Card key={pkg.id} className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-semibold">{pkg.name}</h3>
                {!pkg.isActive && (
                  <span className="text-sm text-gray-500">(Inativo)</span>
                )}
              </div>
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                -{pkg.discountPercent}%
              </span>
            </div>

            {pkg.description && (
              <p className="text-gray-600 text-sm mb-4">{pkg.description}</p>
            )}

            <div className="space-y-2 mb-4">
              <h4 className="font-medium text-sm text-gray-700">Serviços inclusos:</h4>
              <ul className="space-y-1">
                {pkg.services.map(({ service }) => (
                  <li key={service.id} className="text-sm text-gray-600">
                    • {service.name} (R$ {service.price.toFixed(2)})
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Preço original:</span>
                <span className="line-through text-gray-500">
                  R$ {pkg.originalPrice.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Preço do pacote:</span>
                <span className="text-green-600">R$ {pkg.finalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-green-600">
                <span>Economia:</span>
                <span>R$ {pkg.savings.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Duração total:</span>
                <span>{pkg.totalDuration} min</span>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button
                onClick={() => handleEdit(pkg)}
                className="flex-1"
                variant="secondary"
                disabled={deletingId === pkg.id}
              >
                Editar
              </Button>
              <Button
                onClick={() => handleDelete(pkg.id)}
                className="flex-1"
                variant="danger"
                disabled={deletingId === pkg.id}
              >
                {deletingId === pkg.id ? 'Excluindo...' : 'Excluir'}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {packages.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>Nenhum pacote cadastrado.</p>
          <p className="text-sm mt-2">Crie combos de serviços com desconto!</p>
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          resetForm()
        }}
        title={editingPackage ? 'Editar Pacote' : 'Novo Pacote'}
      >
        <div className="space-y-4">
          <Input
            label="Nome do Pacote"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Lavagem Completa Premium"
          />

          <Textarea
            label="Descrição (opcional)"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Descreva o que está incluído no pacote"
            rows={3}
          />

          <Input
            label="Desconto (%)"
            type="number"
            min="0"
            max="100"
            value={formData.discountPercent}
            onChange={(e) => setFormData({ ...formData, discountPercent: Number(e.target.value) })}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Serviços (selecione pelo menos 1)
            </label>
            <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
              {services.map(service => (
                <label
                  key={service.id}
                  className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded"
                >
                  <input
                    type="checkbox"
                    checked={formData.serviceIds.includes(service.id)}
                    onChange={() => toggleService(service.id)}
                    className="w-4 h-4"
                  />
                  <span className="flex-1">
                    {service.name} - R$ {service.price.toFixed(2)} ({service.durationMinutes}min)
                  </span>
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm">Pacote ativo</span>
          </label>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={() => {
                setShowModal(false)
                resetForm()
              }}
              variant="secondary"
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1"
              disabled={!formData.name || formData.serviceIds.length === 0 || isSaving}
            >
              {isSaving ? 'Salvando...' : editingPackage ? 'Salvar' : 'Criar Pacote'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
