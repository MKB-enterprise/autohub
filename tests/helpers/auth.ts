// tests/helpers/auth.ts
// Helpers para criar tokens JWT fake e validar auth

import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-change-in-production'

export interface JWTPayload {
  customerId?: string
  businessId?: string
  userId?: string
  email: string
  iat?: number
  exp?: number
}

/**
 * Criar token JWT fake para testes
 *
 * Arrange: Gera um token válido para simular usuário autenticado
 *
 * @param payload - Dados do token (customerId, businessId, etc)
 * @param expiresIn - Tempo de expiração (padrão: 24h)
 */
export function createJWTToken(
  payload: JWTPayload,
  expiresIn: string | number = '24h'
): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as jwt.SignOptions)
}

/**
 * Criar token de Customer (cliente)
 *
 * Arrange: Token com customerId apenas (sem businessId)
 */
export function createCustomerToken(
  customerId: string,
  email: string = 'customer@test.com'
): string {
  return createJWTToken({
    customerId,
    email,
  })
}

/**
 * Criar token de Business User (funcionário/admin)
 *
 * Arrange: Token com businessId (usuário do negócio)
 */
export function createBusinessToken(
  businessId: string,
  userId: string,
  email: string = 'user@test.com'
): string {
  return createJWTToken({
    businessId,
    userId,
    email,
  })
}

/**
 * Validar token JWT
 *
 * Act: Verifica se token é válido
 */
export function verifyJWTToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch (error) {
    throw new Error(`Token inválido: ${error instanceof Error ? error.message : 'desconhecido'}`)
  }
}

/**
 * Criar headers autenticados para requisições
 *
 * Arrange: Retorna headers com Authorization Bearer
 */
export function createAuthHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

/**
 * Criar um token expirado
 *
 * Arrange: Para testar comportamento com token inválido
 */
export function createExpiredToken(payload: JWTPayload): string {
  return createJWTToken(payload, '-1h') // Tempo negativo = já expirou
}

export default {
  createJWTToken,
  createCustomerToken,
  createBusinessToken,
  verifyJWTToken,
  createAuthHeaders,
  createExpiredToken,
}
