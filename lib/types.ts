// Tipos compartilhados da aplicação

export type AppointmentStatus = 
  | 'PENDING'
  | 'CONFIRMED_BY_CLIENT'
  | 'CONFIRMED'
  | 'RESCHEDULED' 
  | 'IN_PROGRESS' 
  | 'COMPLETED' 
  | 'CANCELED' 
  | 'NO_SHOW'

export interface Service {
  id: string
  name: string
  description: string | null
  durationMinutes: number
  price: number
  isActive: boolean
}

export interface Customer {
  id: string
  name: string
  phone: string
  notes: string | null
}

export interface Car {
  id: string
  customerId: string
  plate: string
  model: string
  color: string | null
  notes: string | null
}

export interface Appointment {
  id: string
  customerId: string
  carId: string
  startDatetime: Date
  endDatetime: Date
  status: AppointmentStatus
  totalPrice: number
  notes: string | null
  customer: Customer
  car: Car
  appointmentServices: {
    id: string
    service: Service
    price: number
  }[]
}

export interface Settings {
  id: string
  openingTimeWeekday: string
  closingTimeWeekday: string
  slotIntervalMinutes: number
  maxCarsPerSlot: number
  timezone: string
}
