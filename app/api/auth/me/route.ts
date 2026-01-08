import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/auth/me - Retornar usuário atual
export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ user: null, business: null })
    }

    // Se tem businessId, é login de negócio
    if (user.businessId) {
      const business = await prisma.business.findUnique({
        where: { id: user.businessId },
        select: {
          id: true,
          name: true,
          email: true
        }
      })
      return NextResponse.json({ business, user: null })
    }

    // Se tem customerId, é login de cliente
    if (user.customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: user.customerId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          isAdmin: true
        }
      })
      return NextResponse.json({ user: customer, business: null })
    }

    return NextResponse.json({ user: null, business: null })
  } catch (error) {
    console.error('[AUTH ME] Erro:', error)
    return NextResponse.json({ user: null, business: null })  }
}