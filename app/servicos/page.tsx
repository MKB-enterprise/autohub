'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Skeleton } from '@/components/ui/Skeleton'
import { Alert } from '@/components/ui/Alert'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { useData } from '@/lib/hooks/useFetch'

interface Category {
  id: string
  name: string
}

interface Service {
  id: string
  name: string
  description: string | null
  durationMinutes: number
  price: number
  isActive: boolean
  serviceGroup: string | null
  categoryId?: string | null
  category?: Category | null
}

// Grupos padrão sugeridos (admin pode criar novos)
const SUGGESTED_GROUPS = [
  { value: '', label: 'Nenhum (pode combinar com qualquer)' },
  { value: 'lavagem', label: 'Lavagem' },
  { value: 'polimento', label: 'Polimento' },
  { value: 'protecao', label: 'Proteção/Vitrificação' },
  { value: 'higienizacao', label: 'Higienização' },
]

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}min`
}

export default function ServicosPage() {
  const { data: services = [], isLoading: loading, mutate } = useData<Service[]>('/api/services')
  const { data: categories = [] } = useData<Category[]>('/api/categories')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadServices = useCallback(() => {
    mutate()
  }, [mutate])

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const formData = new FormData(e.currentTarget)

    try {
      const response = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          description: formData.get('description'),
          durationMinutes: parseInt(formData.get('durationMinutes') as string),
          price: parseFloat(formData.get('price') as string),
          isActive: true,
          serviceGroup: formData.get('serviceGroup') || null,
          categoryId: formData.get('categoryId') || null
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao criar serviço')
      }

      setSuccess('Serviço criado com sucesso!')
      setShowNewModal(false)
      loadServices()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar serviço')
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedService) return
    setSaving(true)

    const formData = new FormData(e.currentTarget)

    try {
      const response = await fetch(`/api/services/${selectedService.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          description: formData.get('description'),
          durationMinutes: parseInt(formData.get('durationMinutes') as string),
          price: parseFloat(formData.get('price') as string),
          isActive: formData.get('isActive') === 'true',
          serviceGroup: formData.get('serviceGroup') || null,
          categoryId: formData.get('categoryId') || null
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao atualizar serviço')
      }

      setSuccess('Serviço atualizado com sucesso!')
      setShowEditModal(false)
      setSelectedService(null)
      loadServices()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar serviço')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(serviceId: string) {
    if (!confirm('Tem certeza que deseja remover este serviço?')) {
      return
    }
    setDeletingId(serviceId)

    try {
      const response = await fetch(`/api/services/${serviceId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Erro ao excluir serviço')
      }

      const data = await response.json()
      
      if (data.message) {
        setSuccess(data.message)
      } else {
        setSuccess('Serviço excluído com sucesso!')
      }
      
      loadServices()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir serviço')
    } finally {
      setDeletingId(null)
    }
  }

  function openEditModal(service: Service) {
    setSelectedService(service)
    setShowEditModal(true)
  }

  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (service.description?.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Serviços</h1>
          <p className="text-gray-400 mt-1">Catálogo de serviços oferecidos</p>
        </div>
        <Button onClick={() => setShowNewModal(true)}>+ Novo Serviço</Button>
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
              placeholder="Buscar serviços..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="border border-gray-700 rounded-xl p-5 bg-gray-900/30">
                <Skeleton variant="text" width="60%" height={24} className="mb-2" />
                <Skeleton variant="text" width="80%" height={14} className="mb-4" />
                <Skeleton variant="text" width={80} height={14} className="mb-4" />
                <Skeleton variant="text" width={100} height={32} className="mb-4" />
                <div className="flex gap-2">
                  <Skeleton variant="rectangular" width="50%" height={32} className="rounded" />
                  <Skeleton variant="rectangular" width="50%" height={32} className="rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>Nenhum serviço encontrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredServices.map((service) => (
              <div 
                key={service.id} 
                className={`border border-gray-700 rounded-xl p-5 bg-gray-900/30 hover:bg-gray-800/50 hover:border-gray-600 transition-all ${!service.isActive ? 'opacity-50' : ''}`}
              >
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg text-white">{service.name}</h3>
                    {!service.isActive && <Badge variant="danger">Inativo</Badge>}
                  </div>
                  {service.description && (
                    <p className="text-sm text-gray-400 line-clamp-2">{service.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-400 mb-2">
                  <span className="flex items-center gap-1">
                    🕐 {formatDuration(service.durationMinutes)}
                  </span>
                </div>

                {service.category && (
                  <div className="mb-2">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-200 border border-blue-500/30">
                      🏷️ {service.category.name}
                    </span>
                  </div>
                )}

                {service.serviceGroup && (
                  <div className="mb-3">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      🔒 Grupo: {SUGGESTED_GROUPS.find(g => g.value === service.serviceGroup)?.label || service.serviceGroup}
                    </span>
                  </div>
                )}

                <p className="text-2xl font-bold text-blue-400 mb-4">
                  R$ {Number(service.price).toFixed(2).replace('.', ',')}
                </p>

                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    onClick={() => openEditModal(service)}
                    className="flex-1"
                    disabled={deletingId === service.id}
                  >
                    Editar
                  </Button>
                  <Button 
                    size="sm" 
                    variant="danger" 
                    onClick={() => handleDelete(service.id)}
                    className="flex-1"
                    disabled={deletingId === service.id}
                  >
                    {deletingId === service.id ? 'Removendo...' : 'Remover'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modal Novo Serviço */}
      <Modal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="Novo Serviço"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Nome" name="name" required />
          <Textarea label="Descrição" name="description" rows={3} />
          <Input 
            label="Duração (minutos)" 
            name="durationMinutes" 
            type="number" 
            min="1" 
            required 
          />
          <Input 
            label="Preço (R$)" 
            name="price" 
            type="number" 
            step="0.01" 
            min="0.01" 
            required 
          />
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Grupo de Exclusividade
            </label>
            <select 
              name="serviceGroup" 
              defaultValue=""
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {SUGGESTED_GROUPS.map(group => (
                <option key={group.value} value={group.value}>{group.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Serviços do mesmo grupo são mutuamente exclusivos (cliente só pode escolher um)
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Categoria
            </label>
            <select
              name="categoryId"
              defaultValue=""
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Sem categoria</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Use categorias para organizar o catálogo de serviços
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowNewModal(false)} disabled={saving}>
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Editar Serviço */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setSelectedService(null)
        }}
        title="Editar Serviço"
      >
        <form onSubmit={handleEdit} className="space-y-4">
          <Input label="Nome" name="name" defaultValue={selectedService?.name} required />
          <Textarea label="Descrição" name="description" rows={3} defaultValue={selectedService?.description || ''} />
          <Input 
            label="Duração (minutos)" 
            name="durationMinutes" 
            type="number" 
            min="1" 
            defaultValue={selectedService?.durationMinutes}
            required 
          />
          <Input 
            label="Preço (R$)" 
            name="price" 
            type="number" 
            step="0.01" 
            min="0.01" 
            defaultValue={selectedService?.price}
            required 
          />
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Grupo de Exclusividade
            </label>
            <select 
              name="serviceGroup" 
              defaultValue={selectedService?.serviceGroup || ''}
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {SUGGESTED_GROUPS.map(group => (
                <option key={group.value} value={group.value}>{group.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Serviços do mesmo grupo são mutuamente exclusivos (cliente só pode escolher um)
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Categoria
            </label>
            <select
              name="categoryId"
              defaultValue={selectedService?.categoryId || ''}
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Sem categoria</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Use categorias para organizar o catálogo de serviços
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Status
            </label>
            <select 
              name="isActive" 
              defaultValue={selectedService?.isActive ? 'true' : 'false'}
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={saving}
              onClick={() => {
                setShowEditModal(false)
                setSelectedService(null)
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
