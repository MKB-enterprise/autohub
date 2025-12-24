import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// GET /api/settings/business - Obter configurações do negócio
export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin()
    const businessId = user.businessId

    const settings = await prisma.businessSettings.findUnique({
      where: { businessId }
    })

    if (!settings) {
      return NextResponse.json({ error: 'Configurações não encontradas' }, { status: 404 })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Erro ao buscar configurações:', error)
    return NextResponse.json({ error: 'Erro ao buscar configurações' }, { status: 500 })
  }
}

// PATCH /api/settings/business - Atualizar configurações
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAdmin()
    const businessId = user.businessId
    const body = await request.json()

    const settings = await prisma.businessSettings.update({
      where: { businessId },
      data: {
        openingTimeWeekday: body.openingTimeWeekday,
        closingTimeWeekday: body.closingTimeWeekday,
        slotIntervalMinutes: body.slotIntervalMinutes,
        maxCarsPerSlot: body.maxCarsPerSlot,
        timezone: body.timezone,
        reputationEnabled: body.reputationEnabled,
        reputationAdvancePercent: body.reputationAdvancePercent,
        reputationMinForAdvance: body.reputationMinForAdvance,
        reputationNoShowPenalty: body.reputationNoShowPenalty,
        reputationRecoveryOnShow: body.reputationRecoveryOnShow,
        notificationsEnabled: body.notificationsEnabled,
        notificationChannel: body.notificationChannel,
        notifyOn24hBefore: body.notifyOn24hBefore,
        notifyOn1hBefore: body.notifyOn1hBefore,
        packagesEnabled: body.packagesEnabled
      }
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error)
    return NextResponse.json({ error: 'Erro ao atualizar configurações' }, { status: 500 })
  }
}
