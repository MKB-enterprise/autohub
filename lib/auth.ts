import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { appendLog } from './logger'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-this'

export interface TokenPayload {
  customerId?: string
  businessId?: string
  email: string
  isAdmin: boolean
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload
    console.log('[AUTH VERIFY] Token decoded:', {
      customerId: payload.customerId ? '***' : null,
      businessId: payload.businessId ? '***' : null,
      email: payload.email,
      isAdmin: payload.isAdmin
    })
    const msg = `Token verified: customerId=${payload.customerId ? '***' : 'null'}, businessId=${payload.businessId ? '***' : 'null'}, isAdmin=${payload.isAdmin}`
    appendLog(msg)
    return payload
  } catch (error) {
    console.log('[AUTH VERIFY] Token verification failed:', error)
    appendLog(`Token verification failed: ${error}`)
    return null
  }
}

export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('auth_token')?.value || null
}

export async function getCurrentUser(): Promise<TokenPayload | null> {
  try {
    const token = await getAuthToken()
    console.log('[AUTH] getCurrentUser - token exists:', !!token)
    if (!token) {
      console.log('[AUTH] No token in cookies')
      appendLog('No token in cookies')
      return null
    }
    console.log('[AUTH] Token found, verifying...')
      appendLog('Token found in cookies, verifying...')
    const payload = verifyToken(token)
    console.log('[AUTH] getCurrentUser returning:', payload ? { customerId: payload.customerId ? '***' : null, businessId: payload.businessId ? '***' : null } : null)
        if (payload) {
          appendLog(`getCurrentUser returning: customerId=${payload.customerId ? '***' : 'null'}, businessId=${payload.businessId ? '***' : 'null'}`)
        } else {
          appendLog('getCurrentUser returning: null (token invalid)')
        }
    return payload
  } catch (error) {
    console.error('[AUTH] getCurrentUser error:', error)
      appendLog(`getCurrentUser error: ${error}`)
    return null
  }
}

export async function requireAuth(): Promise<TokenPayload> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

export async function requireAdmin(): Promise<TokenPayload> {
  const user = await requireAuth()
  if (!user.isAdmin) {
    throw new Error('Forbidden: Admin access required')
  }
  return user
}
