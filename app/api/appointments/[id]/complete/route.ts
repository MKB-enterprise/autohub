/**
 * API: Processar Conclusão de Serviço
 * POST /api/appointments/[id]/complete
 * 
 * Este endpoint deve ser chamado quando um agendamento é marcado como COMPLETED
 * Ele processa automaticamente o consumo de produtos baseado nos templates
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { processServiceCompletion, estimateServiceConsumption } from '@/lib/services/consumption-service';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const businessId = req.headers.get('x-business-id');
    const userId = req.headers.get('x-user-id');
    
    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID não fornecido' },
        { status: 400 }
      );
    }

    const appointmentId = params.id;

    // Verificar se appointment existe e pertence ao business
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        businessId,
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: 'Agendamento não encontrado' },
        { status: 404 }
      );
    }

    // Processar consumo automático
    const result = await processServiceCompletion(
      businessId,
      appointmentId,
      userId || undefined
    );

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false,
          error: result.error 
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Consumo de produtos processado com sucesso',
      usagesCreated: result.usagesCreated,
      movementsCreated: result.movementsCreated,
    });

  } catch (error) {
    console.error('Erro ao processar conclusão:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao processar conclusão' 
      },
      { status: 500 }
    );
  }
}

// GET para estimar consumo sem processar (preview)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const businessId = req.headers.get('x-business-id');
    
    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID não fornecido' },
        { status: 400 }
      );
    }

    const appointmentId = params.id;

    // Buscar appointment com serviços
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        businessId,
      },
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
      return NextResponse.json(
        { error: 'Agendamento não encontrado' },
        { status: 404 }
      );
    }

    // Estimar consumo para cada serviço
    const estimates = [];
    
    for (const appointmentService of appointment.appointmentServices) {
      const estimate = await estimateServiceConsumption(
        businessId,
        appointmentService.serviceId,
        appointment.car.vehicleType
      );

      estimates.push({
        serviceId: appointmentService.serviceId,
        serviceName: appointmentService.service.name,
        ...estimate,
      });
    }

    // Calcular totais
    const totalCost = estimates.reduce((sum, est) => sum + est.totalCost, 0);
    const hasInsufficientStock = estimates.some(est => 
      est.products.some(p => !p.hasEnoughStock)
    );

    return NextResponse.json({
      appointmentId,
      vehicleType: appointment.car.vehicleType,
      estimates,
      totalCost,
      hasInsufficientStock,
      canComplete: !hasInsufficientStock,
    });

  } catch (error) {
    console.error('Erro ao estimar consumo:', error);
    return NextResponse.json(
      { error: 'Erro ao estimar consumo' },
      { status: 500 }
    );
  }
}
