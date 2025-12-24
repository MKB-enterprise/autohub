import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { validateAppointmentSlot, calculateTotalPrice } from '@/lib/availability'
import { requireAuth } from '@/lib/auth'

// GET /api/appointments/[id] - Buscar agendamento específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        car: true,
        appointmentServices: {
          include: {
            service: true
          }
        }
      }
    })

    if (!appointment) {
      return NextResponse.json(
        { error: 'Agendamento não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(appointment)
  } catch (error) {
    console.error('Erro ao buscar agendamento:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar agendamento' },
      { status: 500 }
    )
  }
}

// PATCH /api/appointments/[id] - Atualizar agendamento
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth()
    const existing = await prisma.appointment.findUnique({
      where: { id: params.id },
      select: { customerId: true, businessId: true }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })
    }

    const isAdmin = auth.isAdmin
    const isOwner = auth.customerId === existing.customerId
    if ((existing as any).businessId !== (auth as any).businessId) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }
    const body = await request.json()
    const { 
      status, 
      startDatetime, 
      serviceIds, 
      notes,
      businessNotes,
      suggestedDatetime,
      confirmedByClientAt,
      confirmedByBusinessAt
    } = body

    // Se está apenas atualizando status e/ou campos de confirmação
    if (status || confirmedByClientAt || confirmedByBusinessAt || suggestedDatetime || businessNotes !== undefined) {
      // Cliente pode cancelar seus próprios agendamentos
      if (status === 'CANCELED' && !isAdmin && !isOwner) {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
      }

      const updateData: any = {}
      
      if (status) {
        if (status === 'CANCELED') {
          // Admin precisa de motivo no businessNotes, cliente pode usar notes
          if (isAdmin && (!businessNotes || String(businessNotes).trim().length === 0)) {
            return NextResponse.json({ error: 'Informe um motivo para cancelar' }, { status: 400 })
          }
          if (!isAdmin && (!notes || String(notes).trim().length === 0)) {
            return NextResponse.json({ error: 'Informe um motivo para cancelar' }, { status: 400 })
          }
        }
        updateData.status = status
      }
      if (confirmedByClientAt) updateData.confirmedByClientAt = new Date(confirmedByClientAt)
      if (confirmedByBusinessAt) updateData.confirmedByBusinessAt = new Date(confirmedByBusinessAt)
      if (suggestedDatetime) updateData.suggestedDatetime = new Date(suggestedDatetime)
      if (businessNotes !== undefined) updateData.businessNotes = businessNotes
      if (notes !== undefined) updateData.notes = notes
      
      // Se cliente aceitou reagendamento, atualizar o horário
      if (status === 'CONFIRMED_BY_CLIENT' && startDatetime) {
        const currentAppointment = await prisma.appointment.findUnique({
          where: { id: params.id },
          include: { appointmentServices: true }
        })
        
        if (currentAppointment) {
          const newStart = new Date(startDatetime)
          const serviceIds = currentAppointment.appointmentServices.map((as: any) => as.serviceId)
          
          const services = await prisma.service.findMany({
            where: { id: { in: serviceIds } }
          })
          
          const totalDuration = services.reduce((sum: number, s: any) => sum + s.durationMinutes, 0)
          const newEnd = new Date(newStart)
          newEnd.setMinutes(newEnd.getMinutes() + totalDuration)
          
          updateData.startDatetime = newStart
          updateData.endDatetime = newEnd
          updateData.suggestedDatetime = null // limpar sugestão após aceite
        }
      }

      const appointment = await prisma.appointment.update({
        where: { id: params.id },
        data: updateData,
        include: {
          customer: true,
          car: true,
          appointmentServices: {
            include: {
              service: true
            }
          }
        }
      })

      // === SISTEMA DE REPUTAÇÃO ===
      // Atualizar rating do cliente quando status muda para NO_SHOW ou COMPLETED
      if (status === 'NO_SHOW' || status === 'COMPLETED') {
        // Buscar configurações do sistema
        const settings = await prisma.settings.findFirst()
        
        // Se o sistema de reputação estiver desativado, não faz nada
        if (settings?.reputationEnabled === false) {
          return NextResponse.json(appointment)
        }

        const customer = await prisma.customer.findUnique({
          where: { id: appointment.customerId }
        })

        if (customer) {
          let newRating = Number(customer.rating)
          let newNoShowCount = customer.noShowCount
          let newCompletedCount = customer.completedCount

          // Valores das configurações (com defaults)
          const noShowPenalty = Number(settings?.reputationNoShowPenalty) || 2.5
          const minForAdvance = Number(settings?.reputationMinForAdvance) || 3.0
          const recoveryOnShow = settings?.reputationRecoveryOnShow !== false

          if (status === 'NO_SHOW') {
            // Cliente não compareceu: nota vai para o valor configurado
            newRating = noShowPenalty
            newNoShowCount += 1
          } else if (status === 'COMPLETED') {
            // Cliente compareceu: se estava na zona vermelha e recovery está ativo, volta para 5.0
            if (newRating < minForAdvance && recoveryOnShow) {
              newRating = 5.0 // Reabilitação completa
            } else {
              newRating = Math.min(5, newRating + 0.2)
            }
            newCompletedCount += 1
          }

          await prisma.customer.update({
            where: { id: appointment.customerId },
            data: {
              rating: newRating,
              noShowCount: newNoShowCount,
              completedCount: newCompletedCount
            }
          })
        }
      }

      return NextResponse.json(appointment)
    }

    // Se está reagendando
    if (startDatetime || serviceIds) {
      if (!isAdmin && !isOwner) {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
      }
      const currentAppointment = await prisma.appointment.findUnique({
        where: { id: params.id },
        include: {
          appointmentServices: true
        }
      })

      if (!currentAppointment) {
        return NextResponse.json(
          { error: 'Agendamento não encontrado' },
          { status: 404 }
        )
      }

      const newServiceIds = serviceIds || currentAppointment.appointmentServices.map((as: any) => as.serviceId)
      const newStartDatetime = startDatetime ? new Date(startDatetime) : currentAppointment.startDatetime

      // Validar novo horário (excluindo o próprio agendamento)
      const validation = await validateAppointmentSlot(
        newStartDatetime,
        newServiceIds,
        params.id,
        (auth as any).businessId
      )

      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        )
      }

      // Buscar serviços e calcular totais
      const services = await prisma.service.findMany({
        where: {
          businessId: (auth as any).businessId,
          id: { in: newServiceIds },
          isActive: true
        }
      })

      const totalDuration = services.reduce((sum: number, s: any) => sum + s.durationMinutes, 0)
      const totalPrice = await calculateTotalPrice(newServiceIds)

      const endDatetime = new Date(newStartDatetime)
      endDatetime.setMinutes(endDatetime.getMinutes() + totalDuration)

      // Atualizar agendamento
      // Primeiro deletar os serviços antigos se mudaram
      if (serviceIds) {
        await prisma.appointmentService.deleteMany({
          where: { appointmentId: params.id }
        })
      }

      const appointment = await prisma.appointment.update({
        where: { id: params.id },
        data: {
          startDatetime: newStartDatetime,
          endDatetime,
          totalPrice,
          notes,
          ...(serviceIds && {
            appointmentServices: {
              create: services.map((service: any) => ({
                serviceId: service.id,
                price: service.price
              }))
            }
          })
        },
        include: {
          customer: true,
          car: true,
          appointmentServices: {
            include: {
              service: true
            }
          }
        }
      })

      return NextResponse.json(appointment)
    }

    return NextResponse.json(
      { error: 'Nenhum campo para atualizar' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Erro ao atualizar agendamento:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erro ao atualizar agendamento' }, { status: 500 })
  }
}

// DELETE /api/appointments/[id] - Deletar agendamento
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth()
    if (!auth.isAdmin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    await prisma.appointment.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao deletar agendamento:', error)
    return NextResponse.json(
      { error: 'Erro ao deletar agendamento' },
      { status: 500 }
    )
  }
}
