import { prisma } from './db'
import { parse, addMinutes, isAfter, isBefore, isEqual, startOfDay, endOfDay, addDays } from 'date-fns'
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz'

// Intervalo fixo entre slots (30 em 30 minutos)
const SLOT_INTERVAL_MINUTES = 30

// Horário de almoço da equipe (12h às 13h)
const LUNCH_START_HOUR = 12
const LUNCH_END_HOUR = 13
const LUNCH_DURATION_MINUTES = 60

/**
 * Calcula o horário real de término considerando a pausa para almoço.
 * Se o serviço passar pelo horário de almoço (12h-13h), adiciona 1 hora extra.
 * 
 * Exemplo:
 * - Início 08:00, duração 6h → sem almoço terminaria 14:00, MAS passa pelo almoço
 * - Então termina às 15:00 (14:00 + 1h de pausa)
 * 
 * - Início 13:00, duração 4h → termina 17:00 (não passa pelo almoço)
 */
export function calculateRealEndTime(slotStart: Date, durationMinutes: number, timezone: string): Date {
  const localStart = utcToZonedTime(slotStart, timezone)
  const startHour = localStart.getHours()
  const startMinutes = localStart.getMinutes()
  
  // Calcula horário de término sem considerar almoço
  const theoreticalEnd = addMinutes(slotStart, durationMinutes)
  const localTheoreticalEnd = utcToZonedTime(theoreticalEnd, timezone)
  const endHour = localTheoreticalEnd.getHours()
  const endMinutes = localTheoreticalEnd.getMinutes()
  
  // Converte para minutos desde meia-noite
  const startInMinutes = startHour * 60 + startMinutes
  const endInMinutes = endHour * 60 + endMinutes
  const lunchStartInMinutes = LUNCH_START_HOUR * 60  // 12:00 = 720
  const lunchEndInMinutes = LUNCH_END_HOUR * 60      // 13:00 = 780
  
  // Se o serviço começa antes do almoço E termina depois do início do almoço
  // → precisa adicionar a pausa do almoço
  if (startInMinutes < lunchStartInMinutes && endInMinutes > lunchStartInMinutes) {
    return addMinutes(theoreticalEnd, LUNCH_DURATION_MINUTES)
  }
  
  // Se começa durante o almoço (não deveria acontecer, mas por segurança)
  if (startInMinutes >= lunchStartInMinutes && startInMinutes < lunchEndInMinutes) {
    // Move o início para após o almoço
    const adjustedStart = addMinutes(slotStart, lunchEndInMinutes - startInMinutes)
    return addMinutes(adjustedStart, durationMinutes)
  }
  
  return theoreticalEnd
}

/**
 * Verifica se um slot começa durante o horário de almoço (12h-13h)
 * Slots que COMEÇAM no almoço não são permitidos
 */
function startsInLunchBreak(slotStart: Date, timezone: string): boolean {
  const localStart = utcToZonedTime(slotStart, timezone)
  const startHour = localStart.getHours()
  const startMinutes = localStart.getMinutes()
  const startInMinutes = startHour * 60 + startMinutes
  
  const lunchStartInMinutes = LUNCH_START_HOUR * 60
  const lunchEndInMinutes = LUNCH_END_HOUR * 60
  
  return startInMinutes >= lunchStartInMinutes && startInMinutes < lunchEndInMinutes
}

/**
 * Converte string de horário (HH:mm) para Date em uma data específica
 */
function parseTimeToDate(timeString: string, date: Date, timezone: string): Date {
  const [hours, minutes] = timeString.split(':').map(Number)
  const result = new Date(date)
  result.setHours(hours, minutes, 0, 0)
  return zonedTimeToUtc(result, timezone)
}

/**
 * Verifica se dois intervalos de tempo se sobrepõem
 * IMPORTANTE: Se um termina exatamente quando outro começa, NÃO há sobreposição
 * Ex: Serviço 1 termina 10:30, Serviço 2 começa 10:30 = OK, não há conflito
 * 
 * A tolerância de atraso só se aplica quando há sobreposição real,
 * não para impedir agendamentos consecutivos
 */
function hasOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  // Dois intervalos se sobrepõem se um começa ANTES do outro terminar
  // E termina DEPOIS do outro começar
  // Usando comparação estrita (< e >) para permitir horários consecutivos
  
  // Intervalo 1: [start1, end1)
  // Intervalo 2: [start2, end2)
  // Sobreposição ocorre quando: start1 < end2 AND end1 > start2
  
  return isBefore(start1, end2) && isAfter(end1, start2)
}

