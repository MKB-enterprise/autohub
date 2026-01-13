/**
 * Helper para gerenciar WhatsApp Business Config
 * Facilita CRUD de configurações por business
 */

import { prisma } from '@/lib/db'

export async function getWhatsAppConfig(businessId: string) {
  return prisma.whatsAppBusinessConfig.findUnique({
    where: { businessId }
  })
}

export async function createWhatsAppConfig(
  businessId: string,
  phoneNumberId: string,
  accessToken: string,
  displayName?: string,
  appSecret?: string
) {
  return prisma.whatsAppBusinessConfig.create({
    data: {
      businessId,
      phoneNumberId,
      accessToken,
      displayName,
      appSecret,
      isActive: true
    }
  })
}

export async function updateWhatsAppConfig(
  businessId: string,
  data: {
    phoneNumberId?: string
    accessToken?: string
    displayName?: string
    appSecret?: string
    isActive?: boolean
  }
) {
  return prisma.whatsAppBusinessConfig.update({
    where: { businessId },
    data
  })
}

export async function deleteWhatsAppConfig(businessId: string) {
  return prisma.whatsAppBusinessConfig.delete({
    where: { businessId }
  })
}

export async function toggleWhatsAppConfig(businessId: string) {
  const config = await getWhatsAppConfig(businessId)
  if (!config) throw new Error('WhatsApp config not found')
  
  return updateWhatsAppConfig(businessId, {
    isActive: !config.isActive
  })
}
