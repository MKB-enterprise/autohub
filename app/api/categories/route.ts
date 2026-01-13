import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser, requireAdmin, validateTenantAccess } from '@/lib/auth'
import { resolveTenantFromRequest } from '@/lib/tenant-resolver'

// GET /api/categories - Listar categorias
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const qpBusinessId = searchParams.get('businessId') || undefined
    const user = await getCurrentUser().catch(() => null)
    let businessId = qpBusinessId || (user?.businessId as string | undefined)
    
    // ⚠️ Validar tenant se user existe
    if (user && businessId) {
      await validateTenantAccess(request, user)
    } else {
      // Ao menos resolver tenant da URL
      const { context } = await resolveTenantFromRequest(request)
      if (context) businessId = context.tenantId
    }
    
    if (!businessId) {
      const biz = await prisma.business.findFirst({ select: { id: true } })
      businessId = biz?.id
    }

    const categories = await prisma.category.findMany({
      where: businessId ? { businessId } : {},
      include: {
        _count: {
          select: { services: true }
        }
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Erro ao buscar categorias:', error)
    return NextResponse.json({ error: 'Erro ao buscar categorias' }, { status: 500 })
  }
}

// POST /api/categories - Criar categoria
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    
    // ⚠️ Validar que token pertence a este tenant
    await validateTenantAccess(request, admin)
    
    const body = await request.json()
    const { name, description } = body

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }

    const existing = await prisma.category.findFirst({ where: { name, businessId: (admin as any).businessId } })
    if (existing) {
      return NextResponse.json({ error: 'Categoria já existe' }, { status: 409 })
    }

    const category = await prisma.category.create({
      data: {
        businessId: (admin as any).businessId,
        name: name.trim(),
        description: description?.trim() || null
      }
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar categoria:', error)
    return NextResponse.json({ error: 'Erro ao criar categoria' }, { status: 500 })
  }
}
