/**
 * API: Receitas de Diluição
 * GET/POST /api/dilution-recipes
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  createDilutionRecipe,
  listDilutionRecipes,
} from '@/lib/services/dilution-service';

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
    const productId = searchParams.get('productId');
    const isActive = searchParams.get('isActive');

    const filters: any = {};
    
    if (productId) {
      filters.productId = productId;
    }
    
    if (isActive !== null) {
      filters.isActive = isActive === 'true';
    }

    const recipes = await listDilutionRecipes(businessId, filters);

    return NextResponse.json({ recipes });
  } catch (error) {
    console.error('Erro ao listar receitas:', error);
    return NextResponse.json(
      { error: 'Erro ao listar receitas' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const businessId = req.headers.get('x-business-id');
    
    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID não fornecido' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { productId, name, ratioProduct, ratioWater, targetBottleMl } = body;

    if (!productId || !name || !ratioProduct || ratioWater === undefined) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: productId, name, ratioProduct, ratioWater' },
        { status: 400 }
      );
    }

    const recipe = await createDilutionRecipe(businessId, productId, {
      name,
      ratioProduct: parseInt(ratioProduct),
      ratioWater: parseInt(ratioWater),
      targetBottleMl: targetBottleMl ? parseInt(targetBottleMl) : 1000,
    });

    return NextResponse.json({ recipe }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar receita:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao criar receita' },
      { status: 500 }
    );
  }
}
