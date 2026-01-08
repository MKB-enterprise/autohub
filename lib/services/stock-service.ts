/**
 * Serviço de Gerenciamento de Estoque
 * Funções para consulta e controle de estoque de produtos
 */

import { prisma } from '@/lib/db';
import type {
  ProductStockInfo,
  InventoryMovementType,
  CreateInventoryMovementInput,
  StockValidationResult,
} from '@/lib/types/dilution';

/**
 * Obtém o estoque atual de um produto em ML
 * Considera todas as movimentações (IN, OUT, ADJUST, etc)
 */
export async function getProductStockMl(
  productId: string
): Promise<number> {
  const result = await prisma.inventoryMovement.aggregate({
    where: { productId },
    _sum: {
      quantity: true,
    },
  });

  // A query usa signed quantity:
  // IN = positivo, OUT/DILUTION/SERVICE_OUT = negativo
  return result._sum.quantity?.toNumber() || 0;
}

/**
 * Obtém informações detalhadas de estoque de um produto
 */
export async function getProductStockInfo(
  productId: string
): Promise<ProductStockInfo | null> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      packageSizeMl: true,
      stockMinMl: true,
      isConcentrated: true,
    },
  });

  if (!product) {
    return null;
  }

  const currentStockMl = await getProductStockMl(productId);
  const isBelowMinimum = currentStockMl < product.stockMinMl;
  const packagesInStock = product.packageSizeMl > 0
    ? currentStockMl / product.packageSizeMl
    : 0;

  return {
    productId: product.id,
    productName: product.name,
    currentStockMl,
    minStockMl: product.stockMinMl,
    isBelowMinimum,
    packageSizeMl: product.packageSizeMl,
    packagesInStock: parseFloat(packagesInStock.toFixed(2)),
  };
}

/**
 * Lista produtos com estoque abaixo do mínimo
 */
export async function getProductsBelowMinimum(
  businessId: string
): Promise<ProductStockInfo[]> {
  const products = await prisma.product.findMany({
    where: {
      businessId,
      isActive: true,
      isConcentrated: true,
    },
    select: {
      id: true,
      name: true,
      packageSizeMl: true,
      stockMinMl: true,
    },
  });

  const stockInfos: ProductStockInfo[] = [];

  for (const product of products) {
    const currentStockMl = await getProductStockMl(product.id);
    
    if (currentStockMl < product.stockMinMl) {
      const packagesInStock = product.packageSizeMl > 0
        ? currentStockMl / product.packageSizeMl
        : 0;

      stockInfos.push({
        productId: product.id,
        productName: product.name,
        currentStockMl,
        minStockMl: product.stockMinMl,
        isBelowMinimum: true,
        packageSizeMl: product.packageSizeMl,
        packagesInStock: parseFloat(packagesInStock.toFixed(2)),
      });
    }
  }

  return stockInfos;
}

/**
 * Cria uma movimentação de estoque
 * Nota: quantity deve ser SEMPRE POSITIVA
 * O sinal é determinado pelo movementType
 */
export async function createInventoryMovement(
  businessId: string,
  input: CreateInventoryMovementInput,
  createdByUserId?: string
) {
  // Validar que quantity é positiva
  if (input.quantity <= 0) {
    throw new Error('Quantidade deve ser maior que zero');
  }

  // Converter quantity para signed baseado no tipo
  const signedQuantity = getSignedQuantity(input.movementType, input.quantity);

  const movement = await prisma.inventoryMovement.create({
    data: {
      businessId,
      productId: input.productId,
      movementType: input.movementType,
      quantity: signedQuantity,
      unitCost: input.unitCost,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      note: input.note,
      appointmentId: input.appointmentId,
      budgetId: input.budgetId,
      createdByUserId,
    },
  });

  return movement;
}

/**
 * Converte quantidade para signed baseado no tipo de movimentação
 */
function getSignedQuantity(
  movementType: InventoryMovementType,
  quantity: number
): number {
  switch (movementType) {
    case 'IN':
      return Math.abs(quantity);
    case 'OUT':
    case 'MANUAL_OUT':
    case 'SERVICE_OUT':
    case 'DILUTION':
      return -Math.abs(quantity);
    case 'ADJUST':
      // ADJUST pode ser positivo ou negativo conforme recebido
      return quantity;
    case 'TRANSFER':
      // TRANSFER será tratado com dois movimentos (OUT + IN)
      return quantity;
    default:
      return quantity;
  }
}

/**
 * Registra entrada de estoque (compra)
 */
export async function registerStockIn(
  businessId: string,
  productId: string,
  quantityMl: number,
  unitCost?: number,
  note?: string,
  createdByUserId?: string
) {
  return createInventoryMovement(
    businessId,
    {
      productId,
      movementType: 'IN',
      quantity: quantityMl,
      unitCost,
      referenceType: 'PURCHASE',
      note,
    },
    createdByUserId
  );
}

/**
 * Registra saída manual de estoque
 */
export async function registerStockOut(
  businessId: string,
  productId: string,
  quantityMl: number,
  note?: string,
  createdByUserId?: string
) {
  return createInventoryMovement(
    businessId,
    {
      productId,
      movementType: 'MANUAL_OUT',
      quantity: quantityMl,
      referenceType: 'MANUAL',
      note,
    },
    createdByUserId
  );
}

/**
 * Valida se há estoque suficiente para múltiplos produtos
 */
export async function validateStockAvailability(
  requirements: Array<{ productId: string; requiredMl: number }>
): Promise<StockValidationResult> {
  const errors: StockValidationResult['errors'] = [];

  for (const req of requirements) {
    const product = await prisma.product.findUnique({
      where: { id: req.productId },
      select: { id: true, name: true },
    });

    if (!product) {
      errors.push({
        productId: req.productId,
        productName: 'Produto não encontrado',
        required: req.requiredMl,
        available: 0,
        missing: req.requiredMl,
      });
      continue;
    }

    const available = await getProductStockMl(req.productId);

    if (available < req.requiredMl) {
      errors.push({
        productId: req.productId,
        productName: product.name,
        required: req.requiredMl,
        available,
        missing: req.requiredMl - available,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Obtém o histórico de movimentações de um produto
 */
export async function getProductMovementHistory(
  productId: string,
  limit: number = 50
) {
  return prisma.inventoryMovement.findMany({
    where: { productId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      product: {
        select: {
          name: true,
        },
      },
      createdByUser: {
        select: {
          fullName: true,
        },
      },
    },
  });
}

/**
 * Calcula o custo médio ponderado de um produto
 */
export async function getWeightedAverageCost(
  productId: string
): Promise<number> {
  const inMovements = await prisma.inventoryMovement.findMany({
    where: {
      productId,
      movementType: 'IN',
      unitCost: { not: null },
    },
    select: {
      quantity: true,
      unitCost: true,
    },
  });

  if (inMovements.length === 0) {
    return 0;
  }

  let totalCost = 0;
  let totalQuantity = 0;

  for (const movement of inMovements) {
    const qty = movement.quantity.toNumber();
    const cost = movement.unitCost?.toNumber() || 0;
    totalCost += qty * cost;
    totalQuantity += qty;
  }

  return totalQuantity > 0 ? totalCost / totalQuantity : 0;
}