/**
 * Arredonda horário para o próximo slot de 30 minutos
 */
function roundToNextSlot(date: Date): Date {
  const minutes = date.getMinutes()
  const remainder = minutes % SLOT_INTERVAL_MINUTES
  
  if (remainder === 0) {
    return date
  }
  
  const minutesToAdd = SLOT_INTERVAL_MINUTES - remainder
  return addMinutes(date, minutesToAdd)
}

/**
 * Calcula duração total em minutos dos serviços selecionados
 */
export async function calculateTotalDuration(serviceIds: string[]): Promise<number> {
  try {
    const services = await prisma.service.findMany({
      where: {
        id: { in: serviceIds },
        isActive: true
      },
      select: { durationMinutes: true }
    })

    return services.reduce((total: number, service: { durationMinutes: number }) => total + service.durationMinutes, 0)
  } catch (error) {
    console.error('Erro ao calcular duração:', error)
    throw error
  }
}

/**
 * Calcula preço total dos serviços selecionados
 */
export async function calculateTotalPrice(serviceIds: string[]): Promise<number> {
  try {
    const services = await prisma.service.findMany({
      where: {
        id: { in: serviceIds },
        isActive: true
      },
      select: { price: true }
    })

    return services.reduce((total: number, service: { price: any }) => total + Number(service.price), 0)
  } catch (error) {
    console.error('Erro ao calcular preço:', error)
    throw error
  }
}

/**
 * Retorna todos os horários disponíveis para uma data e serviços específicos
 */
export async function getAvailableSlots(
  date: Date,
  serviceIds: string[],
  businessId?: string
): Promise<Date[]> {
  // Buscar configurações (multi-tenant primeiro; fallback single-tenant)
  let settings: any = null
  if (businessId) {
    settings = await prisma.businessSettings.findUnique({ where: { businessId } })
  }
  if (!settings) {
    settings = await prisma.businessSettings.findFirst()
  }
  if (!settings) {
    settings = await prisma.settings.findFirst()
  }
  if (!settings) {
    throw new Error('Configurações não encontradas. Execute a seed do banco.')
  }

  const timezone = settings.timezone
  const zonedDate = utcToZonedTime(date, timezone)
  const dayStart = startOfDay(zonedDate)

  // Calcular duração total necessária
  const totalDuration = await calculateTotalDuration(serviceIds)
  if (totalDuration === 0) {
    return []
  }

  // Converter horários de abertura/fechamento
  const openingTime = parseTimeToDate(settings.openingTimeWeekday, dayStart, timezone)
  const closingTime = parseTimeToDate(settings.closingTimeWeekday, dayStart, timezone)

  // Gerar todos os slots possíveis do dia (a cada 30 minutos)
  const allSlots: Date[] = []
  let currentSlot = openingTime
  
  while (isBefore(currentSlot, closingTime)) {
    // Calcular horário real de término (considerando pausa de almoço se necessário)
    const realEndTime = calculateRealEndTime(currentSlot, totalDuration, timezone)
    
    // Verificar se o slot + duração total não ultrapassa o horário de fechamento
    if (isBefore(realEndTime, closingTime) || isEqual(realEndTime, closingTime)) {
      allSlots.push(currentSlot)
    }
    currentSlot = addMinutes(currentSlot, SLOT_INTERVAL_MINUTES)
  }

  // Buscar agendamentos do dia (excluindo cancelados e no-show)
  const dayEnd = endOfDay(zonedDate)
  const existingAppointments = await prisma.appointment.findMany({
    where: {
      ...(businessId ? { businessId } : {}),
      startDatetime: {
        gte: zonedTimeToUtc(dayStart, timezone),
        lte: zonedTimeToUtc(dayEnd, timezone)
      },
      status: {
        notIn: ['CANCELED', 'NO_SHOW']
      }
    },
    select: {
      startDatetime: true,
      endDatetime: true
    }
  })

  // Filtrar slots disponíveis
  const now = new Date()
  
  console.log('=== GERANDO SLOTS DISPONÍVEIS ===')
  console.log('Duração dos serviços:', totalDuration, 'minutos')
  console.log('Total de slots possíveis:', allSlots.length)
  console.log('Agendamentos existentes:', existingAppointments.length)
  console.log('maxCarsPerSlot:', settings.maxCarsPerSlot)
  
  const availableSlots = allSlots.filter(slot => {
    // Não mostrar horários que já passaram
    if (isBefore(slot, now)) {
      return false
    }

    // Não permitir slots que COMEÇAM durante o almoço
    if (startsInLunchBreak(slot, timezone)) {
      return false
    }

    // Calcular horário real de término (com pausa de almoço se necessário)
    const realEndTime = calculateRealEndTime(slot, totalDuration, timezone)
    
    // Verificar quantos carros estariam ocupados neste slot
    const overlappingAppointments = existingAppointments.filter((appointment: { startDatetime: Date; endDatetime: Date }) =>
      hasOverlap(slot, realEndTime, appointment.startDatetime, appointment.endDatetime)
    )

    const isAvailable = overlappingAppointments.length < settings.maxCarsPerSlot
    
    // Log apenas para slots que seriam disponíveis mas têm conflitos
    if (!isAvailable) {
      const localSlot = utcToZonedTime(slot, timezone)
      console.log(`Slot ${localSlot.getHours()}:${localSlot.getMinutes().toString().padStart(2, '0')} bloqueado - ${overlappingAppointments.length} conflitos`)
    }

    // Slot está disponível se não atingir o limite de carros
    return isAvailable
  })

  return availableSlots
}

