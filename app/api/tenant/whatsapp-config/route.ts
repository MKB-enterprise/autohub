/**
 * Tenant API: WhatsApp Config Management (PER-TENANT)
 * Cada negócio gerencia sua própria configuração WhatsApp
 * 
 * GET: Obter config do tenant atual
 * POST: Criar config para o tenant atual
 * PUT: Atualizar config do tenant atual
 * DELETE: Deletar config do tenant atual
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

async function getTenantId(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value

    if (!token) return null

    const decoded = verifyToken(token)
    // tenantId vem do token (businessId)
    return decoded?.businessId || null
  } catch {
    return null
  }
}

// GET: Obter config do tenant atual
export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId()

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const config = await prisma.whatsAppBusinessConfig.findUnique({
      where: { businessId: tenantId },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            email: true,
            slug: true
          }
        }
      }
    })

    return NextResponse.json({ success: true, data: config })
  } catch (error) {
    console.error('[Tenant WhatsApp Config API] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch config' },
      { status: 500 }
    )
  }
}

// POST: Criar config para o tenant atual
export async function POST(request: NextRequest) {
  try {
    const tenantId = await getTenantId()

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { phoneNumberId, accessToken, displayName, appSecret } = body

    // Validate required fields
    if (!phoneNumberId || !accessToken) {
      return NextResponse.json(
        { error: 'Missing required fields: phoneNumberId, accessToken' },
        { status: 400 }
      )
    }

    // Check if config already exists for this tenant
    const existing = await prisma.whatsAppBusinessConfig.findUnique({
      where: { businessId: tenantId }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'WhatsApp config already exists for your business' },
        { status: 409 }
      )
    }

    // Get business name for default display name
    const business = await prisma.business.findUnique({
      where: { id: tenantId },
      select: { name: true }
    })

    // Create config
    const config = await prisma.whatsAppBusinessConfig.create({
      data: {
        businessId: tenantId,
        phoneNumberId,
        accessToken,
        displayName: displayName || business?.name || 'My Business',
        appSecret,
        isActive: true
      },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            email: true,
            slug: true
          }
        }
      }
    })

    return NextResponse.json(
      { success: true, data: config },
      { status: 201 }
    )
  } catch (error) {
    console.error('[Tenant WhatsApp Config API] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create config' },
      { status: 500 }
    )
  }
}

// PUT: Atualizar config do tenant atual
export async function PUT(request: NextRequest) {
  try {
    const tenantId = await getTenantId()

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { phoneNumberId, accessToken, displayName, appSecret, isActive } = body

    // Check if config exists for this tenant
    const existing = await prisma.whatsAppBusinessConfig.findUnique({
      where: { businessId: tenantId }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'WhatsApp config not found' },
        { status: 404 }
      )
    }

    // Update config (only for this tenant)
    const updated = await prisma.whatsAppBusinessConfig.update({
      where: { businessId: tenantId },
      data: {
        ...(phoneNumberId && { phoneNumberId }),
        ...(accessToken && { accessToken }),
        ...(displayName && { displayName }),
        ...(appSecret !== undefined && { appSecret }),
        ...(isActive !== undefined && { isActive })
      },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            email: true,
            slug: true
          }
        }
      }
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('[Tenant WhatsApp Config API] PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update config' },
      { status: 500 }
    )
  }
}

// DELETE: Deletar config do tenant atual
export async function DELETE(request: NextRequest) {
  try {
    const tenantId = await getTenantId()

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if config exists for this tenant
    const existing = await prisma.whatsAppBusinessConfig.findUnique({
      where: { businessId: tenantId }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'WhatsApp config not found' },
        { status: 404 }
      )
    }

    // Delete config (only for this tenant)
    await prisma.whatsAppBusinessConfig.delete({
      where: { businessId: tenantId }
    })

    return NextResponse.json({
      success: true,
      message: 'WhatsApp config deleted successfully'
    })
  } catch (error) {
    console.error('[Tenant WhatsApp Config API] DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete config' },
      { status: 500 }
    )
  }
}
