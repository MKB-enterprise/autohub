/**
 * API: Produtos com suporte a diluição
 * GET/POST /api/products-dilution
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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
    const categoryId = searchParams.get('categoryId');
    const isConcentrated = searchParams.get('isConcentrated');
    const isActive = searchParams.get('isActive');

    const where: any = { businessId };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (isConcentrated !== null) {
      where.isConcentrated = isConcentrated === 'true';
    }

    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            dilutionRecipes: true,
            usageTemplates: true,
          },
        },
      },
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Erro ao listar produtos:', error);
    return NextResponse.json(
      { error: 'Erro ao listar produtos' },
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
    const {
      categoryId,
      name,
      brand,
      sku,
      isConcentrated,
      baseUnit,
      packageSizeMl,
      costTotal,
      stockMinMl,
    } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Nome do produto é obrigatório' },
        { status: 400 }
      );
    }

    // Validações para produtos concentrados
    if (isConcentrated) {
      if (!packageSizeMl || packageSizeMl <= 0) {
        return NextResponse.json(
          { error: 'Tamanho da embalagem é obrigatório para produtos concentrados' },
          { status: 400 }
        );
      }
    }

    // Verificar duplicidade
    const existing = await prisma.product.findFirst({
      where: {
        businessId,
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Já existe um produto com este nome' },
        { status: 409 }
      );
    }

    const product = await prisma.product.create({
      data: {
        businessId,
        categoryId: categoryId || null,
        name: name.trim(),
        brand: brand?.trim() || null,
        sku: sku?.trim() || null,
        isConcentrated: isConcentrated || false,
        baseUnit: baseUnit || 'ml',
        packageSizeMl: packageSizeMl || 0,
        costTotal: costTotal || 0,
        stockMinMl: stockMinMl || 0,
        // Campos legados (manter compatibilidade)
        unit: baseUnit || 'ml',
        cost: costTotal || 0,
        currentStock: 0,
        minStock: 0,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    return NextResponse.json(
      { error: 'Erro ao criar produto' },
      { status: 500 }
    );
  }
}
