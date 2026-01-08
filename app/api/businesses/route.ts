import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { verifyToken } from '@/lib/auth'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    const payload = token ? verifyToken(token) : null
    
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Buscar todas as empresas (apenas admin pode acessar)
    const businesses = await prisma.business.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        phone: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        monthlyPrice: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(businesses)
  } catch (error) {
    console.error('Erro ao buscar empresas:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar empresas' },
      { status: 500 }
    )
  }
}
