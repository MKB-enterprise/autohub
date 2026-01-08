/**
 * API: Preparar Batch de Diluição
 * POST /api/dilution-batches
 */

import { NextRequest, NextResponse } from 'next/server';
import { createDilutionBatch, listDilutionBatches } from '@/lib/services/dilution-service';

export async function GET(req: NextRequest) {
  try {
    const businessId = req.headers.get('x-business-id');
    
    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID não fornecido' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const recipeId = searchParams.get('recipeId');
    const productId = searchParams.get('productId');
    const limit = searchParams.get('limit');

    const filters: any = {};
    
    if (recipeId) filters.recipeId = recipeId;
    if (productId) filters.productId = productId;
    if (limit) filters.limit = parseInt(limit);

    const batches = await listDilutionBatches(businessId, filters);

    return NextResponse.json({ batches });
  } catch (error) {
    console.error('Erro ao listar batches:', error);
    return NextResponse.json(
      { error: 'Erro ao listar batches' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const businessId = req.headers.get('x-business-id');
    const userId = req.headers.get('x-user-id'); // Opcional
    
    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID não fornecido' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { recipeId, targetBottleMl, numberOfBottles, notes } = body;

    if (!recipeId) {
      return NextResponse.json(
        { error: 'recipeId é obrigatório' },
        { status: 400 }
      );
    }

    const batch = await createDilutionBatch(
      businessId,
      {
        recipeId,
        targetBottleMl: targetBottleMl ? parseInt(targetBottleMl) : undefined,
        numberOfBottles: numberOfBottles ? parseInt(numberOfBottles) : 1,
        notes,
      },
      userId || undefined
    );

    return NextResponse.json({ 
      success: true,
      batch,
      message: `Preparado ${batch.preparedTotalMl}ml de solução com sucesso`
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar batch:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao criar batch' 
      },
      { status: 500 }
    );
  }
}
