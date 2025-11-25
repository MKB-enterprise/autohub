import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/settings - Buscar configurações
export async function GET() {
  try {
    let settings = await prisma.settings.findFirst()

    // Se não existir, criar com valores padrão
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
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
    const existingSettings = await prisma.settings.findFirst()

    let settings
    if (existingSettings) {
      // Atualizar - só inclui campos que não são null/undefined
      settings = await prisma.settings.update({
        where: { id: existingSettings.id },
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
      settings = await prisma.settings.create({
        data: {
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
