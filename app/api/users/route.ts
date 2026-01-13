import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin, getCurrentUser, validateTenantAccess } from '@/lib/auth'

// GET /api/users - Listar usuários (funcionários) da empresa
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    await validateTenantAccess(request, auth)
    const businessId = auth.businessId

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const isActive = searchParams.get('isActive')

    const where: any = { businessId }

    if (role) {
      where.role = role
    }

    if (isActive !== null) {
      where.isActive = isActive === 'true'
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        fullName: 'asc'
      }
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Erro ao buscar usuários:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar usuários' },
      { status: 500 }
    )
  }
}

// POST /api/users - Criar novo funcionário
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    await validateTenantAccess(request, auth)
    const businessId = (auth as any).businessId

    const { email, password, fullName, phone, role = 'STAFF' } = await request.json()

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Email, senha e nome são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se email já existe na empresa
    const existingUser = await prisma.user.findFirst({
      where: {
        businessId,
        email
      }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email já cadastrado' },
        { status: 400 }
      )
    }

    // Hash da senha (TODO: implementar hashing real)
    const hashedPassword = password

    const user = await prisma.user.create({
      data: {
        businessId,
        email,
        password: hashedPassword,
        fullName,
        phone,
        role
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar usuário:', error)
    return NextResponse.json(
      { error: 'Erro ao criar usuário' },
      { status: 500 }
    )
  }
}
