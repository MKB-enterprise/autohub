import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

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
    return jwt.verify(token, JWT_SECRET) as TokenPayload
  } catch (error) {
    return null
  }
}

export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('auth_token')?.value || null
}

export async function getCurrentUser(): Promise<TokenPayload | null> {
  const token = await getAuthToken()
  if (!token) return null
  return verifyToken(token)
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
