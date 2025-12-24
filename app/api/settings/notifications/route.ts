import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { NotificationTemplateType } from '@prisma/client'

// GET /api/settings/notifications - Listar templates de notificação
export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin()
    const businessId = user.businessId
    if (!businessId) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 400 })
    }

    const templates = await prisma.notificationTemplate.findMany({
      where: { businessId },
      orderBy: { type: 'asc' }
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Erro ao buscar templates de notificação:', error)
    return NextResponse.json({ error: 'Erro ao buscar templates' }, { status: 500 })
  }
}

// PUT /api/settings/notifications - Atualizar template
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAdmin()
    const businessId = user.businessId
    if (!businessId) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 400 })
    }
    const { type, title, body, isActive } = await request.json()

    if (!type || !title || !body) {
      return NextResponse.json(
        { error: 'Tipo, título e corpo são obrigatórios' },
        { status: 400 }
      )
    }

    const template = await prisma.notificationTemplate.upsert({
      where: {
        businessId_type: {
          businessId,
          type: type as NotificationTemplateType
        }
      },
      create: {
        businessId,
        type: type as NotificationTemplateType,
        title,
        body,
        isActive
      },
      update: {
        title,
        body,
        isActive
      }
    })

    return NextResponse.json(template)
  } catch (error) {
    console.error('Erro ao atualizar template:', error)
    return NextResponse.json({ error: 'Erro ao atualizar template' }, { status: 500 })
  }
}
