/**
 * Tela de Configurações da Empresa (Admin/Owner Dashboard)
 * Permite editar: branding, horários, capacidade, cards, contato, notificações
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '@/lib/AuthContext'
import { useTenant } from '@/lib/TenantContext'
import { withTenantHeaders } from '@/lib/tenant-client'
import { useRequireAuth } from '@/lib/hooks/useRequireAuth'
import {
  UpdateBrandingDto,
  UpdateHoursDto,
  UpdateCapacityDto,
  UpdateCardsDto,
  UpdateContactDto
} from '@/lib/tenant-settings'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Alert } from '@/components/ui/Alert'

type TabType = 'branding' | 'hours' | 'capacity' | 'cards' | 'contact' | 'whatsapp' | 'notifications'

export default function TenantSettingsPage() {
  const router = useRouter()
  const { user, business, loading: authLoading } = useAuth()
  const { tenant, settings, loading, error: tenantError, refreshSettings } = useTenant()
  const [activeTab, setActiveTab] = useState<TabType>('branding')
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [whatsAppConfig, setWhatsAppConfig] = useState<any | null>(null)
  const [whatsAppLoading, setWhatsAppLoading] = useState(false)
  const [whatsAppMessage, setWhatsAppMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [whatsAppForm, setWhatsAppForm] = useState({
    phoneNumberId: '',
    accessToken: '',
    displayName: '',
    appSecret: ''
  })

  // Estados para cada seção
  const [brandingData, setBrandingData] = useState<UpdateBrandingDto>({})
  const [hoursData, setHoursData] = useState<UpdateHoursDto>({})
  const [capacityData, setCapacityData] = useState<UpdateCapacityDto>({})
  const [cardsData, setCardsData] = useState<UpdateCardsDto>({ cards: [] })
  const [contactData, setContactData] = useState<UpdateContactDto>({})

  // Requer autenticação como admin/business
  useRequireAuth('admin')

  // Inicializar dados quando settings carregar
  useEffect(() => {
    if (settings) {
      setBrandingData({
        displayName: settings.branding.displayName,
        theme: settings.branding.theme,
        footerText: settings.branding.footerText || undefined
      })
      setHoursData({
        timezone: settings.hours.timezone,
        openingHours: settings.hours.openingHours,
        slotDurationMinutes: settings.hours.slotDurationMinutes,
        minimumAdvanceBookingHours: settings.hours.minimumAdvanceBookingHours,
        cancellationPolicyHours: settings.hours.cancellationPolicyHours
      })
      setCapacityData({
        capacityPerSlot: settings.capacity.capacityPerSlot,
        enableOverbooking: settings.capacity.enableOverbooking,
        maxBookingsPerDay: settings.capacity.maxBookingsPerDay || undefined
      })
      setCardsData({
        cards: settings.cards.cards
      })
      setContactData({
        whatsapp: settings.contact.whatsapp || undefined,
        phone: settings.contact.phone || undefined,
        address: settings.contact.address
          ? {
              street: settings.contact.address.street || undefined,
              city: settings.contact.address.city || undefined,
              state: settings.contact.address.state || undefined,
              zipcode: settings.contact.address.zipcode || undefined
            }
          : undefined,
        social: settings.contact.social
          ? {
              instagram: settings.contact.social.instagram || undefined,
              facebook: settings.contact.social.facebook || undefined,
              linkedin: settings.contact.social.linkedin || undefined
            }
          : undefined
      })
    }
  }, [settings])

  useEffect(() => {
    loadWhatsAppConfig()
  }, [])

  async function handleSave(section: TabType, data: any) {
    try {
      setIsSaving(true)
      setSaveMessage(null)

      const payload: any = {}
      switch (section) {
        case 'branding':
          payload.branding = data
          break
        case 'hours':
          payload.hours = data
          break
        case 'capacity':
          payload.capacity = data
          break
        case 'cards':
          payload.cards = data
          break
        case 'contact':
          payload.contact = data
          break
      }

      const response = await fetch('/api/tenant/settings', {
        method: 'PUT',
        ...withTenantHeaders({
          headers: {
            'Content-Type': 'application/json'
          }
        }),
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao salvar')
      }

      setSaveMessage({
        type: 'success',
        text: 'Configurações salvas com sucesso!'
      })

      // Recarregar settings
      await refreshSettings()
    } catch (err) {
      setSaveMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao salvar'
      })
    } finally {
      setIsSaving(false)
    }
  }

  async function loadWhatsAppConfig() {
    try {
      setWhatsAppLoading(true)
      setWhatsAppMessage(null)
      const response = await fetch('/api/tenant/whatsapp-config', {
        ...withTenantHeaders({
          headers: { 'Content-Type': 'application/json' }
        })
      })

      if (response.status === 404) {
        setWhatsAppConfig(null)
        setWhatsAppForm({ phoneNumberId: '', accessToken: '', displayName: '', appSecret: '' })
        return
      }

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erro ao carregar config WhatsApp')
      }

      if (result.data) {
        setWhatsAppConfig(result.data)
        setWhatsAppForm({
          phoneNumberId: result.data.phoneNumberId,
          accessToken: result.data.accessToken,
          displayName: result.data.displayName || '',
          appSecret: result.data.appSecret || ''
        })
      }
    } catch (err) {
      setWhatsAppMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao carregar config WhatsApp'
      })
    } finally {
      setWhatsAppLoading(false)
    }
  }

  async function saveWhatsAppConfig() {
    try {
      setWhatsAppMessage(null)

      if (!whatsAppForm.phoneNumberId || !whatsAppForm.accessToken) {
        setWhatsAppMessage({ type: 'error', text: 'Phone Number ID e Access Token são obrigatórios' })
        return
      }

      const method = whatsAppConfig ? 'PUT' : 'POST'
      const response = await fetch('/api/tenant/whatsapp-config', {
        method,
        ...withTenantHeaders({
          headers: { 'Content-Type': 'application/json' }
        }),
        body: JSON.stringify({
          phoneNumberId: whatsAppForm.phoneNumberId,
          accessToken: whatsAppForm.accessToken,
          displayName: whatsAppForm.displayName,
          appSecret: whatsAppForm.appSecret
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erro ao salvar config WhatsApp')
      }

      setWhatsAppMessage({ type: 'success', text: 'Configuração salva com sucesso' })
      await loadWhatsAppConfig()
    } catch (err) {
      setWhatsAppMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao salvar config WhatsApp'
      })
    }
  }

  async function toggleWhatsAppConfig() {
    if (!whatsAppConfig) return
    try {
      setWhatsAppMessage(null)
      const response = await fetch('/api/tenant/whatsapp-config', {
        method: 'PUT',
        ...withTenantHeaders({
          headers: { 'Content-Type': 'application/json' }
        }),
        body: JSON.stringify({ isActive: !whatsAppConfig.isActive })
      })

      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erro ao atualizar status')
      }

      await loadWhatsAppConfig()
    } catch (err) {
      setWhatsAppMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao atualizar status'
      })
    }
  }

  async function deleteWhatsAppConfig() {
    if (!whatsAppConfig) return
    const confirmed = window.confirm('Deseja remover esta configuração de WhatsApp?')
    if (!confirmed) return

    try {
      setWhatsAppMessage(null)
      const response = await fetch('/api/tenant/whatsapp-config', {
        method: 'DELETE',
        ...withTenantHeaders()
      })

      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erro ao remover config')
      }

      setWhatsAppConfig(null)
      setWhatsAppForm({ phoneNumberId: '', accessToken: '', displayName: '', appSecret: '' })
      setWhatsAppMessage({ type: 'success', text: 'Configuração removida' })
    } catch (err) {
      setWhatsAppMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao remover config'
      })
    }
  }

  if (authLoading || loading) {
    return <div className="p-6">Carregando...</div>
  }

  if (!user && !business) {
    return null
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações da Empresa</h1>
        <p className="text-gray-600 mt-2">{tenant?.name || 'default'}</p>
      </div>

      {saveMessage && <Alert type={saveMessage.type} message={saveMessage.text} />}

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {(['branding', 'hours', 'capacity', 'cards', 'contact', 'whatsapp', 'notifications'] as TabType[]).map(
          (tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {getTabLabel(tab)}
            </button>
          )
        )}
      </div>

      {/* Conteúdo das Tabs */}
      {activeTab === 'branding' && (
        <BrandingSection data={brandingData} onChange={setBrandingData} onSave={handleSave} saving={isSaving} />
      )}

      {activeTab === 'hours' && (
        <HoursSection data={hoursData} onChange={setHoursData} onSave={handleSave} saving={isSaving} />
      )}

      {activeTab === 'capacity' && (
        <CapacitySection data={capacityData} onChange={setCapacityData} onSave={handleSave} saving={isSaving} />
      )}

      {activeTab === 'cards' && (
        <CardsSection data={cardsData} onChange={setCardsData} onSave={handleSave} saving={isSaving} />
      )}

      {activeTab === 'contact' && (
        <ContactSection data={contactData} onChange={setContactData} onSave={handleSave} saving={isSaving} />
      )}

      {activeTab === 'whatsapp' && (
        <WhatsAppSection
          config={whatsAppConfig}
          form={whatsAppForm}
          loading={whatsAppLoading}
          message={whatsAppMessage}
          onChange={setWhatsAppForm}
          onSave={saveWhatsAppConfig}
          onToggle={toggleWhatsAppConfig}
          onDelete={deleteWhatsAppConfig}
        />
      )}

      {activeTab === 'notifications' && (
        <div className="p-6 bg-blue-50 rounded-lg">
          <p>Configurações de notificações em breve...</p>
        </div>
      )}
    </div>
  )
}

