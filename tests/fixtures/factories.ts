// tests/fixtures/factories.ts
// Factory functions para criar dados de teste (padrão AAA - Arrange)

import { PrismaClient } from '@prisma/client'
import bcryptjs from 'bcryptjs'

const prisma = new PrismaClient()

/**
 * Factory: Business (negócio/tenant)
 * Arrange: Cria um business com dados válidos
 */
export async function createBusiness(
  overrides?: Partial<Parameters<typeof prisma.business.create>[0]['data']>
) {
  const slug = `test-${Math.random().toString(36).substring(7)}`
  const hashedPassword = await bcryptjs.hash('Test@1234', 10)
  
  return prisma.business.create({
    data: {
      slug,
      name: 'Test Business',
      email: `test-${slug}@example.com`,
      phone: '11999999999',
      password: hashedPassword,
      ...overrides,
    },
  })
}

/**
 * Factory: User (funcionário/admin)
 * Arrange: Cria um usuário com senha hashada
 */
export async function createUser(
  businessId: string,
  overrides?: Partial<Omit<Parameters<typeof prisma.user.create>[0]['data'], 'business'>>
) {
  const hashedPassword = await bcryptjs.hash('Test@1234', 10)
  const email = `user-${Math.random().toString(36).substring(7)}@example.com`
  
  return prisma.user.create({
    data: {
      businessId,
      email,
      fullName: 'Test User',
      password: hashedPassword,
      role: 'STAFF',
      ...(overrides as any),
    },
  })
}

/**
 * Factory: Customer (cliente)
 * Arrange: Cria um cliente com dados válidos
 */
export async function createCustomer(
  businessId: string,
  overrides?: Partial<Omit<Parameters<typeof prisma.customer.create>[0]['data'], 'business'>>
) {
  const hashedPassword = await bcryptjs.hash('Test@1234', 10)
  const phone = `119${Math.floor(10000000 + Math.random() * 90000000)}`
  
  return prisma.customer.create({
    data: {
      businessId,
      email: `customer-${phone}@example.com`,
      name: 'Test Customer',
      phone,
      password: hashedPassword,
      ...(overrides as any),
    },
  })
}

/**
 * Factory: Car (veículo)
 * Arrange: Cria um carro associado ao cliente
 */
export async function createCar(
  businessId: string,
  customerId: string,
  overrides?: Partial<Omit<Parameters<typeof prisma.car.create>[0]['data'], 'business' | 'customer'>>
) {
  const plate = `ABC${Math.floor(1000 + Math.random() * 9000)}`
  
  return prisma.car.create({
    data: {
      businessId,
      customerId,
      plate,
      model: 'Test Car',
      color: 'Black',
      year: 2020,
      vehicleType: 'SEDAN',
      ...(overrides as any),
    },
  })
}

/**
 * Factory: Service (serviço)
 * Arrange: Cria um serviço com dados válidos
 */
export async function createService(
  businessId: string,
  overrides?: Partial<Omit<Parameters<typeof prisma.service.create>[0]['data'], 'business' | 'category'>>
) {
  return prisma.service.create({
    data: {
      businessId,
      name: 'Test Service',
      description: 'Test service description',
      durationMinutes: 60,
      price: 100.00,
      ...(overrides as any),
    },
  })
}

/**
 * Factory: Appointment (agendamento)
 * Arrange: Cria um agendamento
 */
export async function createAppointment(
  businessId: string,
  customerId: string,
  carId: string,
  overrides?: Partial<Omit<Parameters<typeof prisma.appointment.create>[0]['data'], 'business' | 'customer' | 'car'>>
) {
  const startDatetime = new Date(Date.now() + 24 * 60 * 60 * 1000) // tomorrow
  const endDatetime = new Date(startDatetime.getTime() + 60 * 60 * 1000) // +1h
  
  return prisma.appointment.create({
    data: {
      businessId,
      customerId,
      carId,
      startDatetime,
      endDatetime,
      status: 'PENDING',
      totalPrice: 100.00,
      ...(overrides as any),
    },
  })
}

/**
 * Factory: Product (produto)
 * Arrange: Cria um produto
 */
export async function createProduct(
  businessId: string,
  overrides?: Partial<Omit<Parameters<typeof prisma.product.create>[0]['data'], 'business' | 'category'>>
) {
  const sku = `SKU-${Math.random().toString(36).substring(7)}`
  
  return prisma.product.create({
    data: {
      businessId,
      name: 'Test Product',
      brand: 'Test Brand',
      sku,
      unit: 'ml',
      cost: 50.00,
      currentStock: 100,
      minStock: 10,
      isConcentrated: false,
      baseUnit: 'ml',
      packageSizeMl: 1000,
      costTotal: 50.00,
      stockMinMl: 500,
      ...(overrides as any),
    },
  })
}

/**
 * Factory: DilutionRecipe (receita de diluição)
 * Arrange: Cria uma receita de diluição
 */
export async function createDilutionRecipe(
  businessId: string,
  productId: string,
  overrides?: Partial<Omit<Parameters<typeof prisma.dilutionRecipe.create>[0]['data'], 'business' | 'product'>>
) {
  return prisma.dilutionRecipe.create({
    data: {
      businessId,
      productId,
      name: 'Test Dilution 1:10',
      ratioProduct: 1,
      ratioWater: 10,
      targetBottleMl: 1000,
      ...(overrides as any),
    },
  })
}

/**
 * Factory: Budget (orçamento)
 * Arrange: Cria um orçamento
 */
export async function createBudget(
  businessId: string,
  customerId: string,
  overrides?: Partial<Omit<Parameters<typeof prisma.budget.create>[0]['data'], 'business' | 'customer'>>
) {
  return prisma.budget.create({
    data: {
      businessId,
      customerId,
      publicToken: `BDG-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      total: 200.00,
      status: 'DRAFT',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      ...(overrides as any),
    },
  })
}

/**
 * Cleanup: Limpa todos os dados de teste de um business
 * Use em afterEach ou afterAll
 */
export async function cleanupBusiness(businessId: string) {
  // Ordem de deleção é importante devido a foreign keys
  await prisma.appointmentService.deleteMany({ where: { appointment: { businessId } } })
  await prisma.appointment.deleteMany({ where: { businessId } })
  await prisma.car.deleteMany({ where: { businessId } })
  await prisma.customer.deleteMany({ where: { businessId } })
  await prisma.user.deleteMany({ where: { businessId } })
  await prisma.service.deleteMany({ where: { businessId } })
  await prisma.product.deleteMany({ where: { businessId } })
  await prisma.business.delete({ where: { id: businessId } })
}
