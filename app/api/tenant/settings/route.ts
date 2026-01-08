/**
 * GET /api/tenant/settings
 * Retorna todas as configurações do tenant
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { requireOwner } from '@/lib/auth-multi-tenant'

export const dynamic = 'force-dynamic'
import {
  validateTenantSettings,
  validateBrandingConfig,
  validateHoursConfig,
  validateCapacityConfig,
  validateCardsConfig,
  validateContactConfig,
  validateNotificationConfig
} from '@/lib/tenant-settings'

/**
 * Resolve tenant direto do auth_token sem depender de headers de middleware
 */
async function getTenantFromAuth(request: NextRequest) {
  const authToken = request.cookies.get('auth_token')?.value
  if (!authToken) {
    throw new Error('Não autenticado')
  }

  const payload = verifyToken(authToken)
  if (!payload?.businessId) {
    throw new Error('Token inválido')
  }

  const business = await prisma.business.findUnique({
    where: { id: payload.businessId },
    select: { id: true, name: true, slug: true, email: true }
  })

  if (!business) {
    throw new Error('Business não encontrado')
  }

  return {
    tenantId: business.id,
    tenantSlug: business.slug || 'default',
    business
  }
}

export async function GET(request: NextRequest) {
  try {
    // Tentar pegar slug do header primeiro (rotas públicas como login)
    const headerSlug = request.headers.get('x-tenant-slug')
    
    // Se não houver auth_token mas houver slug, permitir acesso público às settings básicas
    const authToken = request.cookies.get('auth_token')?.value
    
    let tenant
    
    if (!authToken && headerSlug) {
      // Acesso público via slug (para páginas de login)
      const business = await prisma.business.findUnique({
        where: { slug: headerSlug },
        select: { id: true, name: true, slug: true, email: true, isActive: true }
      })
      
      if (!business || !business.isActive) {
        return NextResponse.json(
          { error: 'Tenant não encontrado ou inativo' },
          { status: 404 }
        )
      }
      
      tenant = {
        tenantId: business.id,
        tenantSlug: business.slug || headerSlug,
        business
      }
    } else {
      // Acesso autenticado
      tenant = await getTenantFromAuth(request)
    }

    // Buscar settings do tenant
    let settings = await prisma.tenantSettings.findUnique({
      where: { businessId: tenant.tenantId }
    })

    // Se não existir, criar padrão
    if (!settings) {
      settings = await prisma.tenantSettings.create({
        data: {
          businessId: tenant.tenantId,
          brandingConfig: getDefaultBrandingConfig(tenant.business?.name || ''),
          hoursConfig: getDefaultHoursConfig(),
          capacityConfig: getDefaultCapacityConfig(),
          cardsConfig: getDefaultCardsConfig(),
          contactConfig: {},
          notificationConfig: getDefaultNotificationConfig()
        }
      })
    }

    // Validar e estruturar resposta
    const validated = validateTenantSettings({
      branding: settings.brandingConfig,
      hours: settings.hoursConfig,
      capacity: settings.capacityConfig,
      cards: settings.cardsConfig,
      contact: settings.contactConfig,
      notification: settings.notificationConfig
    })

    return NextResponse.json({
      success: true,
      data: validated,
      tenant: {
        id: tenant.tenantId,
        name: tenant.business?.name,
        slug: tenant.tenantSlug
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar configurações'
    const isAuthError = message === 'Não autenticado' || message === 'Token inválido'
    const status = isAuthError ? 401 : 500
    
    console.error('[TenantSettings GET] Erro:', error)
    return NextResponse.json(
      { error: message },
      { status }
    )
  }
}

/**
 * PUT /api/tenant/settings
 * Atualiza configurações do tenant (apenas OWNER)
 */
export async function PUT(request: NextRequest) {
  try {
    // Resolver tenant direto do auth_token
    const tenant = await getTenantFromAuth(request)
    
    const body = await request.json()

    // Buscar settings atuais
    let settings = await prisma.tenantSettings.findUnique({
      where: { businessId: tenant.tenantId }
    })

    if (!settings) {
      return NextResponse.json(
        { error: 'Settings não encontradas' },
        { status: 404 }
      )
    }

    // Validar e mesclar configs
    const updated = await prisma.tenantSettings.update({
      where: { businessId: tenant.tenantId },
      data: {
        // Atualizar apenas os campos fornecidos
        ...(body.branding && {
          brandingConfig: validateBrandingConfig(body.branding)
        }),
        ...(body.hours && {
          hoursConfig: validateHoursConfig(body.hours)
        }),
        ...(body.capacity && {
          capacityConfig: validateCapacityConfig(body.capacity)
        }),
        ...(body.cards && {
          cardsConfig: validateCardsConfig(body.cards)
        }),
        ...(body.contact && {
          contactConfig: validateContactConfig(body.contact)
        }),
        ...(body.notification && {
          notificationConfig: validateNotificationConfig(body.notification)
        })
      }
    })

    // Validar e estruturar resposta
    const validated = validateTenantSettings({
      branding: updated.brandingConfig,
      hours: updated.hoursConfig,
      capacity: updated.capacityConfig,
      cards: updated.cardsConfig,
      contact: updated.contactConfig,
      notification: updated.notificationConfig
    })

    return NextResponse.json({
      success: true,
      message: 'Configurações atualizadas com sucesso',
      data: validated
    })
  } catch (error) {
    console.error('[TenantSettings PUT] Erro:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar configurações' },
      { status: error instanceof Error && error.message.includes('Não autorizado') ? 403 : 500 }
    )
  }
}

// Funções helper para configs padrão
function getDefaultBrandingConfig(businessName: string) {
  return {
    displayName: businessName,
    logo: null,
    favicon: null,
    theme: 'light',
    footerText: null
  }
}

function getDefaultHoursConfig() {
  return {
    timezone: 'America/Sao_Paulo',
    openingHours: {
      MONDAY: { isOpen: true, opens: '08:00', closes: '18:00' },
      TUESDAY: { isOpen: true, opens: '08:00', closes: '18:00' },
      WEDNESDAY: { isOpen: true, opens: '08:00', closes: '18:00' },
      THURSDAY: { isOpen: true, opens: '08:00', closes: '18:00' },
      FRIDAY: { isOpen: true, opens: '08:00', closes: '18:00' },
      SATURDAY: { isOpen: true, opens: '08:00', closes: '13:00' },
      SUNDAY: { isOpen: false }
    },
    slotDurationMinutes: 30,
    minimumAdvanceBookingHours: 0,
    cancellationPolicyHours: 24,
    breakTimes: [],
    holidays: []
  }
}

function getDefaultCapacityConfig() {
  return {
    capacityPerSlot: 2,
    serviceCapacities: {},
    enableOverbooking: false,
    maxBookingsPerDay: null
  }
}

function getDefaultCardsConfig() {
  return {
    cards: [
      {
        id: 'agenda',
        title: 'Agenda',
        subtitle: 'Visualize seus agendamentos',
        icon: 'calendar',
        link: '/agenda',
        visibleTo: ['OWNER', 'STAFF'],
        isActive: true,
        order: 1
      },
      {
        id: 'clientes',
        title: 'Clientes',
        subtitle: 'Gerenciar clientes',
        icon: 'users',
        link: '/clientes',
        visibleTo: ['OWNER', 'STAFF'],
        isActive: true,
        order: 2
      },
      {
        id: 'servicos',
        title: 'Serviços',
        subtitle: 'Configurar serviços',
        icon: 'settings',
        link: '/servicos',
        visibleTo: ['OWNER', 'STAFF'],
        isActive: true,
        order: 3
      }
    ]
  }
}

function getDefaultNotificationConfig() {
  return {
    enabled: true,
    channel: 'email',
    sendReminders: true,
    reminderHours: [24, 1],
    templates: {},
    lgpdConsent: null
  }
}