function getTabLabel(tab: TabType): string {
  const labels: Record<TabType, string> = {
    branding: 'Branding',
    hours: 'Horários',
    capacity: 'Capacidade',
    cards: 'Cards',
    contact: 'Contato',
    whatsapp: 'WhatsApp',
    notifications: 'Notificações'
  }
  return labels[tab]
}

// Componentes de seção
function BrandingSection({
  data,
  onChange,
  onSave,
  saving
}: {
  data: UpdateBrandingDto
  onChange: (data: UpdateBrandingDto) => void
  onSave: (section: TabType, data: any) => void
  saving: boolean
}) {
  return (
    <Card>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nome da Empresa</label>
          <Input
            value={data.displayName || ''}
            onChange={(e) => onChange({ ...data, displayName: e.target.value })}
            placeholder="Nome que aparecerá no site"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Logo da Empresa</label>
          <div className="space-y-3">
            <Input
              value={data.logoUrl || ''}
              onChange={(e) => onChange({ ...data, logoUrl: e.target.value })}
              placeholder="https://exemplo.com/logo.png"
            />
            <div className="bg-gray-800 p-4 rounded-lg space-y-2">
              <p className="text-xs font-medium text-gray-300">📐 Especificações Técnicas:</p>
              <ul className="text-xs text-gray-400 space-y-1 ml-4">
                <li>• <strong>Formato:</strong> PNG ou SVG (transparente recomendado)</li>
                <li>• <strong>Dimensões:</strong> Mínimo 200x50px, máximo 400x100px</li>
                <li>• <strong>Proporção:</strong> Horizontal (4:1 ou 3:1 ideal)</li>
                <li>• <strong>Tamanho:</strong> Máximo 500KB</li>
                <li>• <strong>Fundo:</strong> Transparente para melhor adaptação</li>
              </ul>
              {data.logoUrl && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <p className="text-xs font-medium text-gray-300 mb-2">Preview:</p>
                  <div className="bg-gray-900 p-3 rounded flex items-center justify-center">
                    <Image
                      src={data.logoUrl}
                      alt="Logo preview"
                      width={400}
                      height={120}
                      className="max-h-12 max-w-full object-contain w-auto h-auto"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Texto do Rodapé</label>
          <Textarea
            value={data.footerText || ''}
            onChange={(e) => onChange({ ...data, footerText: e.target.value })}
            placeholder="Texto opcional do rodapé"
            rows={3}
          />
        </div>

        <Button
          onClick={() => onSave('branding', data)}
          disabled={saving}
          className="w-full"
        >
          {saving ? 'Salvando...' : 'Salvar Branding'}
        </Button>
      </div>
    </Card>
  )
}

function HoursSection({
  data,
  onChange,
  onSave,
  saving
}: {
  data: UpdateHoursDto
  onChange: (data: UpdateHoursDto) => void
  onSave: (section: TabType, data: any) => void
  saving: boolean
}) {
  return (
    <Card>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Timezone</label>
          <Input
            value={data.timezone || 'America/Sao_Paulo'}
            onChange={(e) => onChange({ ...data, timezone: e.target.value })}
            placeholder="America/Sao_Paulo"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Duração do Slot (minutos)</label>
          <Input
            type="number"
            value={data.slotDurationMinutes || 30}
            onChange={(e) => onChange({ ...data, slotDurationMinutes: parseInt(e.target.value) })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Tempo Mínimo de Antecedência (horas)</label>
          <Input
            type="number"
            value={data.minimumAdvanceBookingHours || 0}
            onChange={(e) => onChange({ ...data, minimumAdvanceBookingHours: parseInt(e.target.value) })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Política de Cancelamento (horas)</label>
          <Input
            type="number"
            value={data.cancellationPolicyHours || 24}
            onChange={(e) => onChange({ ...data, cancellationPolicyHours: parseInt(e.target.value) })}
          />
        </div>

        <Button
          onClick={() => onSave('hours', data)}
          disabled={saving}
          className="w-full"
        >
          {saving ? 'Salvando...' : 'Salvar Horários'}
        </Button>
      </div>
    </Card>
  )
}

function CapacitySection({
  data,
  onChange,
  onSave,
  saving
}: {
  data: UpdateCapacityDto
  onChange: (data: UpdateCapacityDto) => void
  onSave: (section: TabType, data: any) => void
  saving: boolean
}) {
  return (
    <Card>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Capacidade por Slot</label>
          <Input
            type="number"
            value={data.capacityPerSlot || 2}
            onChange={(e) => onChange({ ...data, capacityPerSlot: parseInt(e.target.value) })}
          />
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={data.enableOverbooking || false}
              onChange={(e) => onChange({ ...data, enableOverbooking: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm font-medium">Permitir Overbooking</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Máximo de Agendamentos por Dia</label>
          <Input
            type="number"
            value={data.maxBookingsPerDay || ''}
            onChange={(e) => onChange({ ...data, maxBookingsPerDay: e.target.value ? parseInt(e.target.value) : undefined })}
            placeholder="Deixar em branco para ilimitado"
          />
        </div>

        <Button
          onClick={() => onSave('capacity', data)}
          disabled={saving}
          className="w-full"
        >
          {saving ? 'Salvando...' : 'Salvar Capacidade'}
        </Button>
      </div>
    </Card>
  )
}

function CardsSection({
  data,
  onChange,
  onSave,
  saving
}: {
  data: UpdateCardsDto
  onChange: (data: UpdateCardsDto) => void
  onSave: (section: TabType, data: any) => void
  saving: boolean
}) {
  return (
    <Card>
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Cards são atalhos na página inicial. Você pode ativar/desativar, reordenar e editar aqui.
        </p>

        <div className="space-y-3">
          {data.cards.map((card, idx) => (
            <div key={card.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <input
                  type="checkbox"
                  checked={card.isActive !== false}
                  onChange={(e) => {
                    const newCards = [...data.cards]
                    newCards[idx].isActive = e.target.checked
                    onChange({ cards: newCards })
                  }}
                  className="rounded"
                />
                <span className="font-medium">{card.title}</span>
              </div>
              <Input
                value={card.title}
                onChange={(e) => {
                  const newCards = [...data.cards]
                  newCards[idx].title = e.target.value
                  onChange({ cards: newCards })
                }}
                placeholder="Título"
              />
              <Input
                value={card.subtitle}
                onChange={(e) => {
                  const newCards = [...data.cards]
                  newCards[idx].subtitle = e.target.value
                  onChange({ cards: newCards })
                }}
                placeholder="Subtítulo"
              />
            </div>
          ))}
        </div>

        <Button
          onClick={() => onSave('cards', data)}
          disabled={saving}
          className="w-full"
        >
          {saving ? 'Salvando...' : 'Salvar Cards'}
        </Button>
      </div>
    </Card>
  )
}

function ContactSection({
  data,
  onChange,
  onSave,
  saving
}: {
  data: UpdateContactDto
  onChange: (data: UpdateContactDto) => void
  onSave: (section: TabType, data: any) => void
  saving: boolean
}) {
  return (
    <Card>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">WhatsApp</label>
          <Input
            value={data.whatsapp || ''}
            onChange={(e) => onChange({ ...data, whatsapp: e.target.value })}
            placeholder="(11) 99999-9999"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Telefone</label>
          <Input
            value={data.phone || ''}
            onChange={(e) => onChange({ ...data, phone: e.target.value })}
            placeholder="(11) 3333-3333"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Endereço</label>
          <Input
            value={data.address?.street || ''}
            onChange={(e) =>
              onChange({
                ...data,
                address: { ...data.address, street: e.target.value }
              })
            }
            placeholder="Rua"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Input
            value={data.address?.city || ''}
            onChange={(e) =>
              onChange({
                ...data,
                address: { ...data.address, city: e.target.value }
              })
            }
            placeholder="Cidade"
          />
          <Input
            value={data.address?.state || ''}
            onChange={(e) =>
              onChange({
                ...data,
                address: { ...data.address, state: e.target.value }
              })
            }
            placeholder="Estado"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Instagram</label>
          <Input
            value={data.social?.instagram || ''}
            onChange={(e) =>
              onChange({
                ...data,
                social: { ...data.social, instagram: e.target.value }
              })
            }
            placeholder="@seuinstagram"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Facebook</label>
          <Input
            value={data.social?.facebook || ''}
            onChange={(e) =>
              onChange({
                ...data,
                social: { ...data.social, facebook: e.target.value }
              })
            }
            placeholder="Facebook URL"
          />
        </div>

        <Button
          onClick={() => onSave('contact', data)}
          disabled={saving}
          className="w-full"
        >
          {saving ? 'Salvando...' : 'Salvar Contato'}
        </Button>
      </div>
    </Card>
  )
}

function WhatsAppSection({
  config,
  form,
  loading,
  message,
  onChange,
  onSave,
  onToggle,
  onDelete
}: {
  config: any | null
  form: { phoneNumberId: string; accessToken: string; displayName: string; appSecret: string }
  loading: boolean
  message: { type: 'success' | 'error'; text: string } | null
  onChange: (form: { phoneNumberId: string; accessToken: string; displayName: string; appSecret: string }) => void
  onSave: () => void
  onToggle: () => void
  onDelete: () => void
}) {
  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">WhatsApp Cloud API</h2>
            <p className="text-sm text-gray-600">Conecte seu número da Meta para enviar mensagens</p>
          </div>
          {config && (
            <span
              className={`px-3 py-1 rounded text-sm ${
                config.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}
            >
              {config.isActive ? 'Ativo' : 'Inativo'}
            </span>
          )}
        </div>

        {message && <Alert type={message.type} message={message.text} />}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Phone Number ID*</label>
            <Input
              value={form.phoneNumberId}
              onChange={(e) => onChange({ ...form, phoneNumberId: e.target.value })}
              placeholder="123456789012345"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">Meta Business Manager → WhatsApp → Phone Numbers</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Access Token*</label>
            <Input
              type="password"
              value={form.accessToken}
              onChange={(e) => onChange({ ...form, accessToken: e.target.value })}
              placeholder="EAAB..."
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">Meta Business Manager → WhatsApp → Settings → Security</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Nome de Exibição (opcional)</label>
            <Input
              value={form.displayName}
              onChange={(e) => onChange({ ...form, displayName: e.target.value })}
              placeholder="Ex: Estética X"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">App Secret (opcional)</label>
            <Input
              type="password"
              value={form.appSecret}
              onChange={(e) => onChange({ ...form, appSecret: e.target.value })}
              placeholder="Para validar webhooks"
              disabled={loading}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={onSave} disabled={loading}>
            {config ? 'Atualizar' : 'Conectar'}
          </Button>

          {config && (
            <>
              <Button
                onClick={onToggle}
                disabled={loading}
                className="bg-gray-700 hover:bg-gray-800"
              >
                {config.isActive ? 'Desativar' : 'Ativar'}
              </Button>
              <Button
                onClick={onDelete}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700"
              >
                Remover
              </Button>
            </>
          )}
        </div>

        {config && (
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Criado em:</strong> {new Date(config.createdAt).toLocaleString('pt-BR')}</p>
            <p><strong>Atualizado em:</strong> {new Date(config.updatedAt).toLocaleString('pt-BR')}</p>
          </div>
        )}
      </div>
    </Card>
  )
}
