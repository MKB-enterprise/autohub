import { NextRequest, NextResponse } from 'next/server'

// POST /api/auth/logout - Logout
export async function POST(request: NextRequest) {
  // Pegar redirect URL dos query params
  const { searchParams } = new URL(request.url)
  const redirectUrl = searchParams.get('redirect') || '/login'

  const response = NextResponse.redirect(new URL(redirectUrl, request.url))
  
  // Limpar token de autenticação
  response.cookies.set('auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/'
  })

  // Limpar tenant_slug (pode estar vindo de business/login anterior)
  response.cookies.set('tenant_slug', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/'
  })

  return response
}

// GET /api/auth/logout - Logout com redirect
export async function GET(request: NextRequest) {
  return POST(request)
}
