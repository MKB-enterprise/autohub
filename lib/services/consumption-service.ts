/**
 * Serviço de Consumo Automático de Produtos
 * Processa a baixa de estoque quando serviços são concluídos
 */

import { prisma } from '@/lib/db';
import type { VehicleType } from '@prisma/client';
import type {
  ProcessServiceCompletionInput,
  ServiceExecutionUsageInput,
  StockValidationResult,
} from '@/lib/types/dilution';
import { calculateConcentrateUsed } from './dilution-calculator';
import { createInventoryMovement, validateStockAvailability } from './stock-service';

/**
 * Processa o consumo de produtos ao concluir um agendamento
 * Esta é a função PRINCIPAL chamada quando Appointment.status vira COMPLETED
 */
export async function processServiceCompletion(
  businessId: string,
  appointmentId: string,
  createdByUserId?: string
): Promise<{
  success: boolean;
  usagesCreated: number;
  movementsCreated: number;
  error?: string;
}> {
  try {
    // 1. Buscar o appointment com serviços e carro
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        appointmentServices: {
          include: {
            service: true,
          },
        },
        car: true,
      },
    });

    if (!appointment) {
      throw new Error('Agendamento não encontrado');
    }

    if (appointment.status !== 'COMPLETED') {
      throw new Error('Agendamento ainda não foi concluído');
    }

    // Verificar se já foi processado
    if (appointment.inventoryWrittenOff) {
      throw new Error('Consumo de produtos já foi registrado para este agendamento');
    }

    const vehicleType = appointment.car.vehicleType;
    const carId = appointment.car.id;

    let totalUsages = 0;
    let totalMovements = 0;

    // 2. Processar cada serviço do agendamento
    for (const appointmentService of appointment.appointmentServices) {
      const result = await processServiceUsage({
        appointmentId,
        serviceId: appointmentService.serviceId,
        vehicleType,
        carId,
      }, businessId, createdByUserId);

      totalUsages += result.usagesCreated;
      totalMovements += result.movementsCreated;
    }

    // 3. Marcar como processado
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { inventoryWrittenOff: true },
    });

    return {
      success: true,
      usagesCreated: totalUsages,
      movementsCreated: totalMovements,
    };

  } catch (error) {
    console.error('Erro ao processar consumo de produtos:', error);
    return {
      success: false,
      usagesCreated: 0,
      movementsCreated: 0,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/**
 * Processa o consumo de produtos para um serviço específico
 */
async function processServiceUsage(
  input: ProcessServiceCompletionInput,
  businessId: string,
  createdByUserId?: string
): Promise<{
  usagesCreated: number;
  movementsCreated: number;
}> {
  const { appointmentId, serviceId, vehicleType, carId, usageOverrides } = input;

  let usagesToProcess: ServiceExecutionUsageInput[];

  if (usageOverrides && usageOverrides.length > 0) {
    // Usar quantidades customizadas (ajuste manual)
    usagesToProcess = usageOverrides;
  } else {
    // Buscar templates padrão
    const templates = await prisma.serviceProductUsageTemplate.findMany({
      where: {
        businessId,
        serviceId,
        vehicleType,
      },
      include: {
        product: true,
        recipe: true,
      },
    });

    if (templates.length === 0) {
      // Nenhum template configurado, não fazer nada
      return { usagesCreated: 0, movementsCreated: 0 };
    }

    usagesToProcess = templates.map(t => ({
      productId: t.productId,
      recipeId: t.recipeId || undefined,
      quantityMl: t.quantityMl,
      source: 'TEMPLATE' as const,
    }));
  }

  // Validar estoque ANTES de processar
  const requirements = await Promise.all(
    usagesToProcess.map(async (usage) => {
      const concentrateMl = usage.recipeId
        ? await calculateConcentrateFromUsage(usage)
        : usage.quantityMl;

      return {
        productId: usage.productId,
        requiredMl: concentrateMl,
      };
    })
  );

  const validation = await validateStockAvailability(requirements);
  
  if (!validation.isValid) {
    const errors = validation.errors.map(e => 
      `${e.productName}: necessário ${e.required}ml, disponível ${e.available}ml`
    ).join('; ');
    
    throw new Error(`Estoque insuficiente: ${errors}`);
  }

  // Processar cada produto
  let usagesCreated = 0;
  let movementsCreated = 0;

  for (const usage of usagesToProcess) {
    // Registrar uso real
    const executionUsage = await prisma.serviceExecutionProductUsage.create({
      data: {
        businessId,
        appointmentId,
        serviceId,
        carId,
        vehicleType,
        productId: usage.productId,
        recipeId: usage.recipeId,
        quantityMl: usage.quantityMl,
        source: usage.source || 'TEMPLATE',
      },
    });
    usagesCreated++;

    // Calcular consumo de concentrado
    let concentrateConsumedMl: number;

    if (usage.recipeId) {
      // Produto diluído - calcular quanto concentrado foi usado
      const recipe = await prisma.dilutionRecipe.findUnique({
        where: { id: usage.recipeId },
      });

      if (!recipe) {
        throw new Error(`Receita ${usage.recipeId} não encontrada`);
      }

      concentrateConsumedMl = calculateConcentrateUsed(
        usage.quantityMl,
        recipe.ratioProduct,
        recipe.ratioWater
      );
    } else {
      // Produto puro - consumo direto
      concentrateConsumedMl = usage.quantityMl;
    }

    // Criar movimentação de saída
    await createInventoryMovement(
      businessId,
      {
        productId: usage.productId,
        movementType: 'SERVICE_OUT',
        quantity: concentrateConsumedMl,
        referenceType: 'SERVICE_EXECUTION',
        referenceId: executionUsage.id,
        appointmentId,
        note: `Consumo automático - Serviço executado`,
      },
      createdByUserId
    );
    movementsCreated++;
  }

  return { usagesCreated, movementsCreated };
}

/**
 * Calcula concentrado consumido a partir de um usage
 */
async function calculateConcentrateFromUsage(
  usage: ServiceExecutionUsageInput
): Promise<number> {
  if (!usage.recipeId) {
    return usage.quantityMl;
  }

  const recipe = await prisma.dilutionRecipe.findUnique({
    where: { id: usage.recipeId },
  });

  if (!recipe) {
    throw new Error(`Receita ${usage.recipeId} não encontrada`);
  }

  return calculateConcentrateUsed(
    usage.quantityMl,
    recipe.ratioProduct,
    recipe.ratioWater
  );
}

/**
 * Estima o consumo de produtos para um serviço SEM processar
 * Útil para preview antes de concluir
 */
export async function estimateServiceConsumption(
  businessId: string,
  serviceId: string,
  vehicleType: VehicleType
): Promise<{
  products: Array<{
    productId: string;
    productName: string;
    solutionUsedMl: number;
    concentrateUsedMl: number;
    currentStock: number;
    hasEnoughStock: boolean;
    recipe?: {
      id: string;
      name: string;
      ratio: string;
    };
  }>;
  totalCost: number;
}> {
  const templates = await prisma.serviceProductUsageTemplate.findMany({
    where: {
      businessId,
      serviceId,
      vehicleType,
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          costTotal: true,
          packageSizeMl: true,
        },
      },
      recipe: true,
    },
  });

  const { getProductStockMl } = await import('./stock-service');

  const products = [];
  let totalCost = 0;

  for (const template of templates) {
    const concentrateUsedMl = template.recipeId && template.recipe
      ? calculateConcentrateUsed(
          template.quantityMl,
          template.recipe.ratioProduct,
          template.recipe.ratioWater
        )
      : template.quantityMl;

    const currentStock = await getProductStockMl(template.productId);
    const costPerMl = template.product.packageSizeMl > 0
      ? template.product.costTotal.toNumber() / template.product.packageSizeMl
      : 0;
    const productCost = concentrateUsedMl * costPerMl;

    products.push({
      productId: template.productId,
      productName: template.product.name,
      solutionUsedMl: template.quantityMl,
      concentrateUsedMl,
      currentStock,
      hasEnoughStock: currentStock >= concentrateUsedMl,
      recipe: template.recipe ? {
        id: template.recipe.id,
        name: template.recipe.name,
        ratio: `${template.recipe.ratioProduct}:${template.recipe.ratioWater}`,
      } : undefined,
    });

    totalCost += productCost;
  }

  return { products, totalCost };
}

