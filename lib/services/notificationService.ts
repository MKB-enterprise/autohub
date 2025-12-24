import { prisma } from '@/lib/db'
import { NotificationTemplateType } from '@prisma/client'

export interface NotificationOptions {
  businessId: string
  customerId?: string
  recipientEmail?: string
  recipientPhone?: string
  templateType: NotificationTemplateType
  variables?: Record<string, string>
}

// Variáveis disponíveis para templates:
// {customerName}, {appointmentDate}, {appointmentTime}, {serviceName}, {servicesList}, {businessName}

export async function sendNotification(options: NotificationOptions) {
  try {
    const {
      businessId,
      customerId,
      recipientEmail,
      recipientPhone,
      templateType,
      variables = {}
    } = options

    // Obter template de notificação
    const template = await prisma.notificationTemplate.findUnique({
      where: {
        businessId_type: {
          businessId,
          type: templateType
        }
      }
    })

    if (!template || !template.isActive) {
      console.log(`Template ${templateType} não configurado ou inativo`)
      return
    }

    // Obter configurações de negócio
    const settings = await prisma.businessSettings.findUnique({
      where: { businessId }
    })

    if (!settings?.notificationsEnabled) {
      console.log(`Notificações desabilitadas para business ${businessId}`)
      return
    }

    // Processar template com variáveis
    let body = template.body
    let title = template.title

    Object.entries(variables).forEach(([key, value]) => {
      body = body.replace(`{${key}}`, value)
      title = title.replace(`{${key}}`, value)
    })

    const channel = settings.notificationChannel
    let recipient = recipientEmail

    if (channel === 'sms' || channel === 'whatsapp') {
      recipient = recipientPhone
    }

    if (!recipient) {
      console.error('Nenhum destinatário especificado')
      return
    }

    // Registrar log de notificação
    await prisma.notificationLog.create({
      data: {
        businessId,
        customerId,
        type: templateType,
        channel,
        recipient,
        subject: title,
        body,
        status: 'pending'
      }
    })

    // Aqui você integraria com serviços reais
    // await sendEmailViaProvider(recipient, title, body)
    // await sendSmsViaProvider(recipient, body)
    // await sendWhatsappViaProvider(recipient, body)

    console.log(`Notificação ${channel} enviada para ${recipient}`)

    // Atualizar status
    await prisma.notificationLog.updateMany({
      where: {
        businessId,
        customerId,
        type: templateType,
        status: 'pending'
      },
      data: {
        status: 'sent'
      }
    })
  } catch (error) {
    console.error('Erro ao enviar notificação:', error)
    throw error
  }
}

export async function getNotificationTemplates(businessId: string) {
  return prisma.notificationTemplate.findMany({
    where: { businessId },
    orderBy: { type: 'asc' }
  })
}

export async function updateNotificationTemplate(
  businessId: string,
  type: NotificationTemplateType,
  data: { title: string; body: string; isActive: boolean }
) {
  return prisma.notificationTemplate.upsert({
    where: {
      businessId_type: { businessId, type }
    },
    create: {
      businessId,
      type,
      ...data
    },
    update: data
  })
}

export async function getNotificationLogs(businessId: string, limit = 50) {
  return prisma.notificationLog.findMany({
    where: { businessId },
    orderBy: { sentAt: 'desc' },
    take: limit
  })
}
