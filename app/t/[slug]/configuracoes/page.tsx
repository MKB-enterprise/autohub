/**
 * Tela de Configurações da Empresa (Admin/Owner Dashboard)
 * Permite editar: branding, horários, capacidade, cards, contato, notificações
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import { useTenant } from '@/lib/TenantContext'
import { withTenantHeaders } from '@/lib/tenant-client'
import { useRequireBusinessAuth } from '@/lib/hooks/useRequireBusinessAuth'
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
import { EmployeesSection } from '@/components/EmployeesSection'

type TabType = 'branding' | 'hours' | 'capacity' | 'cards' | 'contact' | 'notifications' | 'employees'

export default function TenantSettingsPage() {
  useRequireBusinessAuth()
  const router = useRouter()
  const { user, business, loading: authLoading } = useAuth()
  const { tenant, settings, loading, error: tenantError, refreshSettings } = useTenant()
  const [activeTab, setActiveTab] = useState<TabType>('branding')
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Estados para cada seção
  const [brandingData, setBrandingData] = useState<UpdateBrandingDto>({})
  const [hoursData, setHoursData] = useState<UpdateHoursDto>({})
  const [capacityData, setCapacityData] = useState<UpdateCapacityDto>({})
  const [cardsData, setCardsData] = useState<UpdateCardsDto>({ cards: [] })
  const [contactData, setContactData] = useState<UpdateContactDto>({})
  const [fullLoading, setFullLoading] = useState(false)

  // Inicializar dados quando settings carregar; se faltarem seções, buscar settings completos
  useEffect(() => {
    async function initFromSettings() {
      if (!tenant?.slug) return
      // Se alguma seção estiver ausente, buscar settings completos
      const needsFull = !settings?.hours || !settings?.capacity || !settings?.cards || !settings?.contact
      if (needsFull) {
        try {
          setFullLoading(true)
          const resp = await fetch('/api/tenant/settings', withTenantHeaders({}))
          if (resp.ok) {
            const full = await resp.json()
            setBrandingData({
              displayName: full.branding.displayName,
              theme: full.branding.theme,
              footerText: full.branding.footerText || undefined
            })
            setHoursData({
              timezone: full.hours.timezone,
              openingHours: full.hours.openingHours,
              slotDurationMinutes: full.hours.slotDurationMinutes,
              minimumAdvanceBookingHours: full.hours.minimumAdvanceBookingHours,
              cancellationPolicyHours: full.hours.cancellationPolicyHours
            })
            setCapacityData({
              capacityPerSlot: full.capacity.capacityPerSlot,
              enableOverbooking: full.capacity.enableOverbooking,
              maxBookingsPerDay: full.capacity.maxBookingsPerDay || undefined
            })
            setCardsData({
              cards: full.cards.cards
            })
            setContactData({
              whatsapp: full.contact.whatsapp || undefined,
              phone: full.contact.phone || undefined,
              address: full.contact.address
                ? {
                    street: full.contact.address.street || undefined,
                    city: full.contact.address.city || undefined,
                    state: full.contact.address.state || undefined,
                    zipcode: full.contact.address.zipcode || undefined
                  }
                : undefined,
              social: full.contact.social
                ? {
                    instagram: full.contact.social.instagram || undefined,
                    facebook: full.contact.social.facebook || undefined,
                    linkedin: full.contact.social.linkedin || undefined
                  }
                : undefined
            })
          }
        } finally {
          setFullLoading(false)
        }
        return
      }

      // Caso settings já tenha tudo, inicializar diretamente
      if (settings) {
        setBrandingData({
          displayName: settings.branding.displayName,
          theme: settings.branding.theme,
          footerText: settings.branding.footerText || undefined
        })
        setHoursData({
          timezone: settings.hours!.timezone,
          openingHours: settings.hours!.openingHours,
          slotDurationMinutes: settings.hours!.slotDurationMinutes,
          minimumAdvanceBookingHours: settings.hours!.minimumAdvanceBookingHours,
          cancellationPolicyHours: settings.hours!.cancellationPolicyHours
        })
        setCapacityData({
          capacityPerSlot: settings.capacity!.capacityPerSlot,
          enableOverbooking: settings.capacity!.enableOverbooking,
          maxBookingsPerDay: settings.capacity!.maxBookingsPerDay || undefined
        })
        setCardsData({
          cards: settings.cards!.cards
        })
        setContactData({
          whatsapp: settings.contact!.whatsapp || undefined,
          phone: settings.contact!.phone || undefined,
          address: settings.contact!.address
            ? {
                street: settings.contact!.address.street || undefined,
                city: settings.contact!.address.city || undefined,
                state: settings.contact!.address.state || undefined,
                zipcode: settings.contact!.address.zipcode || undefined
              }
            : undefined,
          social: settings.contact!.social
            ? {
                instagram: settings.contact!.social.instagram || undefined,
                facebook: settings.contact!.social.facebook || undefined,
                linkedin: settings.contact!.social.linkedin || undefined
              }
            : undefined
        })
      }
    }

    initFromSettings()
  }, [tenant?.slug, settings])

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

      // Recarregar dados locais buscando settings completos
      try {
        setFullLoading(true)
        const resp = await fetch('/api/tenant/settings', withTenantHeaders({}))
        if (resp.ok) {
          const full = await resp.json()
          // Atualizar dados conforme seção salva para refletir valores mais recentes
          if (section === 'branding') {
            setBrandingData({
              displayName: full.branding.displayName,
              theme: full.branding.theme,
              footerText: full.branding.footerText || undefined
            })
          } else if (section === 'hours') {
            setHoursData({
              timezone: full.hours.timezone,
              openingHours: full.hours.openingHours,
              slotDurationMinutes: full.hours.slotDurationMinutes,
              minimumAdvanceBookingHours: full.hours.minimumAdvanceBookingHours,
              cancellationPolicyHours: full.hours.cancellationPolicyHours
            })
          } else if (section === 'capacity') {
            setCapacityData({
              capacityPerSlot: full.capacity.capacityPerSlot,
              enableOverbooking: full.capacity.enableOverbooking,
              maxBookingsPerDay: full.capacity.maxBookingsPerDay || undefined
            })
          } else if (section === 'cards') {
            setCardsData({ cards: full.cards.cards })
          } else if (section === 'contact') {
            setContactData({
              whatsapp: full.contact.whatsapp || undefined,
              phone: full.contact.phone || undefined,
              address: full.contact.address
                ? {
                    street: full.contact.address.street || undefined,
                    city: full.contact.address.city || undefined,
                    state: full.contact.address.state || undefined,
                    zipcode: full.contact.address.zipcode || undefined
                  }
                : undefined,
              social: full.contact.social
                ? {
                    instagram: full.contact.social.instagram || undefined,
                    facebook: full.contact.social.facebook || undefined,
                    linkedin: full.contact.social.linkedin || undefined
                  }
                : undefined
            })
          }
        }
      } finally {
        setFullLoading(false)
      }
    } catch (err) {
      setSaveMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao salvar'
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (authLoading || loading || fullLoading) {
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
      <div className="flex gap-2 border-b overflow-x-auto">
        {(['branding', 'hours', 'capacity', 'cards', 'contact', 'employees', 'notifications'] as TabType[]).map(
          (tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${
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

      {activeTab === 'employees' && (
        <EmployeesSection onSave={() => window.location.reload()} />
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
    employees: 'Funcionários',
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
                    <img src={data.logoUrl} alt="Logo preview" className="max-h-12 max-w-full object-contain" onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }} />
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
