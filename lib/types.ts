// Tipos compartilhados da aplicação

// ========== MULTI-TENANT ==========
export interface Business {
  id: string
  name: string
  email: string
  phone?: string
  subscriptionPlan: 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE'
  subscriptionStatus: 'ACTIVE' | 'PAUSED' | 'CANCELED' | 'EXPIRED'
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface BusinessSettings {
  id: string
  businessId: string
  openingTimeWeekday: string
  closingTimeWeekday: string
  slotIntervalMinutes: number
  maxCarsPerSlot: number
  timezone: string
  reputationEnabled: boolean
  reputationAdvancePercent: number
  reputationMinForAdvance: number
  reputationNoShowPenalty: number
  reputationRecoveryOnShow: boolean
  notificationsEnabled: boolean
  notificationChannel: 'email' | 'sms' | 'whatsapp'
  notifyOn24hBefore: boolean
  notifyOn1hBefore: boolean
  packagesEnabled: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ServicePackage {
  id: string
  businessId: string
  name: string
  description?: string
  discountPercent: number
  isActive: boolean
  services?: Service[]
  createdAt: Date
  updatedAt: Date
}

export interface AppointmentCancellation {
  id: string
  appointmentId: string
  reason: string
  canceledBy: 'customer' | 'business'
  notes?: string
  createdAt: Date
}

export interface CustomerRating {
  id: string
  customerId: string
  rating: number
  comment?: string
  createdAt: Date
}

export interface NotificationTemplate {
  id: string
  businessId: string
  type: string
  title: string
  body: string
  isActive: boolean
}

// ========== ORIGINAL MODELS UPDATED FOR MULTI-TENANT ==========
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
  businessId: string
  name: string
  description: string | null
  durationMinutes: number
  price: number
  isActive: boolean
  serviceGroup?: string | null
  categoryId?: string | null
  category?: {
    id: string
    name: string
  } | null
}

export interface Category {
  id: string
  businessId: string
  name: string
  description?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Customer {
  id: string
  businessId: string
  name: string
  phone: string
  email?: string
  notes: string | null
  isAdmin: boolean
  rating: number
  completedCount: number
  noShowCount: number
  createdAt: Date
  updatedAt: Date
}

export interface Car {
  id: string
  businessId: string
  customerId: string
  plate: string
  model: string
  color: string | null
  year?: number | null
  vehicleType: 'HATCH' | 'SEDAN' | 'SUV' | 'PICKUP' | 'MOTO' | 'VAN'
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Appointment {
  id: string
  businessId: string
  customerId: string
  carId: string
  startDatetime: Date
  endDatetime: Date
  status: AppointmentStatus
  totalPrice: number
  notes: string | null
  businessNotes?: string | null
  suggestedDatetime?: Date | null
  confirmedByClientAt?: Date | null
  confirmedByBusinessAt?: Date | null
  customer: Customer
  car: Car
  appointmentServices: {
    id: string
    service: Service
    price: number
  }[]
  cancellation?: AppointmentCancellation | null
  createdAt: Date
  updatedAt: Date
}

export interface Settings {
  id: string
  openingTimeWeekday: string
  closingTimeWeekday: string
  slotIntervalMinutes: number
  maxCarsPerSlot: number
  timezone: string
}
