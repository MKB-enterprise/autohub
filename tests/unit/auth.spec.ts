// tests/unit/auth.spec.ts
// Testes de segurança da autenticação JWT

import { createJWTToken, createCustomerToken, createBusinessToken, verifyJWTToken, createExpiredToken } from '@/tests/helpers/auth'

/**
 * Suite: Autenticação JWT
 *
 * Objetivo: Garantir que tokens são criados e validados corretamente
 * Domínio de risco: Auth (JWT)
 */
describe('Autenticação JWT', () => {
  
  describe('createJWTToken', () => {
    it('Arrange: Dados do cliente válidos | Act: Cria token | Assert: Token contém customerId', () => {
      // Arrange
      const customerId = 'customer-123'
      const email = 'test@example.com'
      
      // Act
      const token = createJWTToken({ customerId, email })
      
      // Assert
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      
      // Validar conteúdo do token
      const payload = verifyJWTToken(token)
      expect(payload.customerId).toBe(customerId)
      expect(payload.email).toBe(email)
    })

    it('Arrange: Dados do negócio válidos | Act: Cria token | Assert: Token contém businessId', () => {
      // Arrange
      const businessId = 'business-456'
      const userId = 'user-789'
      const email = 'admin@business.com'
      
      // Act
      const token = createJWTToken({ businessId, userId, email })
      
      // Assert
      expect(token).toBeDefined()
      const payload = verifyJWTToken(token)
      expect(payload.businessId).toBe(businessId)
      expect(payload.userId).toBe(userId)
    })
  })

  describe('createCustomerToken', () => {
    it('Arrange: ID do cliente | Act: Cria token de cliente | Assert: Token não tem businessId', () => {
      // Arrange
      const customerId = 'cust-001'
      
      // Act
      const token = createCustomerToken(customerId)
      const payload = verifyJWTToken(token)
      
      // Assert
      expect(payload.customerId).toBe(customerId)
      expect(payload.businessId).toBeUndefined()
    })
  })

  describe('createBusinessToken', () => {
    it('Arrange: IDs do negócio e usuário | Act: Cria token de negócio | Assert: Token tem businessId', () => {
      // Arrange
      const businessId = 'biz-001'
      const userId = 'usr-001'
      
      // Act
      const token = createBusinessToken(businessId, userId)
      const payload = verifyJWTToken(token)
      
      // Assert
      expect(payload.businessId).toBe(businessId)
      expect(payload.userId).toBe(userId)
      expect(payload.customerId).toBeUndefined()
    })
  })

  describe('verifyJWTToken', () => {
    it('Arrange: Token válido | Act: Verifica token | Assert: Retorna payload', () => {
      // Arrange
      const customerId = 'customer-123'
      const token = createCustomerToken(customerId)
      
      // Act
      const payload = verifyJWTToken(token)
      
      // Assert
      expect(payload).toBeDefined()
      expect(payload.customerId).toBe(customerId)
    })

    it('Arrange: Token expirado | Act: Verifica token | Assert: Lança erro', () => {
      // Arrange
      const token = createExpiredToken({ email: 'test@example.com' })
      
      // Act & Assert
      expect(() => verifyJWTToken(token)).toThrow('Token inválido')
    })

    it('Arrange: Token malformado | Act: Verifica token | Assert: Lança erro', () => {
      // Arrange
      const token = 'invalid.token.here'
      
      // Act & Assert
      expect(() => verifyJWTToken(token)).toThrow('Token inválido')
    })
  })

  describe('Isolamento multi-tenant', () => {
    it('Arrange: Dois clientes diferentes | Act: Criam tokens | Assert: Tokens são diferentes', () => {
      // Arrange
      const customer1 = createCustomerToken('cust-001', 'customer1@test.com')
      const customer2 = createCustomerToken('cust-002', 'customer2@test.com')
      
      // Act
      const payload1 = verifyJWTToken(customer1)
      const payload2 = verifyJWTToken(customer2)
      
      // Assert
      expect(payload1.customerId).not.toBe(payload2.customerId)
    })

    it('Arrange: Dois negócios diferentes | Act: Criam tokens | Assert: IDs de negócio são isolados', () => {
      // Arrange
      const business1 = createBusinessToken('biz-001', 'usr-001')
      const business2 = createBusinessToken('biz-002', 'usr-002')
      
      // Act
      const payload1 = verifyJWTToken(business1)
      const payload2 = verifyJWTToken(business2)
      
      // Assert
      expect(payload1.businessId).not.toBe(payload2.businessId)
    })
  })
})