/**
 * Variante de disponibilidade recebendo a duração total diretamente (sem services)
 */
export async function getAvailableSlotsForDuration(
  date: Date,
  totalDuration: number,
  businessId?: string
): Promise<Date[]> {
  let settings: any = null
  if (businessId) settings = await prisma.businessSettings.findUnique({ where: { businessId } })
  if (!settings) settings = await prisma.businessSettings.findFirst()
  if (!settings) settings = await prisma.settings.findFirst()
  if (!settings) {
    throw new Error('Configurações não encontradas. Execute a seed do banco.')
  }

  if (!totalDuration || totalDuration <= 0) {
    return []
  }

  const timezone = settings.timezone
  const zonedDate = utcToZonedTime(date, timezone)
  const dayStart = startOfDay(zonedDate)

  // Converter horários de abertura/fechamento
  const openingTime = parseTimeToDate(settings.openingTimeWeekday, dayStart, timezone)
  const closingTime = parseTimeToDate(settings.closingTimeWeekday, dayStart, timezone)

  // Gerar todos os slots possíveis do dia (a cada 30 minutos)
  const allSlots: Date[] = []
  let currentSlot = openingTime
  
  while (isBefore(currentSlot, closingTime)) {
    // Calcular horário real de término (considerando pausa de almoço se necessário)
    const realEndTime = calculateRealEndTime(currentSlot, totalDuration, timezone)
    
    // Verificar se o slot + duração total não ultrapassa o horário de fechamento
    if (isBefore(realEndTime, closingTime) || isEqual(realEndTime, closingTime)) {
      allSlots.push(currentSlot)
    }
    currentSlot = addMinutes(currentSlot, SLOT_INTERVAL_MINUTES)
  }

  // Buscar agendamentos do dia (excluindo cancelados e no-show)
  const dayEnd = endOfDay(zonedDate)
  const existingAppointments = await prisma.appointment.findMany({
    where: {
      ...(businessId ? { businessId } : {}),
      startDatetime: {
        gte: zonedTimeToUtc(dayStart, timezone),
        lte: zonedTimeToUtc(dayEnd, timezone)
      },
      status: {
        notIn: ['CANCELED', 'NO_SHOW']
      }
    },
    select: {
      startDatetime: true,
      endDatetime: true
    }
  })

  const now = new Date()
  const availableSlots = allSlots.filter(slot => {
    if (isBefore(slot, now)) return false
    if (startsInLunchBreak(slot, timezone)) return false

    const realEndTime = calculateRealEndTime(slot, totalDuration, timezone)
    const overlappingAppointments = existingAppointments.filter((appointment: { startDatetime: Date; endDatetime: Date }) =>
      hasOverlap(slot, realEndTime, appointment.startDatetime, appointment.endDatetime)
    )

    return overlappingAppointments.length < settings.maxCarsPerSlot
  })

  return availableSlots
}

/**
 * Sugere próximos dias/horários disponíveis quando a data escolhida não tem slots
 */
