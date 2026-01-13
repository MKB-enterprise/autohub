import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth, requireAdmin, validateTenantAccess } from '@/lib/auth'
import { resolveTenantFromRequest } from '@/lib/tenant-resolver'
import { validateAppointmentSlot, calculateTotalPrice } from '@/lib/availability'

// GET /api/budgets/[id]
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth()
    await validateTenantAccess(request, user)
    const { context } = await resolveTenantFromRequest(request)
    const businessId = context?.tenantId || (user as any).businessId

    const budget = await prisma.budget.findFirst({
      where: { id: params.id, businessId },
      include: {
        items: true,
        signatures: true,
        customer: true
      }
    })
    if (!budget) return NextResponse.json({ error: 'Orçamento não encontrado' }, { status: 404 })
    return NextResponse.json(budget)
  } catch (error) {
    console.error('Erro ao buscar orçamento', error)
    return NextResponse.json({ error: 'Erro ao buscar orçamento' }, { status: 500 })
  }
}

// PATCH /api/budgets/[id]
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin()
    await validateTenantAccess(request, admin)
    const body = await request.json()
    const { status, notes, expiresAt, action, carId, serviceIds, startDatetime } = body

    const { context } = await resolveTenantFromRequest(request)
    const businessId = context?.tenantId || (admin as any).businessId

    const budget = await prisma.budget.findFirst({ where: { id: params.id, businessId }, include: { items: true, customer: true } })
    if (!budget) return NextResponse.json({ error: 'Orçamento não encontrado' }, { status: 404 })

    const data: any = {}
    if (status) data.status = status
    if (notes !== undefined) data.notes = notes
    if (expiresAt) data.expiresAt = new Date(expiresAt)

    // Conversão para agendamento
    if (action === 'convert') {
      if (!carId || !serviceIds || !startDatetime) {
        return NextResponse.json({ error: 'carId, serviceIds e startDatetime são obrigatórios para converter em agendamento' }, { status: 400 })
      }

      const start = new Date(startDatetime)
      const validation = await validateAppointmentSlot(start, serviceIds, undefined, budget.businessId)
      if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 400 })

      const services = await prisma.service.findMany({ where: { id: { in: serviceIds }, businessId: budget.businessId, isActive: true } })
      const totalPrice = await calculateTotalPrice(serviceIds)
      const totalDuration = services.reduce((sum, s) => sum + s.durationMinutes, 0)
      const end = new Date(start)
      end.setMinutes(end.getMinutes() + totalDuration)

      const revenueAccount = await prisma.financialAccount.upsert({
        where: { businessId_name: { businessId: budget.businessId, name: 'Serviços' } },
        update: {},
        create: { businessId: budget.businessId, name: 'Serviços', type: 'REVENUE' }
      })

      const appointment = await prisma.appointment.create({
        data: {
          businessId: budget.businessId,
          customerId: budget.customerId,
          carId,
          startDatetime: start,
          endDatetime: end,
          totalPrice,
          status: 'CONFIRMED',
          appointmentServices: {
            create: services.map((s) => ({ serviceId: s.id, price: s.price }))
          }
        }
      })

      data.status = 'CONVERTED'
      data.notes = notes ?? budget.notes
      data.signedAt = budget.signedAt ?? new Date()

      // Link financeiro provisionado
      await prisma.financialTransaction.create({
        data: {
          businessId: budget.businessId,
          accountId: revenueAccount.id,
          type: 'REVENUE',
          amount: totalPrice,
          description: `Agendamento oriundo do orçamento ${budget.id}`,
          appointmentId: appointment.id,
          budgetId: budget.id,
          status: 'PENDING'
        }
      })
    }

    const updated = await prisma.budget.update({
      where: { id: params.id },
      data,
      include: { items: true, signatures: true }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Erro ao atualizar orçamento', error)
    return NextResponse.json({ error: 'Erro ao atualizar orçamento' }, { status: 500 })
  }
}

// DELETE /api/budgets/[id]
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin()
    await validateTenantAccess(request, admin)
    const { context } = await resolveTenantFromRequest(request)
    const businessId = context?.tenantId || (admin as any).businessId

    await prisma.budget.delete({ where: { id: params.id, businessId } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro ao apagar orçamento', error)
    return NextResponse.json({ error: 'Erro ao apagar orçamento' }, { status: 500 })
  }
}
