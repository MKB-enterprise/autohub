/**
 * Tipos TypeScript para Sistema de Diluição e Consumo de Produtos
 * Estética Automotiva - AutoHub
 */

import { VehicleType } from '@prisma/client';

// ========== DILUIÇÃO ==========

export interface DilutionRecipe {
  id: string;
  businessId: string;
  productId: string;
  name: string;
  ratioProduct: number;
  ratioWater: number;
  targetBottleMl: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DilutionBatch {
  id: string;
  businessId: string;
  recipeId: string;
  preparedTotalMl: number;
  usedConcentrateMl: number;
  usedWaterMl: number;
  notes?: string;
  createdByUserId?: string;
  createdAt: Date;
}

export interface CreateDilutionBatchInput {
  recipeId: string;
  targetBottleMl?: number; // Se não fornecido, usa o padrão da receita
  numberOfBottles?: number; // Quantos frascos preparar (default: 1)
  notes?: string;
}

export interface DilutionCalculation {
  totalSolutionMl: number;
  concentrateMl: number;
  waterMl: number;
  ratio: string; // ex: "1:10"
  concentratePercentage: number; // ex: 9.09
}

// ========== PRODUTOS E ESTOQUE ==========

export interface ProductCategory {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  businessId: string;
  categoryId?: string;
  name: string;
  brand?: string;
  sku?: string;
  
  // Campos legados
  unit: string;
  cost: number;
  currentStock: number;
  minStock: number;
  
  // Novos campos para diluição
  isConcentrated: boolean;
  baseUnit: 'ml' | 'g' | 'unit';
  packageSizeMl: number;
  costTotal: number;
  stockMinMl: number;
  
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductInput {
  categoryId?: string;
  name: string;
  brand?: string;
  sku?: string;
  isConcentrated?: boolean;
  baseUnit?: 'ml' | 'g' | 'unit';
  packageSizeMl?: number;
  costTotal?: number;
  stockMinMl?: number;
}

export interface ProductStockInfo {
  productId: string;
  productName: string;
  currentStockMl: number;
  minStockMl: number;
  isBelowMinimum: boolean;
  packageSizeMl: number;
  packagesInStock: number; // Quantas embalagens equivale
}

// ========== MOVIMENTAÇÕES DE ESTOQUE ==========

export type InventoryMovementType = 
  | 'IN'
  | 'OUT'
  | 'ADJUST'
  | 'MANUAL_OUT'
  | 'SERVICE_OUT'
  | 'DILUTION'
  | 'TRANSFER';

export type MovementReferenceType = 
  | 'PURCHASE'
  | 'DILUTION_BATCH'
  | 'SERVICE_EXECUTION'
  | 'MANUAL'
  | 'ADJUSTMENT';

export interface InventoryMovement {
  id: string;
  businessId: string;
  productId: string;
  appointmentId?: string;
  budgetId?: string;
  movementType: InventoryMovementType;
  quantity: number;
  unitCost?: number;
  referenceType?: MovementReferenceType;
  referenceId?: string;
  createdByUserId?: string;
  note?: string;
  createdAt: Date;
}

export interface CreateInventoryMovementInput {
  productId: string;
  movementType: InventoryMovementType;
  quantity: number;
  unitCost?: number;
  referenceType?: MovementReferenceType;
  referenceId?: string;
  note?: string;
  appointmentId?: string;
  budgetId?: string;
}

// ========== TEMPLATES DE CONSUMO ==========

export interface ServiceProductUsageTemplate {
  id: string;
  businessId: string;
  serviceId: string;
  vehicleType: VehicleType;
  productId: string;
  recipeId?: string;
  quantityMl: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUsageTemplateInput {
  serviceId: string;
  vehicleType: VehicleType;
  productId: string;
  recipeId?: string;
  quantityMl: number;
  notes?: string;
}

export interface UsageTemplateWithDetails extends ServiceProductUsageTemplate {
  product: {
    id: string;
    name: string;
    isConcentrated: boolean;
  };
  recipe?: {
    id: string;
    name: string;
    ratioProduct: number;
    ratioWater: number;
  };
  service: {
    id: string;
    name: string;
  };
}

// ========== CONSUMO REAL (EXECUÇÃO) ==========

export interface ServiceExecutionProductUsage {
  id: string;
  businessId: string;
  appointmentId: string;
  serviceId: string;
  carId?: string;
  vehicleType: VehicleType;
  productId: string;
  recipeId?: string;
  quantityMl: number;
  source: 'TEMPLATE' | 'MANUAL';
  createdAt: Date;
}

export interface ServiceExecutionUsageInput {
  productId: string;
  recipeId?: string;
  quantityMl: number;
  source?: 'TEMPLATE' | 'MANUAL';
}

export interface ProcessServiceCompletionInput {
  appointmentId: string;
  serviceId: string;
  vehicleType: VehicleType;
  carId?: string;
  usageOverrides?: ServiceExecutionUsageInput[]; // Se fornecido, sobrescreve os templates
}

// ========== CÁLCULOS E ESTIMATIVAS ==========

export interface ServiceCostEstimate {
  serviceId: string;
  serviceName: string;
  vehicleType: VehicleType;
  products: Array<{
    productId: string;
    productName: string;
    quantityMl: number;
    concentrateUsedMl: number;
    costPerMl: number;
    totalCost: number;
    recipe?: {
      name: string;
      ratio: string;
    };
  }>;
  totalProductCost: number;
  servicePrice: number;
  profitMargin: number;
  profitMarginPercentage: number;
}

export interface RemainingServicesEstimate {
  serviceId: string;
  serviceName: string;
  vehicleType: VehicleType;
  limitingProduct: {
    productId: string;
    productName: string;
    currentStockMl: number;
    requiredPerServiceMl: number;
    remainingServices: number;
  };
  allProductsAvailability: Array<{
    productId: string;
    productName: string;
    currentStockMl: number;
    requiredPerServiceMl: number;
    remainingServices: number;
  }>;
}

// ========== HELPERS E UTILITÁRIOS ==========

export interface DilutionFormulaParams {
  ratioProduct: number;
  ratioWater: number;
  targetSolutionMl: number;
}

export interface ConcentrateConsumptionParams {
  solutionUsedMl: number;
  ratioProduct: number;
  ratioWater: number;
}

// ========== RESPOSTAS DE API ==========

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ========== VALIDAÇÕES ==========

export interface ValidationError {
  field: string;
  message: string;
}

export interface StockValidationResult {
  isValid: boolean;
  errors: Array<{
    productId: string;
    productName: string;
    required: number;
    available: number;
    missing: number;
  }>;
}
