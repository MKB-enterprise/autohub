/**
 * API: Templates de Consumo por Serviço + Tipo de Veículo
 * GET/POST /api/service-product-templates
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const businessId = req.headers.get('x-business-id')
    if (!businessId) {
      return NextResponse.json({ error: 'Business ID não fornecido' }, { status: 400 })
    }

    const templates = await prisma.serviceProductUsageTemplate.findMany({
      where: { businessId },
      include: {
        service: { select: { id: true, name: true } },
        recipe: { 
          select: { 
            id: true, 
            name: true, 
            ratioProduct: true,
            ratioWater: true,
            product: { select: { id: true, name: true } }
          } 
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ templates })
  } catch (error: any) {
    console.error('Erro ao listar templates:', error)
    return NextResponse.json({ error: error?.message || 'Erro ao listar templates' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const businessId = req.headers.get('x-business-id')
    if (!businessId) {
      return NextResponse.json({ error: 'Business ID não fornecido' }, { status: 400 })
    }

    const body = await req.json()
    const { serviceId, vehicleType, recipeId, quantityMl } = body

    if (!serviceId || !vehicleType || !recipeId || !quantityMl) {
      return NextResponse.json(
        { error: 'Serviço, tipo de veículo, receita e quantidade são obrigatórios' },
        { status: 400 }
      )
    }

    // Validar que a receita pertence ao mesmo negócio e pegar o productId
    const recipe = await prisma.dilutionRecipe.findUnique({
      where: { id: recipeId },
      select: { businessId: true, productId: true }
    })

    if (!recipe || recipe.businessId !== businessId) {
      return NextResponse.json({ error: 'Receita não encontrada' }, { status: 404 })
    }

    const template = await prisma.serviceProductUsageTemplate.create({
      data: {
        businessId,
        serviceId,
        vehicleType,
        productId: recipe.productId,
        recipeId,
        quantityMl: Number(quantityMl),
      },
      include: {
        service: { select: { id: true, name: true } },
        recipe: { 
          select: { 
            id: true, 
            name: true, 
            ratioProduct: true,
            ratioWater: true,
            product: { select: { id: true, name: true } }
          } 
        },
      },
    })

    return NextResponse.json({ template }, { status: 201 })
  } catch (error: any) {
    console.error('Erro ao criar template:', error)
    return NextResponse.json({ error: error?.message || 'Erro ao criar template' }, { status: 500 })
  }
}
