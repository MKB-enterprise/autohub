/**
 * Tipos e interfaces para configurações de tenant (SaaS)
 * Define a estrutura de TenantSettings com validação
 */

export interface BrandingConfig {
  displayName: string
  logoUrl?: string | null
  logo: {
    url: string
    uploadedAt: string
  } | null
  favicon: {
    url: string
    uploadedAt: string
  } | null
  theme: 'light' | 'dark'
  footerText: string | null
}

export interface HoursConfig {
  timezone: string // America/Sao_Paulo
  openingHours: {
    [day in 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY']: {
      isOpen: boolean
      opens?: string // "08:00"
      closes?: string // "18:00"
    }
  }
  slotDurationMinutes: number // 30, 60, etc
  minimumAdvanceBookingHours: number // não permitir agendar com menos de X horas
  cancellationPolicyHours: number // até X horas antes pode cancelar
  breakTimes?: Array<{
    startTime: string // "12:00"
    endTime: string // "13:00"
    days: string[] // MONDAY, TUESDAY, etc
  }>
  holidays?: Array<{
    date: string // "2025-12-25"
    name: string // "Natal"
    isBlocked: boolean
  }>
}

export interface CapacityConfig {
  capacityPerSlot: number // 2 vagas a cada 30min
  serviceCapacities: {
    [serviceId: string]: number // polimento consome 2 vagas
  }
  enableOverbooking: boolean
  maxBookingsPerDay: number | null
}

export interface DashboardCard {
  id: string
  title: string
  subtitle: string
  icon: string // ícone como string (ex: 'calendar', 'users')
  link: string // rota relativa
  visibleTo: ('OWNER' | 'STAFF' | 'CUSTOMER')[]
  isActive: boolean
  order: number
}

export interface CardsConfig {
  cards: DashboardCard[]
}

export interface ContactConfig {
  whatsapp: string | null
  phone: string | null
  address: {
    street: string | null
    city: string | null
    state: string | null
    zipcode: string | null
  }
  location?: {
    latitude: number
    longitude: number
  }
  social: {
    instagram: string | null
    facebook: string | null
    linkedin: string | null
  }
}

export interface NotificationConfig {
  enabled: boolean
  channel: 'email' | 'sms' | 'whatsapp' | 'multi'
  sendReminders: boolean
  reminderHours: number[] // [24, 1] = 24h antes e 1h antes
  templates?: {
    [key: string]: string // template customizado por evento
  }
  lgpdConsent: string | null // mensagem de consentimento LGPD
}

export interface TenantSettingsData {
  branding: BrandingConfig
  hours: HoursConfig
  capacity: CapacityConfig
  cards: CardsConfig
  contact: ContactConfig
  notification: NotificationConfig
}

// Funções de validação

export function validateBrandingConfig(data: any): BrandingConfig {
  return {
    displayName: data.displayName || '',
    logoUrl: data.logoUrl || null,
    logo: data.logo || null,
    favicon: data.favicon || null,
    theme: data.theme === 'dark' ? 'dark' : 'light',
    footerText: data.footerText || null
  }
}

export function validateHoursConfig(data: any): HoursConfig {
  const defaultHours = {
    MONDAY: { isOpen: true, opens: '08:00', closes: '18:00' },
    TUESDAY: { isOpen: true, opens: '08:00', closes: '18:00' },
    WEDNESDAY: { isOpen: true, opens: '08:00', closes: '18:00' },
    THURSDAY: { isOpen: true, opens: '08:00', closes: '18:00' },
    FRIDAY: { isOpen: true, opens: '08:00', closes: '18:00' },
    SATURDAY: { isOpen: true, opens: '08:00', closes: '13:00' },
    SUNDAY: { isOpen: false }
  }

  return {
    timezone: data.timezone || 'America/Sao_Paulo',
    openingHours: {
      ...defaultHours,
      ...data.openingHours
    },
    slotDurationMinutes: data.slotDurationMinutes || 30,
    minimumAdvanceBookingHours: data.minimumAdvanceBookingHours || 0,
    cancellationPolicyHours: data.cancellationPolicyHours || 24,
    breakTimes: data.breakTimes || [],
    holidays: data.holidays || []
  }
}

export function validateCapacityConfig(data: any): CapacityConfig {
  return {
    capacityPerSlot: data.capacityPerSlot || 2,
    serviceCapacities: data.serviceCapacities || {},
    enableOverbooking: data.enableOverbooking === true,
    maxBookingsPerDay: data.maxBookingsPerDay || null
  }
}

export function validateCardsConfig(data: any): CardsConfig {
  return {
    cards: (data.cards || []).map((card: any) => ({
      id: card.id,
      title: card.title,
      subtitle: card.subtitle,
      icon: card.icon,
      link: card.link,
      visibleTo: card.visibleTo || ['OWNER', 'STAFF'],
      isActive: card.isActive !== false,
      order: card.order || 0
    }))
  }
}

export function validateContactConfig(data: any): ContactConfig {
  return {
    whatsapp: data.whatsapp || null,
    phone: data.phone || null,
    address: {
      street: data.address?.street || null,
      city: data.address?.city || null,
      state: data.address?.state || null,
      zipcode: data.address?.zipcode || null
    },
    location: data.location,
    social: {
      instagram: data.social?.instagram || null,
      facebook: data.social?.facebook || null,
      linkedin: data.social?.linkedin || null
    }
  }
}

export function validateNotificationConfig(data: any): NotificationConfig {
  return {
    enabled: data.enabled !== false,
    channel: ['email', 'sms', 'whatsapp', 'multi'].includes(data.channel) ? data.channel : 'email',
    sendReminders: data.sendReminders !== false,
    reminderHours: Array.isArray(data.reminderHours) ? data.reminderHours : [24, 1],
    templates: data.templates || {},
    lgpdConsent: data.lgpdConsent || null
  }
}

// Função para validar e estruturar toda a configuração de tenant
export function validateTenantSettings(data: any): TenantSettingsData {
  return {
    branding: validateBrandingConfig(data.branding || {}),
    hours: validateHoursConfig(data.hours || {}),
    capacity: validateCapacityConfig(data.capacity || {}),
    cards: validateCardsConfig(data.cards || {}),
    contact: validateContactConfig(data.contact || {}),
    notification: validateNotificationConfig(data.notification || {})
  }
}

// DTOs para requisições de API
export interface UpdateBrandingDto {
  displayName?: string
  logoUrl?: string
  colors?: {
    primary?: string
    secondary?: string
    background?: string
    text?: string
  }
  theme?: 'light' | 'dark'
  cta?: string
  footerText?: string
}

export interface UpdateHoursDto {
  timezone?: string
  openingHours?: {
    [key: string]: { isOpen: boolean; opens?: string; closes?: string }
  }
  slotDurationMinutes?: number
  minimumAdvanceBookingHours?: number
  cancellationPolicyHours?: number
}

export interface UpdateCapacityDto {
  capacityPerSlot?: number
  serviceCapacities?: { [serviceId: string]: number }
  enableOverbooking?: boolean
  maxBookingsPerDay?: number | null
}

export interface UpdateCardsDto {
  cards: Array<{
    id: string
    title: string
    subtitle: string
    icon: string
    link: string
    visibleTo?: string[]
    isActive?: boolean
    order?: number
  }>
}

export interface UpdateContactDto {
  whatsapp?: string
  phone?: string
  address?: {
    street?: string
    city?: string
    state?: string
    zipcode?: string
  }
  location?: { latitude: number; longitude: number }
  social?: {
    instagram?: string
    facebook?: string
    linkedin?: string
  }
}
