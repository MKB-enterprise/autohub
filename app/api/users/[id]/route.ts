import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// GET /api/users/[id] - Buscar usuário específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAdmin()
    const businessId = (auth as any).businessId
    const userId = params.id

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        businessId: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Verificar se o usuário pertence à mesma empresa
    if (user.businessId !== businessId) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Erro ao buscar usuário:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar usuário' },
      { status: 500 }
    )
  }
}

// PUT /api/users/[id] - Atualizar usuário
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAdmin()
    const businessId = (auth as any).businessId
    const userId = params.id

    const { fullName, phone, isActive } = await request.json()

    // Verificar se usuário existe e pertence à empresa
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    if (existingUser.businessId !== businessId) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(fullName && { fullName }),
        ...(phone !== undefined && { phone }),
        ...(isActive !== undefined && { isActive })
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
        updatedAt: true
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar usuário' },
      { status: 500 }
    )
  }
}

// DELETE /api/users/[id] - Deletar usuário (desativar)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAdmin()
    const businessId = (auth as any).businessId
    const userId = params.id

    // Verificar se usuário existe e pertence à empresa
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    if (existingUser.businessId !== businessId) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Ao invés de deletar, desativar
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isActive: false }
    })

    return NextResponse.json({ success: true, user: updatedUser })
  } catch (error) {
    console.error('Erro ao deletar usuário:', error)
    return NextResponse.json(
      { error: 'Erro ao deletar usuário' },
      { status: 500 }
    )
  }
}
