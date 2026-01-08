/**
 * Endpoint de manutenção para fixar businesses sem slug
 * DELETE /api/maintenance/fix-slug quando não mais necessário
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const isDev = process.env.NODE_ENV !== 'production'
    const maintenanceToken = process.env.MAINTENANCE_TOKEN
    const incomingToken = request.headers.get('x-maintenance-token')

    if (!isDev) {
      if (!maintenanceToken || incomingToken !== maintenanceToken) {
        console.warn('[fix-slug] Tentativa sem token válido')
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    console.log('🔧 Iniciando fix-slug...')

    // Buscar businesses sem slug
    const businessesWithoutSlug = await prisma.business.findMany({
      where: {
        slug: null
      }
    })

    if (businessesWithoutSlug.length === 0) {
      return NextResponse.json({
        message: '✅ Todos os businesses já possuem slug',
        fixed: 0
      })
    }

    const fixed = []

    for (const business of businessesWithoutSlug) {
      // Gerar slug a partir do nome
      const slug =
        business.name
          ?.toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '') || `business-${Date.now()}`

      console.log(`  Atualizando "${business.name}" → slug: "${slug}"`)

      const updated = await prisma.business.update({
        where: { id: business.id },
        data: { slug },
        select: {
          id: true,
          name: true,
          slug: true
        }
      })

      fixed.push(updated)
    }

    return NextResponse.json({
      message: `✅ ${fixed.length} business(es) foram atualizados com slug`,
      fixed,
      next: 'Teste novamente: curl http://localhost:3000/api/debug/tenant'
    })
  } catch (error: any) {
    console.error('❌ Erro:', error)
    return NextResponse.json(
      {
        error: error.message
      },
      { status: 500 }
    )
  }
}
