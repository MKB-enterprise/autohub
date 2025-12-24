import { NextResponse } from 'next/server'

// POST /api/auth/logout - Logout
export async function POST() {
  const response = NextResponse.json({ success: true })
  
  response.cookies.set('auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0
  })

  return response
}
