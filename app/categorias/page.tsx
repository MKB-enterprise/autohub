'use client'

import { useCallback, useMemo, useState, FormEvent } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/ui/Modal'
import { Alert } from '@/components/ui/Alert'
import { Skeleton } from '@/components/ui/Skeleton'
import { useData } from '@/lib/hooks/useFetch'

interface Category {
  id: string
  name: string
  description: string | null
  _count?: {
    services: number
  }
}

export default function CategoriasPage() {
  const { data: categories = [], isLoading: loading, mutate } = useData<Category[]>('/api/categories')
  const [showNewModal, setShowNewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase()
    return categories.filter(cat =>
      cat.name.toLowerCase().includes(term) ||
      (cat.description?.toLowerCase().includes(term))
    )
  }, [categories, searchTerm])

  const reload = useCallback(() => {
    mutate()
  }, [mutate])

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    const formData = new FormData(e.currentTarget)

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          description: formData.get('description') || null,
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao criar categoria')
      }

      setShowNewModal(false)
      setSuccess('Categoria criada com sucesso!')
      reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar categoria')
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedCategory) return
    setSaving(true)
    setError(null)
    setSuccess(null)

    const formData = new FormData(e.currentTarget)

    try {
      const response = await fetch(`/api/categories/${selectedCategory.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          description: formData.get('description') || null,
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao atualizar categoria')
      }

      setShowEditModal(false)
      setSelectedCategory(null)
      setSuccess('Categoria atualizada com sucesso!')
      reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar categoria')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(categoryId: string) {
    if (!confirm('Deseja remover esta categoria?')) return
    setDeletingId(categoryId)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/categories/${categoryId}`, { method: 'DELETE' })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao excluir categoria')
      }

      setSuccess('Categoria excluída com sucesso!')
      reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir categoria')
    } finally {
      setDeletingId(null)
    }
  }

  function openEdit(category: Category) {
    setSelectedCategory(category)
    setShowEditModal(true)
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Categorias</h1>
          <p className="text-gray-400 mt-1">Organize seus serviços em categorias</p>
        </div>
        <Button onClick={() => setShowNewModal(true)}>+ Nova Categoria</Button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      <Card>
        <div className="mb-6">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Buscar categorias..."
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
                <Skeleton variant="text" width="80%" height={14} className="mb-3" />
                <Skeleton variant="rectangular" width={100} height={32} className="rounded" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>Nenhuma categoria encontrada</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((category) => (
              <div
                key={category.id}
                className="border border-gray-700 rounded-xl p-5 bg-gray-900/30 hover:bg-gray-800/50 hover:border-gray-600 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-lg text-white">{category.name}</h3>
                    {category.description && (
                      <p className="text-sm text-gray-400 mt-1 line-clamp-2">{category.description}</p>
                    )}
                  </div>
                  <div className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-200 border border-blue-500/30">
                    {category._count?.services ?? 0} serviços
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => openEdit(category)}
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    className="flex-1"
                    disabled={deletingId === category.id}
                    onClick={() => handleDelete(category.id)}
                  >
                    {deletingId === category.id ? 'Removendo...' : 'Remover'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="Nova Categoria"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Nome" name="name" required />
          <Textarea label="Descrição" name="description" rows={3} />
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

      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setSelectedCategory(null)
        }}
        title="Editar Categoria"
      >
        <form onSubmit={handleEdit} className="space-y-4">
          <Input label="Nome" name="name" defaultValue={selectedCategory?.name} required />
          <Textarea label="Descrição" name="description" rows={3} defaultValue={selectedCategory?.description || ''} />
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
                setSelectedCategory(null)
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
