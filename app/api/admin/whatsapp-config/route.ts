/**
 * Admin API: WhatsApp Config Management (ADMIN ONLY - super user)
 * Lists ALL configs across all businesses
 * 
 * For tenant-specific config management, see: /api/tenant/whatsapp-config
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

async function isAdmin(): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value

    if (!token) return false

    const decoded = verifyToken(token)
    // Check if user is admin; adjust role logic as needed
    return decoded?.isAdmin === true
  } catch {
    return false
  }
}

// GET: List all WhatsApp configs with business info (ADMIN ONLY)
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    if (!(await isAdmin())) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      )
    }

    const configs = await prisma.whatsAppBusinessConfig.findMany({
      include: {
        business: {
          select: {
            id: true,
            name: true,
            email: true,
            slug: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ success: true, data: configs })
  } catch (error) {
    console.error('[WhatsApp Config API] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch configs' },
      { status: 500 }
    )
  }
}

// POST: Create new WhatsApp config
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { businessId, phoneNumberId, accessToken, displayName, appSecret } = body

    // Validate required fields
    if (!businessId || !phoneNumberId || !accessToken) {
      return NextResponse.json(
        { error: 'Missing required fields: businessId, phoneNumberId, accessToken' },
        { status: 400 }
      )
    }

    // Check if business exists
    const business = await prisma.business.findUnique({
      where: { id: businessId }
    })

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    // Check if config already exists for this business
    const existing = await prisma.whatsAppBusinessConfig.findUnique({
      where: { businessId }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'WhatsApp config already exists for this business' },
        { status: 409 }
      )
    }

    // Create config
    const config = await prisma.whatsAppBusinessConfig.create({
      data: {
        businessId,
        phoneNumberId,
        accessToken,
        displayName: displayName || business.name,
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
    console.error('[WhatsApp Config API] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create config' },
      { status: 500 }
    )
  }
}

// PUT: Update WhatsApp config
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { configId, phoneNumberId, accessToken, displayName, appSecret, isActive } = body

    if (!configId) {
      return NextResponse.json(
        { error: 'configId is required' },
        { status: 400 }
      )
    }

    // Check if config exists
    const existing = await prisma.whatsAppBusinessConfig.findUnique({
      where: { id: configId }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Config not found' },
        { status: 404 }
      )
    }

    // Update config
    const updated = await prisma.whatsAppBusinessConfig.update({
      where: { id: configId },
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
    console.error('[WhatsApp Config API] PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update config' },
      { status: 500 }
    )
  }
}

// DELETE: Delete WhatsApp config
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const configId = searchParams.get('configId')

    if (!configId) {
      return NextResponse.json(
        { error: 'configId is required' },
        { status: 400 }
      )
    }

    // Check if config exists
    const existing = await prisma.whatsAppBusinessConfig.findUnique({
      where: { id: configId }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Config not found' },
        { status: 404 }
      )
    }

    // Delete config
    await prisma.whatsAppBusinessConfig.delete({
      where: { id: configId }
    })

    return NextResponse.json({
      success: true,
      message: 'Config deleted successfully'
    })
  } catch (error) {
    console.error('[WhatsApp Config API] DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete config' },
      { status: 500 }
    )
  }
}
