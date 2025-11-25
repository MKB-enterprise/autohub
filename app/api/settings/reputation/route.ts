import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/settings/reputation - Buscar configurações de reputação (público)
export async function GET() {
  try {
    const settings = await prisma.settings.findFirst()

    // Retorna apenas as configurações de reputação
    return NextResponse.json({
      enabled: settings?.reputationEnabled ?? true,
      noShowPenalty: Number(settings?.reputationNoShowPenalty) || 2.5,
      minForAdvance: Number(settings?.reputationMinForAdvance) || 3.0,
      advancePercent: settings?.reputationAdvancePercent ?? 50,
      recoveryOnShow: settings?.reputationRecoveryOnShow ?? true
    })
  } catch (error) {
    console.error('Erro ao buscar configurações de reputação:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar configurações' },
      { status: 500 }
    )
  }
}
