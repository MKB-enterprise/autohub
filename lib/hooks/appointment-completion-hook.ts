/**
 * Hook: Auto-processar consumo de produtos ao concluir appointment
 * 
 * Este hook deve ser integrado na função que atualiza o status do appointment
 * para COMPLETED. Pode ser usado de duas formas:
 * 
 * 1. Middleware automático (chamado ao atualizar status)
 * 2. Função explícita no endpoint de conclusão
 */

import { prisma } from '@/lib/db';
import { processServiceCompletion } from '@/lib/services/consumption-service';

/**
 * Hook principal - chama automaticamente ao concluir appointment
 * 
 * @param appointmentId - ID do agendamento
 * @param businessId - ID do negócio
 * @param userId - ID do usuário que concluiu (opcional)
 * @returns Result com sucesso/erro
 */
export async function onAppointmentCompleted(
  appointmentId: string,
  businessId: string,
  userId?: string
): Promise<{
  success: boolean;
  error?: string;
  usagesCreated?: number;
  movementsCreated?: number;
}> {
  try {
    console.log(`[Hook] Processando conclusão do appointment ${appointmentId}`);

    const result = await processServiceCompletion(
      businessId,
      appointmentId,
      userId
    );

    if (!result.success) {
      console.error(`[Hook] Erro ao processar consumo:`, result.error);
      
      // Não bloquear a conclusão do appointment, apenas logar
      // Em produção, considere enviar notificação/alerta
      return {
        success: false,
        error: result.error,
      };
    }

    console.log(
      `[Hook] Consumo processado com sucesso: ` +
      `${result.usagesCreated} usos, ${result.movementsCreated} movimentações`
    );

    return {
      success: true,
      usagesCreated: result.usagesCreated,
      movementsCreated: result.movementsCreated,
    };

  } catch (error) {
    console.error('[Hook] Erro inesperado:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/**
 * Wrapper para usar no endpoint de atualização de appointment
 * 
 * Exemplo de uso:
 * 
 * ```typescript
 * import { updateAppointmentWithHook } from '@/lib/hooks/appointment-completion-hook';
 * 
 * // No seu endpoint PATCH /api/appointments/[id]
 * const updated = await updateAppointmentWithHook(appointmentId, {
 *   status: 'COMPLETED',
 * }, businessId, userId);
 * ```
 */
export async function updateAppointmentWithHook(
  appointmentId: string,
  data: any,
  businessId: string,
  userId?: string
) {
  // Obter status anterior
  const before = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { status: true, inventoryWrittenOff: true },
  });

  // Atualizar appointment
  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data,
  });

  // Se mudou para COMPLETED e ainda não processou consumo
  if (
    updated.status === 'COMPLETED' &&
    before?.status !== 'COMPLETED' &&
    !before?.inventoryWrittenOff
  ) {
    // Disparar hook de forma assíncrona (não bloquear resposta)
    onAppointmentCompleted(appointmentId, businessId, userId)
      .then(result => {
        if (!result.success) {
          console.error(
            `[Hook] Falha ao processar consumo automático para appointment ${appointmentId}:`,
            result.error
          );
          // TODO: Enviar notificação para admin
        }
      })
      .catch(err => {
        console.error('[Hook] Erro crítico no hook:', err);
      });
  }

  return updated;
}

/**
 * Verifica se um appointment já teve consumo processado
 */
export async function hasInventoryBeenProcessed(
  appointmentId: string
): Promise<boolean> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { inventoryWrittenOff: true },
  });

  return appointment?.inventoryWrittenOff || false;
}

/**
 * Obtém detalhes do consumo de um appointment (se já processado)
 */
export async function getAppointmentConsumptionDetails(
  appointmentId: string
) {
  const usages = await prisma.serviceExecutionProductUsage.findMany({
    where: { appointmentId },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          brand: true,
        },
      },
      recipe: {
        select: {
          id: true,
          name: true,
          ratioProduct: true,
          ratioWater: true,
        },
      },
      service: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  const movements = await prisma.inventoryMovement.findMany({
    where: {
      appointmentId,
      referenceType: 'SERVICE_EXECUTION',
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return {
    usages,
    movements,
    totalUsages: usages.length,
    totalMovements: movements.length,
  };
}
