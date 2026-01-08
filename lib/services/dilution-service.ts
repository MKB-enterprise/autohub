/**
 * Serviço de Gerenciamento de Diluição
 * Criação de receitas e preparação de batches (lotes) de produtos diluídos
 */

import { prisma } from '@/lib/db';
import type {
  CreateDilutionBatchInput,
  DilutionBatch,
} from '@/lib/types/dilution';
import { calculateDilution } from './dilution-calculator';
import { createInventoryMovement, getProductStockMl } from './stock-service';

/**
 * Cria um novo batch de diluição
 * Registra o preparo e baixa o estoque de concentrado
 */
export async function createDilutionBatch(
  businessId: string,
  input: CreateDilutionBatchInput,
  createdByUserId?: string
): Promise<DilutionBatch> {
  // 1. Buscar a receita
  const recipe = await prisma.dilutionRecipe.findUnique({
    where: { id: input.recipeId },
    include: {
      product: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!recipe) {
    throw new Error('Receita de diluição não encontrada');
  }

  if (!recipe.isActive) {
    throw new Error('Receita de diluição está inativa');
  }

  // 2. Calcular quantidades
  const targetBottleMl = input.targetBottleMl || recipe.targetBottleMl;
  const numberOfBottles = input.numberOfBottles || 1;
  const totalSolutionMl = targetBottleMl * numberOfBottles;

  const calculation = calculateDilution(
    recipe.ratioProduct,
    recipe.ratioWater,
    totalSolutionMl
  );

  // 3. Validar estoque disponível
  const availableStock = await getProductStockMl(recipe.productId);
  
  if (availableStock < calculation.concentrateMl) {
    throw new Error(
      `Estoque insuficiente de ${recipe.product.name}. ` +
      `Necessário: ${calculation.concentrateMl}ml, Disponível: ${availableStock}ml`
    );
  }

  // 4. Criar o batch
  const batch = await prisma.dilutionBatch.create({
    data: {
      businessId,
      recipeId: recipe.id,
      preparedTotalMl: calculation.totalSolutionMl,
      usedConcentrateMl: calculation.concentrateMl,
      usedWaterMl: calculation.waterMl,
      notes: input.notes,
      createdByUserId,
    },
  });

  // 5. Baixar o estoque de concentrado
  await createInventoryMovement(
    businessId,
    {
      productId: recipe.productId,
      movementType: 'DILUTION',
      quantity: calculation.concentrateMl,
      referenceType: 'DILUTION_BATCH',
      referenceId: batch.id,
      note: `Preparo de ${calculation.totalSolutionMl}ml de solução ${recipe.name}`,
    },
    createdByUserId
  );

  return batch as DilutionBatch;
}

/**
 * Lista batches de diluição com filtros
 */
export async function listDilutionBatches(
  businessId: string,
  filters?: {
    recipeId?: string;
    productId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }
) {
  const where: any = { businessId };

  if (filters?.recipeId) {
    where.recipeId = filters.recipeId;
  }

  if (filters?.productId) {
    where.recipe = {
      productId: filters.productId,
    };
  }

  if (filters?.startDate || filters?.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      where.createdAt.gte = filters.startDate;
    }
    if (filters.endDate) {
      where.createdAt.lte = filters.endDate;
    }
  }

  return prisma.dilutionBatch.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: filters?.limit || 50,
    include: {
      recipe: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      createdByUser: {
        select: {
          id: true,
          fullName: true,
        },
      },
    },
  });
}

/**
 * Cria uma nova receita de diluição
 */
export async function createDilutionRecipe(
  businessId: string,
  productId: string,
  data: {
    name: string;
    ratioProduct: number;
    ratioWater: number;
    targetBottleMl?: number;
  }
) {
  // Validações
  if (data.ratioProduct <= 0) {
    throw new Error('Proporção do produto deve ser maior que zero');
  }

  if (data.ratioWater < 0) {
    throw new Error('Proporção de água não pode ser negativa');
  }

  // Verificar se produto existe e é concentrado
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new Error('Produto não encontrado');
  }

  if (!product.isConcentrated) {
    throw new Error('Produto não é concentrado - não pode ter receita de diluição');
  }

  // Criar receita
  return prisma.dilutionRecipe.create({
    data: {
      businessId,
      productId,
      name: data.name,
      ratioProduct: data.ratioProduct,
      ratioWater: data.ratioWater,
      targetBottleMl: data.targetBottleMl || 1000,
      isActive: true,
    },
  });
}

/**
 * Atualiza uma receita de diluição
 */
export async function updateDilutionRecipe(
  recipeId: string,
  data: {
    name?: string;
    ratioProduct?: number;
    ratioWater?: number;
    targetBottleMl?: number;
    isActive?: boolean;
  }
) {
  // Validações
  if (data.ratioProduct !== undefined && data.ratioProduct <= 0) {
    throw new Error('Proporção do produto deve ser maior que zero');
  }

  if (data.ratioWater !== undefined && data.ratioWater < 0) {
    throw new Error('Proporção de água não pode ser negativa');
  }

  return prisma.dilutionRecipe.update({
    where: { id: recipeId },
    data,
  });
}

/**
 * Lista receitas de diluição
 */
export async function listDilutionRecipes(
  businessId: string,
  filters?: {
    productId?: string;
    isActive?: boolean;
  }
) {
  const where: any = { businessId };

  if (filters?.productId) {
    where.productId = filters.productId;
  }

  if (filters?.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  return prisma.dilutionRecipe.findMany({
    where,
    orderBy: [
      { product: { name: 'asc' } },
      { name: 'asc' },
    ],
    include: {
      product: {
        select: {
          id: true,
          name: true,
          brand: true,
          packageSizeMl: true,
        },
      },
      _count: {
        select: {
          batches: true,
          usageTemplates: true,
        },
      },
    },
  });
}

/**
 * Deleta uma receita de diluição
 * Apenas se não tiver sido usada
 */
export async function deleteDilutionRecipe(recipeId: string) {
  // Verificar se tem batches ou templates usando esta receita
  const recipe = await prisma.dilutionRecipe.findUnique({
    where: { id: recipeId },
    include: {
      _count: {
        select: {
          batches: true,
          usageTemplates: true,
          executionUsages: true,
        },
      },
    },
  });

  if (!recipe) {
    throw new Error('Receita não encontrada');
  }

  const totalUsages = 
    recipe._count.batches + 
    recipe._count.usageTemplates + 
    recipe._count.executionUsages;

  if (totalUsages > 0) {
    throw new Error(
      'Não é possível deletar receita que já foi utilizada. ' +
      'Desative-a ao invés disso.'
    );
  }

  return prisma.dilutionRecipe.delete({
    where: { id: recipeId },
  });
}

/**
 * Calcula estatísticas de uso de uma receita
 */
export async function getRecipeUsageStats(recipeId: string) {
  const [batches, executions] = await Promise.all([
    prisma.dilutionBatch.aggregate({
      where: { recipeId },
      _sum: {
        preparedTotalMl: true,
        usedConcentrateMl: true,
      },
      _count: true,
    }),
    prisma.serviceExecutionProductUsage.aggregate({
      where: { recipeId },
      _sum: {
        quantityMl: true,
      },
      _count: true,
    }),
  ]);

  return {
    totalBatches: batches._count,
    totalPreparedMl: batches._sum.preparedTotalMl ?? 0,
    totalConcentrateUsedMl: batches._sum.usedConcentrateMl ?? 0,
    totalExecutions: executions._count,
    totalUsedInServicesMl: executions._sum.quantityMl || 0,
  };
}
