'use client'

import { useState, useEffect } from 'react'
import { Trash2, Edit2, ToggleRight, ToggleLeft, Plus } from 'lucide-react'

interface WhatsAppConfig {
  id: string
  businessId: string
  phoneNumberId: string
  accessToken: string
  displayName: string | null
  appSecret: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  business: {
    id: string
    name: string
    email: string
    slug: string | null
  }
}

export default function WhatsAppConfigManager() {
  const [configs, setConfigs] = useState<WhatsAppConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingConfig, setEditingConfig] = useState<WhatsAppConfig | null>(null)
  const [formData, setFormData] = useState({
    businessId: '',
    phoneNumberId: '',
    accessToken: '',
    displayName: '',
    appSecret: ''
  })

  // Fetch configs on mount
  useEffect(() => {
    fetchConfigs()
  }, [])

  async function fetchConfigs() {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/whatsapp-config')
      const result = await res.json()

      if (result.success) {
        setConfigs(result.data)
        setError(null)
      } else {
        setError(result.error || 'Failed to fetch configs')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateOrUpdate() {
    try {
      if (!formData.businessId || !formData.phoneNumberId || !formData.accessToken) {
        setError('Missing required fields')
        return
      }

      const method = editingConfig ? 'PUT' : 'POST'
      const body = editingConfig
        ? { configId: editingConfig.id, ...formData }
        : formData

      const res = await fetch('/api/admin/whatsapp-config', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const result = await res.json()

      if (result.success) {
        setError(null)
        setShowForm(false)
        setEditingConfig(null)
        setFormData({
          businessId: '',
          phoneNumberId: '',
          accessToken: '',
          displayName: '',
          appSecret: ''
        })
        await fetchConfigs()
      } else {
        setError(result.error || 'Failed to save config')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  async function handleDelete(configId: string) {
    if (!confirm('Tem certeza que quer deletar esta configuração?')) return

    try {
      const res = await fetch(`/api/admin/whatsapp-config?configId=${configId}`, {
        method: 'DELETE'
      })

      const result = await res.json()

      if (result.success) {
        setError(null)
        await fetchConfigs()
      } else {
        setError(result.error || 'Failed to delete config')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  async function handleToggle(config: WhatsAppConfig) {
    try {
      const res = await fetch('/api/admin/whatsapp-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configId: config.id,
          isActive: !config.isActive
        })
      })

      const result = await res.json()

      if (result.success) {
        await fetchConfigs()
      } else {
        setError(result.error || 'Failed to toggle config')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  function handleEdit(config: WhatsAppConfig) {
    setEditingConfig(config)
    setFormData({
      businessId: config.businessId,
      phoneNumberId: config.phoneNumberId,
      accessToken: config.accessToken,
      displayName: config.displayName || '',
      appSecret: config.appSecret || ''
    })
    setShowForm(true)
  }

  if (loading) {
    return <div className="p-8 text-center">Carregando...</div>
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Configurações WhatsApp</h1>
        <p className="text-gray-600">Gerencie as contas Meta WhatsApp por negócio</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}

      <button
        onClick={() => {
          setEditingConfig(null)
          setFormData({
            businessId: '',
            phoneNumberId: '',
            accessToken: '',
            displayName: '',
            appSecret: ''
          })
          setShowForm(!showForm)
        }}
        className="mb-6 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        <Plus size={20} />
        Nova Configuração
      </button>

      {showForm && (
        <div className="mb-8 p-6 bg-gray-50 border rounded">
          <h2 className="text-xl font-bold mb-4">
            {editingConfig ? 'Editar Configuração' : 'Nova Configuração'}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Negócio*</label>
              <input
                type="text"
                placeholder="ID do negócio"
                value={formData.businessId}
                onChange={(e) => setFormData({ ...formData, businessId: e.target.value })}
                disabled={!!editingConfig}
                className="w-full px-3 py-2 border rounded disabled:bg-gray-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Phone Number ID*</label>
              <input
                type="text"
                placeholder="123456789012345"
                value={formData.phoneNumberId}
                onChange={(e) => setFormData({ ...formData, phoneNumberId: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Access Token*</label>
              <input
                type="password"
                placeholder="EAAB..."
                value={formData.accessToken}
                onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Nome Exibição</label>
              <input
                type="text"
                placeholder="Ex: Estética X"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">App Secret (opcional)</label>
              <input
                type="password"
                placeholder="App secret para webhook"
                value={formData.appSecret}
                onChange={(e) => setFormData({ ...formData, appSecret: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCreateOrUpdate}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                {editingConfig ? 'Atualizar' : 'Criar'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {configs.length === 0 ? (
        <div className="p-8 text-center text-gray-600">
          Nenhuma configuração WhatsApp encontrada
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-200">
                <th className="px-4 py-2 text-left">Negócio</th>
                <th className="px-4 py-2 text-left">Phone ID</th>
                <th className="px-4 py-2 text-left">Nome</th>
                <th className="px-4 py-2 text-center">Status</th>
                <th className="px-4 py-2 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {configs.map((config) => (
                <tr key={config.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{config.business.name}</p>
                      <p className="text-sm text-gray-600">{config.business.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">
                    {config.phoneNumberId}
                  </td>
                  <td className="px-4 py-3">
                    {config.displayName || '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-3 py-1 rounded text-sm ${
                        config.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {config.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center flex justify-center gap-2">
                    <button
                      onClick={() => handleToggle(config)}
                      className="p-2 hover:bg-gray-200 rounded"
                      title={config.isActive ? 'Desativar' : 'Ativar'}
                    >
                      {config.isActive ? (
                        <ToggleRight size={20} className="text-green-600" />
                      ) : (
                        <ToggleLeft size={20} className="text-gray-400" />
                      )}
                    </button>
                    <button
                      onClick={() => handleEdit(config)}
                      className="p-2 hover:bg-gray-200 rounded"
                      title="Editar"
                    >
                      <Edit2 size={20} className="text-blue-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(config.id)}
                      className="p-2 hover:bg-gray-200 rounded"
                      title="Deletar"
                    >
                      <Trash2 size={20} className="text-red-600" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
