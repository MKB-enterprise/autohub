/**
 * Autenticação e Autorização para sistema multi-tenant
 * Estende o auth.ts com suporte a roles e tenant context
 */

import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'
import { prisma } from './db'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-this'

export interface AuthTokenPayload {
  userId?: string
  customerId?: string
  businessId: string
  tenantId: string
  email: string
  role: 'OWNER' | 'STAFF' | 'CUSTOMER'
  fullName?: string
}

/**
 * Gera token JWT com informações de tenant
 */
export function generateAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

/**
 * Verifica token JWT
 */
export function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthTokenPayload
  } catch (error) {
    return null
  }
}

/**
 * Extrai token do header Authorization ou do request
 */
export function extractTokenFromRequest(request: NextRequest): string | null {
  // Tentar extrair do header Authorization
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }

  // Tentar extrair de cookies
  const cookies = request.cookies.get('auth_token')?.value
  return cookies || null
}

/**
 * Autentica requisição contra tenant específico
 * Garante que token pertence ao tenant da requisição
 */
export async function authenticateRequest(
  request: NextRequest,
  requiredRole?: 'OWNER' | 'STAFF' | 'CUSTOMER'
): Promise<AuthTokenPayload> {
  const token = extractTokenFromRequest(request)
  if (!token) {
    throw new Error('Token não fornecido')
  }

  const payload = verifyAuthToken(token)
  if (!payload) {
    throw new Error('Token inválido ou expirado')
  }

  // Validar contra o tenant da requisição
  const tenantId = request.headers.get('x-tenant-id')
  if (tenantId && payload.tenantId !== tenantId && payload.businessId !== tenantId) {
    throw new Error('Token não corresponde ao tenant da requisição')
  }

  // Validar role se necessário
  if (requiredRole && payload.role !== requiredRole) {
    throw new Error(`Role ${requiredRole} requerida`)
  }

  return payload
}

/**
 * Autoriza apenas OWNER
 */
export async function requireOwner(request: NextRequest): Promise<AuthTokenPayload> {
  const payload = await authenticateRequest(request, 'OWNER')
  if (payload.role !== 'OWNER') {
    throw new Error('Acesso negado: somente OWNER')
  }
  return payload
}

/**
 * Autoriza OWNER ou STAFF
 */
export async function requireStaffOrOwner(request: NextRequest): Promise<AuthTokenPayload> {
  const payload = await authenticateRequest(request)
  if (payload.role === 'CUSTOMER') {
    throw new Error('Acesso negado: staff ou owner requerido')
  }
  return payload
}

/**
 * Busca usuário por ID e valida tenant
 */
export async function getUserByIdAndTenant(
  userId: string,
  tenantId: string
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      business: {
        select: {
          id: true,
          name: true,
          slug: true,
          email: true,
          isActive: true
        }
      }
    }
  })

  if (!user) {
    throw new Error('Usuário não encontrado')
  }

  // Validar tenant
  if (user.businessId !== tenantId) {
    throw new Error('Usuário não pertence a este tenant')
  }

  // Validar se negócio está ativo
  if (!user.business.isActive) {
    throw new Error('Negócio inativo')
  }

  return user
}

/**
 * Busca usuário por email e tenant
 */
export async function getUserByEmailAndTenant(
  email: string,
  tenantId: string
) {
  const user = await prisma.user.findFirst({
    where: {
      email,
      businessId: tenantId,
      isActive: true
    },
    include: {
      business: {
        select: {
          id: true,
          name: true,
          slug: true,
          email: true,
          isActive: true
        }
      }
    }
  })

  return user
}

/**
 * Login de usuário interno (OWNER/STAFF)
 */
export async function loginUser(
  email: string,
  password: string,
  tenantId: string
) {
  const user = await getUserByEmailAndTenant(email, tenantId)

  if (!user) {
    throw new Error('Email ou senha incorretos')
  }

  // Verificar senha (importar bcrypt conforme necessário)
  const bcrypt = require('bcryptjs')
  const isValidPassword = await bcrypt.compare(password, user.password)

  if (!isValidPassword) {
    throw new Error('Email ou senha incorretos')
  }

  // Gerar token
  const token = generateAuthToken({
    userId: user.id,
    businessId: user.businessId,
    tenantId: user.businessId,
    email: user.email,
    role: user.role as any,
    fullName: user.fullName
  })

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      businessId: user.businessId
    }
  }
}

/**
 * Criar novo usuário (interno)
 */
export async function createUser(
  email: string,
  password: string,
  fullName: string,
  tenantId: string,
  role: 'OWNER' | 'STAFF' = 'STAFF',
  phone?: string
) {
  const bcrypt = require('bcryptjs')

  // Validar se email já existe neste tenant
  const existing = await prisma.user.findFirst({
    where: {
      email,
      businessId: tenantId
    }
  })

  if (existing) {
    throw new Error('Email já cadastrado neste tenant')
  }

  // Hash da senha
  const hashedPassword = await bcrypt.hash(password, 10)

  // Criar usuário
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      fullName,
      phone,
      role,
      businessId: tenantId,
      isActive: true
    }
  })

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    businessId: user.businessId
  }
}
