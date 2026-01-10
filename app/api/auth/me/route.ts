import { NextResponse } from 'next/server'
import { getCurrentUser, generateToken } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/auth/me - Retornar usuário atual
export async function GET() {
  try {
    const user = await getCurrentUser()
    
    console.log('[AUTH ME] getCurrentUser returned:', user ? { customerId: user.customerId ? '***' : null, businessId: user.businessId ? '***' : null, isAdmin: user.isAdmin } : null)
    
    if (!user) {
      console.log('[AUTH ME] No user, returning null for both')
      return NextResponse.json({ user: null, business: null })
    }

    console.log('[AUTH ME] Token payload:', user)

    // Preferir customerId sobre businessId - cliente tem prioridade
    if (user.customerId && !user.businessId) {
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
      console.log('[AUTH ME] Returning customer:', customer)
      return NextResponse.json({ user: customer, business: null })
    }

    // Se tem businessId (e não tem customerId), retornar business
    if (user.businessId && !user.customerId) {
      const business = await prisma.business.findUnique({
        where: { id: user.businessId },
        select: {
          id: true,
          name: true,
          email: true
        }
      })
      console.log('[AUTH ME] Returning business:', business)
      return NextResponse.json({ business, user: null })
    }

    // Caso ambíguo: ter ambos não deve acontecer, mas se acontecer, prefira cliente e LIMPAR token errado
    if (user.customerId && user.businessId) {
      console.warn('[AUTH ME] WARNING: Token has both customerId and businessId! Treating as customer.')
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
      // Gerar token limpo somente de cliente para remover businessId do cookie e quebrar loops de redirect
      const cleanToken = customer
        ? generateToken({ customerId: customer.id, email: customer.email!, isAdmin: customer.isAdmin })
        : null

      const response = NextResponse.json({ user: customer, business: null })

      if (cleanToken) {
        response.cookies.set({
          name: 'auth_token',
          value: cleanToken,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7,
          path: '/'
        })
        console.log('[AUTH ME] Reissued clean customer token (removed businessId)')
      }

      return response
    }

    return NextResponse.json({ user: null, business: null })
  } catch (error) {
    console.error('[AUTH ME] Erro:', error)
    return NextResponse.json({ user: null, business: null })  
  }
}