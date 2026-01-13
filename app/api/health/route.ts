import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * Health Check Endpoint
 * 
 * Verifica:
 * - Aplicação está respondendo
 * - Database está conectado
 * - Tempo de resposta do DB
 * 
 * Útil para:
 * - Load balancers
 * - Monitoring (Uptime Robot, etc)
 * - Kubernetes liveness/readiness probes
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Verificar conexão com database
    await prisma.$queryRaw`SELECT 1`
    
    const dbResponseTime = Date.now() - startTime
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: 'connected',
        responseTimeMs: dbResponseTime
      },
      environment: process.env.NODE_ENV || 'development'
    }, { status: 200 })
    
  } catch (error) {
    console.error('[HEALTH] Database check failed:', error)
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: {
        status: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      environment: process.env.NODE_ENV || 'development'
    }, { status: 503 })
  }
}

// Endpoint simples para readiness (aplicação pronta)
export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}
