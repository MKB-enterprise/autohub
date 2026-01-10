/**
 * WhatsApp Webhook Inbound
 * - GET: Verificação Meta (hub.challenge)
 * - POST: Receber mensagens, validar, persister, enfileirar
 *
 * Não chama IA aqui! Apenas enfileira tarefa para cron processar.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'
import { prisma } from '@/lib/db'

// ============ SCHEMAS ZOD ============

const WebhookVerificationSchema = z.object({
  'hub.mode': z.string(),
  'hub.challenge': z.string(),
  'hub.verify_token': z.string()
})

const WhatsAppInboundMessageSchema = z.object({
  from: z.string(),
  type: z.literal('text'),
  text: z.object({
    body: z.string()
  })
})

const WhatsAppContactSchema = z.object({
  wa_id: z.string(),
  profile: z.object({
    name: z.string()
  })
})

const WhatsAppMessageValueSchema = z.object({
  messaging_product: z.string(),
  metadata: z.object({
    display_phone_number: z.string(),
    phone_number_id: z.string()
  }),
  contacts: z.array(WhatsAppContactSchema).optional(),
  messages: z.array(WhatsAppInboundMessageSchema).optional()
})

const WebhookPayloadSchema = z.object({
  object: z.string(),
  entry: z.array(
    z.object({
      id: z.string(),
      changes: z.array(
        z.object({
          value: WhatsAppMessageValueSchema
        })
      )
    })
  )
})

// ============ GET: Verificação ============

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const mode = searchParams.get('hub.mode')
    const challenge = searchParams.get('hub.challenge')
    const verifyToken = searchParams.get('hub.verify_token')

    const validation = WebhookVerificationSchema.safeParse({
      'hub.mode': mode,
      'hub.challenge': challenge,
      'hub.verify_token': verifyToken
    })

    if (!validation.success) {
      console.error('[WA WEBHOOK] Invalid verification params:', validation.error)
      return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
    }

    const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN
    if (!expectedToken || verifyToken !== expectedToken) {
      console.error('[WA WEBHOOK] Invalid verify token')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (mode !== 'subscribe') {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 })
    }

    console.log('[WA WEBHOOK] Verification successful')
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    })
  } catch (error) {
    console.error('[WA WEBHOOK] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============ POST: Process Inbound ============

export async function POST(request: NextRequest) {
  try {
    // 1. Validar assinatura (opcional mas recomendado)
    const signature = request.headers.get('x-hub-signature-256')
    if (signature) {
      const body = await request.text()
      if (!verifyWebhookSignature(body, signature)) {
        console.error('[WA WEBHOOK] Invalid signature')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      // Re-parse após consumir stream
      const payload = JSON.parse(body)
      await processWebhookPayload(payload)
      return NextResponse.json({ status: 'ok' }, { status: 200 })
    }

    // Se não há signature check, apenas parse
    const payload = await request.json()
    await processWebhookPayload(payload)

    return NextResponse.json({ status: 'ok' }, { status: 200 })
  } catch (error) {
    console.error('[WA WEBHOOK] POST error:', error)
    // Sempre retorna 200 para Meta não retentar indefinidamente
    return NextResponse.json({ status: 'ok' }, { status: 200 })
  }
}

// ============ HELPERS ============

function verifyWebhookSignature(body: string, signature: string): boolean {
  const secret = process.env.META_WA_APP_SECRET
  if (!secret) {
    console.warn('[WA WEBHOOK] No APP_SECRET configured, skipping signature check')
    return true
  }

  const hash = crypto.createHmac('sha256', secret).update(body).digest('hex')
  const expectedSignature = `sha256=${hash}`
  return signature === expectedSignature
}

async function processWebhookPayload(rawPayload: unknown): Promise<void> {
  const payloadValidation = WebhookPayloadSchema.safeParse(rawPayload)

  if (!payloadValidation.success) {
    console.error('[WA WEBHOOK] Invalid payload:', payloadValidation.error)
    return
  }

  const payload = payloadValidation.data

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      const { metadata, messages, contacts } = change.value

      if (!messages || messages.length === 0) {
        continue
      }

      const phoneNumberId = metadata.phone_number_id
      const displayPhone = metadata.display_phone_number

      // 2. Resolver business a partir de phone_number_id
      // MVP: usar env var global ou mapping simples
      const business = await resolveBusinessByPhoneNumberId(phoneNumberId)
      if (!business) {
        console.warn(
          `[WA WEBHOOK] No business found for phone_number_id: ${phoneNumberId}`
        )
        continue
      }

      // Processar cada mensagem
      for (const message of messages) {
        try {
          await processInboundMessage({
            businessId: business.id,
            phoneNumberId,
            displayPhone,
            message,
            contacts: contacts || []
          })
        } catch (error) {
          console.error('[WA WEBHOOK] Error processing message:', error)
        }
      }
    }
  }
}

async function processInboundMessage(params: {
  businessId: string
  phoneNumberId: string
  displayPhone: string
  message: z.infer<typeof WhatsAppInboundMessageSchema>
  contacts: z.infer<typeof WhatsAppContactSchema>[]
}): Promise<void> {
  const { businessId, message, contacts } = params
  const fromPhone = message.from
  const messageText = message.text.body

  console.log(
    `[WA WEBHOOK] Inbound from ${fromPhone} for business ${businessId.substring(0, 8)}...`
  )

  // 3. Criar/atualizar conversation
  const now = new Date()
  const customerName = contacts[0]?.profile?.name || `+${fromPhone}`

  let conversation = await prisma.whatsAppConversation.findUnique({
    where: {
      businessId_customerPhone: {
        businessId,
        customerPhone: fromPhone
      }
    }
  })

  if (!conversation) {
    conversation = await prisma.whatsAppConversation.create({
      data: {
        businessId,
        customerPhone: fromPhone,
        lastCustomerMessageAt: now,
        stateJson: {},
        status: 'ACTIVE'
      }
    })
    console.log(`[WA WEBHOOK] Created conversation ${conversation.id}`)
  } else {
    // Atualizar lastCustomerMessageAt
    await prisma.whatsAppConversation.update({
      where: { id: conversation.id },
      data: { lastCustomerMessageAt: now }
    })
    console.log(`[WA WEBHOOK] Updated conversation ${conversation.id}`)
  }

  // 4. Persistir inbound message
  const inboundMessage = await prisma.whatsAppInboundMessage.create({
    data: {
      businessId,
      conversationId: conversation.id,
      fromPhone,
      text: messageText,
      receivedAt: now,
      rawJson: params.message
    }
  })
  console.log(`[WA WEBHOOK] Persisted inbound message ${inboundMessage.id}`)

  // 5. Enfileirar tarefa de resposta
  await prisma.whatsAppMessageQueue.create({
    data: {
      businessId,
      phone: fromPhone,
      templateKey: 'WHATSAPP_TRIAGE_RESPONSE', // marcador para cron saber que deve processar
      conversationId: conversation.id,
      inboundMessageId: inboundMessage.id,
      payload: {
        messageText,
        customerName,
        channel: 'whatsapp'
      },
      status: 'PENDING'
    }
  })
  console.log(`[WA WEBHOOK] Enqueued response task for conversation ${conversation.id}`)
}

/**
 * Resolve business pelo phone_number_id
 * MVP: usar global env var ou criar tabela BusinessWhatsAppConfig
 * Por enquanto, um fallback simples: env var única
 */
async function resolveBusinessByPhoneNumberId(
  phoneNumberId: string
): Promise<{ id: string } | null> {
  // MVP: buscar em env var global
  const globalPhoneNumberId = process.env.META_WA_PHONE_NUMBER_ID
  if (globalPhoneNumberId === phoneNumberId) {
    // Se temos um auth_token ou uma config, usar business default
    // Para MVP, assumimos tenant default ou tentar resolver via config
    const business = await prisma.business.findFirst({
      where: {
        isActive: true,
        slug: process.env.DEFAULT_BUSINESS_SLUG || 'default'
      },
      select: { id: true }
    })
    if (business) return business
  }

  // Se futuramente tiver tabela BusinessWhatsAppConfig:
  // const config = await prisma.businessWhatsAppConfig.findUnique({
  //   where: { phoneNumberId },
  //   select: { businessId: true }
  // })
  // return config ? { id: config.businessId } : null

  // Fallback: retorna null
  return null
}
