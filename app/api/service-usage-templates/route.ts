/**
 * API: Templates de Consumo por Serviço
 * GET/POST /api/service-usage-templates
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { VehicleType } from '@prisma/client';

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
    const serviceId = searchParams.get('serviceId');
    const vehicleType = searchParams.get('vehicleType');

    const where: any = { businessId };

    if (serviceId) {
      where.serviceId = serviceId;
    }

    if (vehicleType) {
      where.vehicleType = vehicleType as VehicleType;
    }

    const templates = await prisma.serviceProductUsageTemplate.findMany({
      where,
      orderBy: [
        { service: { name: 'asc' } },
        { vehicleType: 'asc' },
      ],
      include: {
        service: {
          select: {
            id: true,
            name: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            isConcentrated: true,
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
      },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Erro ao listar templates:', error);
    return NextResponse.json(
      { error: 'Erro ao listar templates' },
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
    const { serviceId, vehicleType, productId, recipeId, quantityMl, notes } = body;

    if (!serviceId || !vehicleType || !productId || !quantityMl) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: serviceId, vehicleType, productId, quantityMl' },
        { status: 400 }
      );
    }

    // Validar se serviço existe
    const service = await prisma.service.findFirst({
      where: {
        id: serviceId,
        businessId,
      },
    });

    if (!service) {
      return NextResponse.json(
        { error: 'Serviço não encontrado' },
        { status: 404 }
      );
    }

    // Validar se produto existe
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        businessId,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      );
    }

    // Se recipeId fornecido, validar
    if (recipeId) {
      const recipe = await prisma.dilutionRecipe.findFirst({
        where: {
          id: recipeId,
          businessId,
          productId, // Receita deve ser do produto selecionado
        },
      });

      if (!recipe) {
        return NextResponse.json(
          { error: 'Receita não encontrada ou não pertence ao produto selecionado' },
          { status: 404 }
        );
      }
    }

    // Criar template
    const template = await prisma.serviceProductUsageTemplate.create({
      data: {
        businessId,
        serviceId,
        vehicleType: vehicleType as VehicleType,
        productId,
        recipeId: recipeId || null,
        quantityMl: parseInt(quantityMl),
        notes: notes || null,
      },
      include: {
        service: true,
        product: true,
        recipe: true,
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar template:', error);
    
    // Erro de constraint unique
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Já existe um template para este serviço + tipo de veículo + produto + receita' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Erro ao criar template' },
      { status: 500 }
    );
  }
}
