'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTenantPath } from '@/lib/tenant-path'
import { useAuth } from '@/lib/AuthContext'
import { useRequireBusinessAuth } from '@/lib/hooks/useRequireBusinessAuth'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { Alert } from '@/components/ui/Alert'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'
import { useData } from '@/lib/hooks/useFetch'
import { useOptimisticUpdate } from '@/lib/hooks/useOptimisticUpdate'
import { useDebounce } from '@/lib/hooks/useDebounce'

interface Customer {
  id: string
  name: string
  phone: string
  notes: string | null
  cars: {
    id: string
    plate: string
    model: string
  }[]
  _count?: {
    appointments: number
  }
}

export default function ClientesPage() {
  const isAuthorized = useRequireBusinessAuth()
  if (!isAuthorized) return null
  
  const router = useRouter()
  const getTenantPath = useTenantPath()
  const { user, business, loading: authLoading } = useAuth()
  const [success, setSuccess] = useState<string | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
  // Debounce do searchTerm para evitar muitas requisições
  const debouncedSearch = useDebounce(searchTerm, 300)

  // SWR para cache e revalidação automática
  const url = debouncedSearch 
    ? `/api/customers?search=${encodeURIComponent(debouncedSearch)}`
    : '/api/customers'
  const { data: customers = [], isLoading: loading, mutate } = useData<Customer[]>(url)
  
  const [error, setError] = useState<string | null>(null)

  const loadCustomers = useCallback(() => {
    mutate()
  }, [mutate])

  // Hook para criar cliente - otimistic update
  const { execute: executeCreate, isLoading: creatingCustomer } = useOptimisticUpdate({
    onOptimistic: () => {
      setSuccess('Cliente criado com sucesso!')
      setShowNewModal(false)
      loadCustomers()
    },
    onAsync: async () => {
      const formEl = document.querySelector('form[data-form="create-customer"]') as HTMLFormElement
      if (!formEl) throw new Error('Formulário não encontrado')
      
      const formData = new FormData(formEl)
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          phone: formData.get('phone'),
          notes: formData.get('notes')
        })
      })

      if (!response.ok) {
        throw new Error('Erro ao criar cliente')
      }
    },
    onError: (err) => {
      setError(err.message)
    }
  })

  // Hook para editar cliente - otimistic update
  const { execute: executeEdit, isLoading: editingCustomer } = useOptimisticUpdate({
    onOptimistic: () => {
      setSuccess('Cliente atualizado com sucesso!')
      setShowEditModal(false)
      setSelectedCustomer(null)
      loadCustomers()
    },
    onAsync: async () => {
      if (!selectedCustomer) throw new Error('Cliente não selecionado')

      const formEl = document.querySelector('form[data-form="edit-customer"]') as HTMLFormElement
      if (!formEl) throw new Error('Formulário não encontrado')
      
      const formData = new FormData(formEl)
      const response = await fetch(`/api/customers/${selectedCustomer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          phone: formData.get('phone'),
          notes: formData.get('notes')
        })
      })

      if (!response.ok) {
        throw new Error('Erro ao atualizar cliente')
      }
    },
    onError: (err) => {
      setError(err.message)
    }
  })

  // Hook para deletar cliente
  async function handleDelete(customerId: string) {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) {
      return
    }

    // Remove otimisticamente
    const customersBeforeDelete = customers
    mutate(customers.filter(c => c.id !== customerId), false)
    setSuccess('Cliente excluído com sucesso!')
    setError(null)

    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        // Restaura se falhar
        mutate(customersBeforeDelete, false)
        const data = await response.json()
        throw new Error(data.error || 'Erro ao excluir cliente')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir cliente')
    }
  }

  function openEditModal(customer: Customer) {
    setSelectedCustomer(customer)
    setShowEditModal(true)
  }

  function viewDetails(customerId: string) {
    router.push(getTenantPath(`clientes/${customerId}`))
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Clientes</h1>
          <p className="text-gray-400 mt-1">Gerenciamento de clientes</p>
        </div>
        <Button onClick={() => setShowNewModal(true)}>+ Novo Cliente</Button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      <Card>
        <div className="mb-6">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Buscar por nome ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyUp={(e) => e.key === 'Enter' && loadCustomers()}
              className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Telefone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Veículos</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Agendamentos</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-gray-900/30 divide-y divide-gray-700">
                {[...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><Skeleton variant="text" width={120} /></td>
                    <td className="px-6 py-4"><Skeleton variant="text" width={100} /></td>
                    <td className="px-6 py-4"><Skeleton variant="rectangular" width={80} height={24} className="rounded-full" /></td>
                    <td className="px-6 py-4"><Skeleton variant="text" width={80} /></td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <Skeleton variant="rectangular" width={80} height={32} className="rounded" />
                        <Skeleton variant="rectangular" width={60} height={32} className="rounded" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>Nenhum cliente encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Telefone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Veículos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Agendamentos
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-900/30 divide-y divide-gray-700">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{customer.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{customer.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge>{customer.cars.length} veículo(s)</Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-300">
                        {customer._count?.appointments || 0} agendamento(s)
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="secondary" onClick={() => viewDetails(customer.id)}>
                          Ver Detalhes
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => openEditModal(customer)}>
                          Editar
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => handleDelete(customer.id)} disabled={deletingId === customer.id}>
                          {deletingId === customer.id ? 'Excluindo...' : 'Excluir'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal Novo Cliente */}
      <Modal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="Novo Cliente"
      >
        <form onSubmit={(e) => { e.preventDefault(); executeCreate() }} data-form="create-customer" className="space-y-4">
          <Input label="Nome" name="name" required />
          <Input label="Telefone" name="phone" type="tel" required />
          <Textarea label="Observações" name="notes" rows={3} />
          <div className="flex gap-2">
            <Button type="submit" disabled={creatingCustomer}>
              {creatingCustomer ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowNewModal(false)} disabled={creatingCustomer}>
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Editar Cliente */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setSelectedCustomer(null)
        }}
        title="Editar Cliente"
      >
        <form onSubmit={(e) => { e.preventDefault(); executeEdit() }} data-form="edit-customer" className="space-y-4">
          <Input label="Nome" name="name" defaultValue={selectedCustomer?.name} required />
          <Input label="Telefone" name="phone" type="tel" defaultValue={selectedCustomer?.phone} required />
          <Textarea label="Observações" name="notes" rows={3} defaultValue={selectedCustomer?.notes || ''} />
          <div className="flex gap-2">
            <Button type="submit" disabled={editingCustomer}>
              {editingCustomer ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={editingCustomer}
              onClick={() => {
                setShowEditModal(false)
                setSelectedCustomer(null)
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
