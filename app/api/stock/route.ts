/**
 * API: Estoque de Produtos
 * GET /api/stock
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProductStockInfo, getProductsBelowMinimum } from '@/lib/services/stock-service';

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
    const belowMinimum = searchParams.get('belowMinimum');

    // Se solicitou produtos abaixo do mínimo
    if (belowMinimum === 'true') {
      const products = await getProductsBelowMinimum(businessId);
      return NextResponse.json({ products, count: products.length });
    }

    // Se solicitou um produto específico
    if (productId) {
      const stockInfo = await getProductStockInfo(productId);
      
      if (!stockInfo) {
        return NextResponse.json(
          { error: 'Produto não encontrado' },
          { status: 404 }
        );
      }

      return NextResponse.json({ stock: stockInfo });
    }

    // Retornar erro se nenhum filtro foi fornecido
    return NextResponse.json(
      { error: 'Forneça productId ou belowMinimum=true' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Erro ao consultar estoque:', error);
    return NextResponse.json(
      { error: 'Erro ao consultar estoque' },
      { status: 500 }
    );
  }
}
