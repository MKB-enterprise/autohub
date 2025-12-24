import { NextRequest, NextResponse } from 'next/server'
import { getAvailableSlots, suggestNextAvailableSlots, calculateTotalDuration, calculateTotalPrice } from '@/lib/availability'
import { getCurrentUser } from '@/lib/auth'

// POST /api/appointments/availability - Verificar disponibilidade
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, serviceIds, suggestAlternatives } = body

    console.log('Verificando disponibilidade:', { date, serviceIds })

    if (!date || !serviceIds || serviceIds.length === 0) {
      return NextResponse.json(
        { error: 'Data e serviços são obrigatórios' },
        { status: 400 }
      )
    }

    // Criar a data corretamente no timezone local (não UTC)
    // Formato esperado: YYYY-MM-DD
    const [year, month, day] = date.split('-').map(Number)
    const targetDate = new Date(year, month - 1, day, 12, 0, 0) // Meio-dia para evitar problemas de timezone
    console.log('Data convertida:', targetDate, 'ISO:', targetDate.toISOString())

    const user = await getCurrentUser()
    const availableSlots = await getAvailableSlots(targetDate, serviceIds, user?.businessId)
    console.log('Slots encontrados:', availableSlots.length)

    // Calcular informações úteis
    const totalDuration = await calculateTotalDuration(serviceIds)
    const totalPrice = await calculateTotalPrice(serviceIds)

    // Se não houver slots e for solicitado alternativas
    if (availableSlots.length === 0 && suggestAlternatives) {
      const suggestions = await suggestNextAvailableSlots(targetDate, serviceIds)
      
      return NextResponse.json({
        availableSlots: [],
        totalDuration,
        totalPrice,
        suggestions: suggestions.map(s => ({
          date: s.date,
          slots: s.slots
        }))
      })
    }

    return NextResponse.json({
      availableSlots,
      totalDuration,
      totalPrice
    })
  } catch (error) {
    console.error('Erro ao verificar disponibilidade:', error)
    return NextResponse.json(
      { error: 'Erro ao verificar disponibilidade' },
      { status: 500 }
    )
  }
}