export async function suggestNextAvailableSlots(
  startDate: Date,
  serviceIds: string[],
  maxDaysToCheck: number = 14
): Promise<{ date: Date; slots: Date[] }[]> {
  const suggestions: { date: Date; slots: Date[] }[] = []
  let currentDate = startDate

  for (let i = 0; i < maxDaysToCheck; i++) {
    const slots = await getAvailableSlots(currentDate, serviceIds)
    
    if (slots.length > 0) {
      suggestions.push({
        date: currentDate,
        slots
      })
      
      // Retornar até 3 dias com disponibilidade
      if (suggestions.length >= 3) {
        break
      }
    }

    currentDate = addDays(currentDate, 1)
  }

  return suggestions
}

/**
 * Valida se um agendamento pode ser criado no horário especificado
 */
export async function validateAppointmentSlot(
  startDatetime: Date,
  serviceIds: string[],
  excludeAppointmentId?: string,
  businessId?: string
): Promise<{ valid: boolean; error?: string }> {
  let settings: any = null
  if (businessId) settings = await prisma.businessSettings.findUnique({ where: { businessId } })
  if (!settings) settings = await prisma.businessSettings.findFirst()
  if (!settings) settings = await prisma.settings.findFirst()
  if (!settings) {
    return { valid: false, error: 'Configurações não encontradas' }
  }

  const timezone = settings.timezone
  const now = new Date()

  // Verificar se não é horário passado
  if (isBefore(startDatetime, now)) {
    return { valid: false, error: 'Não é possível agendar em horário passado' }
  }

  // Verificar se não começa durante o almoço
  if (startsInLunchBreak(startDatetime, timezone)) {
    return { valid: false, error: 'Não é possível iniciar serviço durante o horário de almoço (12h às 13h)' }
  }

  // Calcular duração total e horário real de término (com pausa de almoço se necessário)
  const totalDuration = await calculateTotalDuration(serviceIds)
  const endDatetime = calculateRealEndTime(startDatetime, totalDuration, timezone)

  // Verificar horário de funcionamento
  const zonedStart = utcToZonedTime(startDatetime, timezone)
  const dayStart = startOfDay(zonedStart)
  const openingTime = parseTimeToDate(settings.openingTimeWeekday, dayStart, timezone)
  const closingTime = parseTimeToDate(settings.closingTimeWeekday, dayStart, timezone)

  if (isBefore(startDatetime, openingTime)) {
    return { valid: false, error: 'Horário antes da abertura' }
  }

  if (isAfter(endDatetime, closingTime)) {
    return { valid: false, error: 'Horário ultrapassa o fechamento' }
  }

  // Verificar conflitos com outros agendamentos
  const dayEnd = endOfDay(zonedStart)
  const whereClause: any = {
    startDatetime: {
      gte: zonedTimeToUtc(startOfDay(zonedStart), timezone),
      lte: zonedTimeToUtc(dayEnd, timezone)
    },
    status: {
      notIn: ['CANCELED', 'NO_SHOW']
    }
  }
  if (businessId) whereClause.businessId = businessId

  if (excludeAppointmentId) {
    whereClause.id = { not: excludeAppointmentId }
  }

  const existingAppointments = await prisma.appointment.findMany({
    where: whereClause,
    select: {
      startDatetime: true,
      endDatetime: true
    }
  })

  console.log('=== VALIDAÇÃO DE SLOT ===')
  console.log('Horário solicitado:', startDatetime)
  console.log('Fim do serviço (com pausa almoço se aplicável):', endDatetime)
  console.log('Agendamentos existentes no dia:', existingAppointments.length)
  console.log('maxCarsPerSlot:', settings.maxCarsPerSlot)

  // Verifica sobreposição
  const overlappingAppointments = existingAppointments.filter((appointment: { startDatetime: Date; endDatetime: Date }) => {
    const overlap = hasOverlap(startDatetime, endDatetime, appointment.startDatetime, appointment.endDatetime)
    console.log(`Comparando com agendamento ${appointment.startDatetime} - ${appointment.endDatetime}: ${overlap ? 'CONFLITO' : 'OK'}`)
    return overlap
  })
  
  const overlappingCount = overlappingAppointments.length
  console.log('Total de conflitos:', overlappingCount)

  if (overlappingCount >= settings.maxCarsPerSlot) {
    return { valid: false, error: 'Horário sem disponibilidade (capacidade máxima atingida)' }
  }

  return { valid: true }
}
