import { NextRequest, NextResponse } from 'next/server'
import { getAvailableSlots, calculateTotalDuration, calculateTotalPrice, suggestNextAvailableSlots, getAvailableSlotsForDuration } from '@/lib/availability'
import { format } from 'date-fns'

// GET /api/availability?date=YYYY-MM-DD&durationMinutes=XX&serviceIds=id1,id2
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')
    const durationMinutes = searchParams.get('durationMinutes')
    const serviceIdsParam = searchParams.get('serviceIds')

    console.log('GET /api/availability - Params:', { date, durationMinutes, serviceIdsParam })

    if (!date) {
      return NextResponse.json(
        { error: 'Data é obrigatória' },
        { status: 400 }
      )
    }

    // Se não passar serviceIds, podemos tentar via duração (pública)
    const serviceIds = serviceIdsParam ? serviceIdsParam.split(',').filter(Boolean) : []

    // Criar a data corretamente no timezone local (não UTC)
    // Formato esperado: YYYY-MM-DD
    const [year, month, day] = date.split('-').map(Number)
    const targetDate = new Date(year, month - 1, day, 12, 0, 0) // Meio-dia para evitar problemas de timezone
    console.log('Data alvo:', targetDate, 'ISO:', targetDate.toISOString())

    let availableSlots: Date[] = []
    if (serviceIds.length > 0) {
      availableSlots = await getAvailableSlots(targetDate, serviceIds)
    } else if (durationMinutes) {
      const dur = parseInt(durationMinutes, 10)
      if (!isNaN(dur) && dur > 0) {
        availableSlots = await getAvailableSlotsForDuration(targetDate, dur)
      }
    }
    console.log('Slots encontrados:', availableSlots.length)

    // Formatar horários como strings HH:mm
    const availableTimes = availableSlots.map(slot => format(slot, 'HH:mm'))

    // Calcular informações úteis
    const totalDuration = serviceIds.length > 0
      ? await calculateTotalDuration(serviceIds)
      : (durationMinutes ? parseInt(durationMinutes, 10) : 0)
    const totalPrice = serviceIds.length > 0
      ? await calculateTotalPrice(serviceIds)
      : 0

    return NextResponse.json({
      availableTimes,
      totalDuration,
      totalPrice
    })
  } catch (error) {
    console.error('Erro ao buscar disponibilidade:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar horários disponíveis' },
      { status: 500 }
    )
  }
}

// POST /api/availability - Mesma funcionalidade que /api/appointments/availability
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, serviceIds, suggestAlternatives } = body

    console.log('POST /api/availability - Body:', { date, serviceIds })

    if (!date || !serviceIds || serviceIds.length === 0) {
      return NextResponse.json(
        { error: 'Data e serviços são obrigatórios' },
        { status: 400 }
      )
    }

    // Criar a data corretamente no timezone local (não UTC)
    const [year, month, day] = date.split('-').map(Number)
    const targetDate = new Date(year, month - 1, day, 12, 0, 0)
    const availableSlots = await getAvailableSlots(targetDate, serviceIds)

    // Calcular informações úteis
    const totalDuration = await calculateTotalDuration(serviceIds)
    const totalPrice = await calculateTotalPrice(serviceIds)

    // Se não houver slots e for solicitado alternativas
    if (availableSlots.length === 0 && suggestAlternatives) {
      const suggestions = await suggestNextAvailableSlots(targetDate, serviceIds)
      
      return NextResponse.json({
        availableSlots: [],
        availableTimes: [],
        totalDuration,
        totalPrice,
        suggestions: suggestions.map(s => ({
          date: s.date,
          slots: s.slots
        }))
      })
    }

    // Formatar horários como strings HH:mm
    const availableTimes = availableSlots.map(slot => format(slot, 'HH:mm'))

    return NextResponse.json({
      availableSlots,
      availableTimes,
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
