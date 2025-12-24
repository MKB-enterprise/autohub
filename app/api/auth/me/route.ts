import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/auth/me - Retornar usuário atual
export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ user: null })
    }

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

    return NextResponse.json({ user: customer })
  } catch (error) {
    return NextResponse.json({ user: null })
  }
}
