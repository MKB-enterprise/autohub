import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// GET /api/appointments/[id]/cancellation - Obter detalhes de cancelamento
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const appointmentId = params.id

    const cancellation = await prisma.appointmentCancellation.findUnique({
      where: { appointmentId }
    })

    if (!cancellation) {
      return NextResponse.json({ error: 'Cancelamento não encontrado' }, { status: 404 })
    }

    return NextResponse.json(cancellation)
  } catch (error) {
    console.error('Erro ao buscar cancelamento:', error)
    return NextResponse.json({ error: 'Erro ao buscar cancelamento' }, { status: 500 })
  }
}

// POST /api/appointments/[id]/cancel - Cancelar agendamento
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAdmin()
    const appointmentId = params.id
    const { reason, notes } = await request.json()

    if (!reason) {
      return NextResponse.json({ error: 'Motivo do cancelamento obrigatório' }, { status: 400 })
    }

    // Buscar agendamento
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId }
    })

    if (!appointment) {
      return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })
    }

    // Criar cancelamento
    const cancellation = await prisma.appointmentCancellation.create({
      data: {
        businessId: appointment.businessId,
        appointmentId,
        reason,
        canceledBy: 'business',
        notes
      }
    })

    // Atualizar status do agendamento
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'CANCELED' }
    })

    return NextResponse.json(cancellation, { status: 201 })
  } catch (error) {
    console.error('Erro ao cancelar agendamento:', error)
    return NextResponse.json({ error: 'Erro ao cancelar agendamento' }, { status: 500 })
  }
}

// DELETE /api/appointments/[id]/cancellation - Remover cancelamento (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()

    const appointmentId = params.id

    await prisma.appointmentCancellation.delete({
      where: { appointmentId }
    })

    // Restaurar para PENDING
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'PENDING' }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao remover cancelamento:', error)
    return NextResponse.json({ error: 'Erro ao remover cancelamento' }, { status: 500 })
  }
}
