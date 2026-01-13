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

export default function TenantWhatsAppConfig() {
  const [config, setConfig] = useState<WhatsAppConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    phoneNumberId: '',
    accessToken: '',
    displayName: '',
    appSecret: ''
  })

  // Fetch config on mount
  useEffect(() => {
    fetchConfig()
  }, [])

  async function fetchConfig() {
    try {
      setLoading(true)
      const res = await fetch('/api/tenant/whatsapp-config')
      const result = await res.json()

      if (result.success && result.data) {
        setConfig(result.data)
        setFormData({
          phoneNumberId: result.data.phoneNumberId,
          accessToken: result.data.accessToken,
          displayName: result.data.displayName || '',
          appSecret: result.data.appSecret || ''
        })
        setError(null)
      } else if (res.status === 404) {
        setConfig(null)
        setError(null)
      } else {
        setError(result.error || 'Failed to fetch config')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateOrUpdate() {
    try {
      if (!formData.phoneNumberId || !formData.accessToken) {
        setError('Phone Number ID e Access Token são obrigatórios')
        return
      }

      const method = config ? 'PUT' : 'POST'
      const body = {
        phoneNumberId: formData.phoneNumberId,
        accessToken: formData.accessToken,
        displayName: formData.displayName,
        appSecret: formData.appSecret
      }

      const res = await fetch('/api/tenant/whatsapp-config', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const result = await res.json()

      if (result.success) {
        setError(null)
        setEditing(false)
        await fetchConfig()
      } else {
        setError(result.error || 'Failed to save config')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  async function handleDelete() {
    if (!confirm('Tem certeza que quer deletar esta configuração? O WhatsApp será desconectado.')) {
      return
    }

    try {
      const res = await fetch('/api/tenant/whatsapp-config', {
        method: 'DELETE'
      })

      const result = await res.json()

      if (result.success) {
        setError(null)
        setConfig(null)
        await fetchConfig()
      } else {
        setError(result.error || 'Failed to delete config')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  async function handleToggle() {
    if (!config) return

    try {
      const res = await fetch('/api/tenant/whatsapp-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: !config.isActive
        })
      })

      const result = await res.json()

      if (result.success) {
        await fetchConfig()
      } else {
        setError(result.error || 'Failed to toggle config')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  if (loading) {
    return <div className="p-8 text-center">Carregando...</div>
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Configuração WhatsApp</h1>
        <p className="text-gray-600">Conecte sua conta Meta WhatsApp para enviar mensagens automáticas</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}

      {!config ? (
        // No config - show form to create
        <div className="bg-gray-50 p-6 border rounded">
          <h2 className="text-xl font-bold mb-4">Conectar WhatsApp</h2>
          <p className="text-sm text-gray-600 mb-6">
            Você não possui uma configuração WhatsApp. Preencha os dados abaixo para conectar sua conta Meta.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Phone Number ID*</label>
              <input
                type="text"
                placeholder="Ex: 123456789012345"
                value={formData.phoneNumberId}
                onChange={(e) => setFormData({ ...formData, phoneNumberId: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              />
              <p className="text-xs text-gray-500 mt-1">
                Encontre em: Meta Business Manager → Apps → WhatsApp → Phone Numbers
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Access Token*</label>
              <input
                type="password"
                placeholder="Ex: EAAB..."
                value={formData.accessToken}
                onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              />
              <p className="text-xs text-gray-500 mt-1">
                Gere um token em: Meta Business Manager → Apps → WhatsApp → Settings → Security
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Nome de Exibição (opcional)</label>
              <input
                type="text"
                placeholder="Ex: Minha Estética"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">App Secret (opcional)</label>
              <input
                type="password"
                placeholder="Para validar webhooks"
                value={formData.appSecret}
                onChange={(e) => setFormData({ ...formData, appSecret: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <button
              onClick={handleCreateOrUpdate}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
            >
              Conectar WhatsApp
            </button>
          </div>
        </div>
      ) : (
        // Config exists - show details and edit/delete options
        <div>
          <div className="bg-white p-6 border rounded mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">{config.displayName}</h2>
                <p className="text-sm text-gray-600">Phone ID: {config.phoneNumberId}</p>
              </div>
              <span
                className={`px-3 py-1 rounded text-sm font-medium ${
                  config.isActive
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {config.isActive ? 'Ativo' : 'Inativo'}
              </span>
            </div>

            <div className="pt-4 border-t space-y-2">
              <p className="text-sm"><span className="font-medium">Criado em:</span> {new Date(config.createdAt).toLocaleDateString('pt-BR')}</p>
              <p className="text-sm"><span className="font-medium">Última atualização:</span> {new Date(config.updatedAt).toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          {!editing ? (
            <div className="flex gap-3">
              <button
                onClick={() => setEditing(true)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <Edit2 size={18} />
                Editar
              </button>
              <button
                onClick={handleToggle}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                {config.isActive ? (
                  <>
                    <ToggleRight size={18} />
                    Desativar
                  </>
                ) : (
                  <>
                    <ToggleLeft size={18} />
                    Ativar
                  </>
                )}
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                <Trash2 size={18} />
                Deletar
              </button>
            </div>
          ) : (
            <div className="bg-gray-50 p-6 border rounded">
              <h3 className="text-lg font-bold mb-4">Editar Configuração</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Phone Number ID*</label>
                  <input
                    type="text"
                    value={formData.phoneNumberId}
                    onChange={(e) => setFormData({ ...formData, phoneNumberId: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Access Token*</label>
                  <input
                    type="password"
                    value={formData.accessToken}
                    onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Nome de Exibição</label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">App Secret</label>
                  <input
                    type="password"
                    value={formData.appSecret}
                    onChange={(e) => setFormData({ ...formData, appSecret: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleCreateOrUpdate}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Atualizar
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="flex-1 px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
