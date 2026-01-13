/**
 * API: Estoque de Produtos
 * GET /api/stock
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProductStockInfo, getProductsBelowMinimum } from '@/lib/services/stock-service';
import { requireAdmin, validateTenantAccess } from '@/lib/auth';
import { resolveTenantFromRequest } from '@/lib/tenant-resolver';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    await validateTenantAccess(request, admin);
    const { context } = await resolveTenantFromRequest(request);
    if (!context) {
      return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 400 })
    }
    const businessId: string = context.tenantId;

    const { searchParams } = new URL(request.url);
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