/**
 * Reverte o consumo de produtos (em caso de cancelamento pós-conclusão)
 * CUIDADO: Usar apenas em casos excepcionais
 */
export async function revertServiceConsumption(
  businessId: string,
  appointmentId: string,
  createdByUserId?: string
): Promise<{
  success: boolean;
  movementsCreated: number;
}> {
  // Buscar todos os consumos registrados
  const usages = await prisma.serviceExecutionProductUsage.findMany({
    where: { appointmentId },
    include: { recipe: true },
  });

  if (usages.length === 0) {
    return { success: true, movementsCreated: 0 };
  }

  let movementsCreated = 0;

  for (const usage of usages) {
    const concentrateUsedMl = usage.recipeId && usage.recipe
      ? calculateConcentrateUsed(
          usage.quantityMl,
          usage.recipe.ratioProduct,
          usage.recipe.ratioWater
        )
      : usage.quantityMl;

    // Criar movimentação de AJUSTE positivo para devolver ao estoque
    await createInventoryMovement(
      businessId,
      {
        productId: usage.productId,
        movementType: 'ADJUST',
        quantity: concentrateUsedMl, // Positivo para adicionar de volta
        referenceType: 'MANUAL',
        referenceId: appointmentId,
        note: `Reversão de consumo - Agendamento ${appointmentId}`,
      },
      createdByUserId
    );
    movementsCreated++;
  }

  // Desmarcar como processado
  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { inventoryWrittenOff: false },
  });

  return { success: true, movementsCreated };
}
