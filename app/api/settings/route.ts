import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin, validateTenantAccess } from '@/lib/auth'
import { resolveTenantFromRequest } from '@/lib/tenant-resolver'

// GET /api/settings - Buscar configurações
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    await validateTenantAccess(request, admin)
    const { context } = await resolveTenantFromRequest(request)
    if (!context) {
      return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 400 })
    }
    const businessId: string = context.tenantId

    let settings = await prisma.businessSettings.findUnique({
      where: { businessId }
    })

    // Se não existir, criar com valores padrão
    if (!settings) {
      settings = await prisma.businessSettings.create({
        data: {
          businessId,
          openingTimeWeekday: '08:00',
          closingTimeWeekday: '18:00',
          slotIntervalMinutes: 15,
          maxCarsPerSlot: 2,
          timezone: 'America/Sao_Paulo',
          // Configurações de reputação
          reputationEnabled: true,
          reputationNoShowPenalty: 2.5,
          reputationMinForAdvance: 3.0,
          reputationAdvancePercent: 50,
          reputationRecoveryOnShow: true
        }
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Erro ao buscar configurações:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar configurações' },
      { status: 500 }
    )
  }
}

// PATCH /api/settings - Atualizar configurações
export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    await validateTenantAccess(request, admin)
    const { context } = await resolveTenantFromRequest(request)
    if (!context) {
      return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 400 })
    }
    const businessId: string = context.tenantId

    const body = await request.json()
    const { 
      openingTimeWeekday, 
      closingTimeWeekday, 
      slotIntervalMinutes, 
      maxCarsPerSlot, 
      timezone,
      // Campos de reputação
      reputationEnabled,
      reputationNoShowPenalty,
      reputationMinForAdvance,
      reputationAdvancePercent,
      reputationRecoveryOnShow
    } = body

    // Validações
    if (slotIntervalMinutes !== undefined && slotIntervalMinutes <= 0) {
      return NextResponse.json(
        { error: 'Intervalo de slots deve ser maior que zero' },
        { status: 400 }
      )
    }

    if (maxCarsPerSlot !== undefined && maxCarsPerSlot <= 0) {
      return NextResponse.json(
        { error: 'Capacidade deve ser maior que zero' },
        { status: 400 }
      )
    }

    if (reputationAdvancePercent !== undefined && (reputationAdvancePercent < 0 || reputationAdvancePercent > 100)) {
      return NextResponse.json(
        { error: 'Porcentagem de antecipado deve estar entre 0 e 100' },
        { status: 400 }
      )
    }

    // Buscar configuração existente
    const existingSettings = await prisma.businessSettings.findUnique({
      where: { businessId }
    })

    let settings
    if (existingSettings) {
      // Atualizar - só inclui campos que não são null/undefined
      settings = await prisma.businessSettings.update({
        where: { businessId },
        data: {
          ...(openingTimeWeekday && { openingTimeWeekday }),
          ...(closingTimeWeekday && { closingTimeWeekday }),
          ...(slotIntervalMinutes && { slotIntervalMinutes }),
          ...(maxCarsPerSlot && { maxCarsPerSlot }),
          ...(timezone && { timezone }),
          // Campos de reputação - só atualiza se valor não for null
          ...(reputationEnabled !== undefined && reputationEnabled !== null && { reputationEnabled }),
          ...(reputationNoShowPenalty != null && { reputationNoShowPenalty }),
          ...(reputationMinForAdvance != null && { reputationMinForAdvance }),
          ...(reputationAdvancePercent != null && { reputationAdvancePercent }),
          ...(reputationRecoveryOnShow !== undefined && reputationRecoveryOnShow !== null && { reputationRecoveryOnShow })
        }
      })
    } else {
      // Criar
      settings = await prisma.businessSettings.create({
        data: {
          businessId,
          openingTimeWeekday: openingTimeWeekday || '08:00',
          closingTimeWeekday: closingTimeWeekday || '18:00',
          slotIntervalMinutes: slotIntervalMinutes || 15,
          maxCarsPerSlot: maxCarsPerSlot || 2,
          timezone: timezone || 'America/Sao_Paulo',
          reputationEnabled: reputationEnabled ?? true,
          reputationNoShowPenalty: reputationNoShowPenalty ?? 2.5,
          reputationMinForAdvance: reputationMinForAdvance ?? 3.0,
          reputationAdvancePercent: reputationAdvancePercent ?? 50,
          reputationRecoveryOnShow: reputationRecoveryOnShow ?? true
        }
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar configurações' },
      { status: 500 }
    )
  }
}
