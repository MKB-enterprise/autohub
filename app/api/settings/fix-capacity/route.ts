import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// GET /api/settings/fix-capacity - Corrigir maxCarsPerSlot (admin only)
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    // Atualizar BusinessSettings
    const result = await prisma.businessSettings.updateMany({
      where: {
        maxCarsPerSlot: {
          lt: 2
        }
      },
      data: {
        maxCarsPerSlot: 3
      }
    })

    // Verificar resultado
    const allSettings = await prisma.businessSettings.findMany({
      select: {
        id: true,
        businessId: true,
        maxCarsPerSlot: true,
        openingTimeWeekday: true,
        closingTimeWeekday: true
      }
    })

    return NextResponse.json({
      success: true,
      updated: result.count,
      currentSettings: allSettings
    })
  } catch (error) {
    console.error('Erro ao corrigir capacidade:', error)
    return NextResponse.json(
      { error: 'Erro ao corrigir configurações' },
      { status: 500 }
    )
  }
}
