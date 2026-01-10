/**
 * WhatsApp Queue Consumer (Cron)
 * Processa mensagens pendentes da fila
 *
 * - Busca lote de PENDING
 * - Para cada: valida plan, determina janela 24h, gera resposta (IA ou template), envia
 * - Atualiza fila com SENT/FAILED + retry com backoff
 * - Respeita timeout do Vercel (~8-10s)
 *
 * Chamar via: POST /api/cron/process-whatsapp-queue?secret=CRON_SECRET
 * Ou configurar webhook do Vercel Cron
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getPlanForBusiness } from '@/lib/plan'
import { runAI } from '@/lib/ai'
import { sendTextMessage, sendTemplateMessage, renderFullTemplate, isWithin24hWindow } from '@/lib/whatsapp'

const BATCH_SIZE = 25
const TIMEOUT_MS = 9000 // 9s para Vercel
const RETRY_BACKOFF_MS = [60 * 1000, 5 * 60 * 1000, 15 * 60 * 1000] // 1m, 5m, 15m

// ============ GET & POST ============

export async function GET(request: NextRequest) {
  return handleCronRequest(request)
}

export async function POST(request: NextRequest) {
  return handleCronRequest(request)
}

async function handleCronRequest(request: NextRequest): Promise<NextResponse> {
  try {
    // Validar CRON_SECRET
    const secret = request.nextUrl.searchParams.get('secret') || request.headers.get('authorization')?.split(' ')[1]
    const expectedSecret = process.env.CRON_SECRET

    if (!expectedSecret || !secret || secret !== expectedSecret) {
      console.error('[CRON] Invalid or missing CRON_SECRET')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[CRON] Starting WhatsApp queue consumer')
    const startTime = Date.now()
    let processed = 0
    let errors = 0

    // Processar até timeout
    while (Date.now() - startTime < TIMEOUT_MS) {
      const messages = await prisma.whatsAppMessageQueue.findMany({
        where: { status: 'PENDING' },
        include: {
          conversation: true,
          business: {
            include: { plan: true }
          }
        },
        orderBy: { createdAt: 'asc' },
        take: BATCH_SIZE
      })

      if (messages.length === 0) {
        console.log('[CRON] No more pending messages')
        break
      }

      for (const message of messages) {
        if (Date.now() - startTime > TIMEOUT_MS) {
          console.log('[CRON] Approaching timeout, stopping')
          break
        }

        try {
          await processMessage(message)
          processed++
        } catch (error) {
          console.error(`[CRON] Error processing message ${message.id}:`, error)
          errors++
          // Continua com próxima mensagem
        }
      }

      // Se processou menos que BATCH_SIZE, saiu da fila
      if (messages.length < BATCH_SIZE) {
        break
      }
    }

    const elapsed = Date.now() - startTime
    console.log(
      `[CRON] Completed: processed=${processed}, errors=${errors}, elapsed=${elapsed}ms`
    )

    return NextResponse.json({
      success: true,
      processed,
      errors,
      elapsedMs: elapsed
    })
  } catch (error) {
    console.error('[CRON] Fatal error:', error)
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    )
  }
}

// ============ HELPERS ============

async function processMessage(message: any): Promise<void> {
  const messageId = message.id
  const businessId = message.businessId
  const conversation = message.conversation
  const business = message.business

  if (!conversation) {
    console.warn(`[CRON] Message ${messageId} has no conversation, marking as FAILED`)
    await updateQueueStatus(messageId, 'FAILED', 'No conversation found')
    return
  }

  // Validar feature flag
  const plan = await getPlanForBusiness(businessId)
  if (!plan || !plan.whatsapp) {
    console.warn(`[CRON] WhatsApp disabled for business ${businessId.substring(0, 8)}...`)
    await updateQueueStatus(messageId, 'SKIPPED', 'WhatsApp not enabled')
    return
  }

  // Determinar janela 24h
  const within24h = isWithin24hWindow(conversation.lastCustomerMessageAt)
  console.log(
    `[CRON] Message ${messageId.substring(0, 8)}... within24h=${within24h}`
  )

  let responseText: string
  let useTemplate = false

  if (within24h) {
    // Janela aberta: gerar resposta (IA ou fallback)
    if (plan.ai) {
      // Chamar IA
      const inboundMessage = await prisma.whatsAppInboundMessage.findFirst({
        where: { id: message.inboundMessageId || undefined }
      })
      const messageText = inboundMessage?.text || (message.payload as any)?.messageText || ''

      try {
        const aiOutput = await runAI({
          capability: 'whatsapp_triage',
          params: { text: messageText },
          context: {
            businessId,
            channel: 'whatsapp',
            customerId: conversation.customerId || undefined,
            correlationId: messageId
          }
        })
        responseText = aiOutput.text
        console.log(`[CRON] IA response: confidence=${aiOutput.confidence}`)
      } catch (error) {
        console.warn(`[CRON] IA error, using fallback:`, error)
        responseText = simpleFallbackResponse(
          (message.payload as any)?.messageText || ''
        )
      }
    } else {
      // Sem IA: fallback rule-based simples
      responseText = simpleFallbackResponse(
        (message.payload as any)?.messageText || ''
      )
    }
  } else {
    // Janela fechada: enviar template UTILITY
    useTemplate = true
    try {
      const template = await renderFullTemplate(
        'REOPEN_CONVERSATION_UTILITY',
        businessId,
        { customerName: (message.payload as any)?.customerName || 'Cliente' }
      )
      // Para MVP, enviar template renderizado como texto
      responseText = 'Olá, posso te ajudar a agendar um serviço? Responda esta mensagem para continuarmos.'
    } catch (error) {
      console.warn(`[CRON] Template error, using fallback:`, error)
      responseText = 'Olá! Como posso ajudar? 😊'
    }
  }

  // Enviar mensagem
  try {
    const sendResult = await sendTextMessage({
      to: message.phone,
      text: responseText
    })

    console.log(
      `[CRON] Message sent: ${sendResult.messageId} to ${message.phone}`
    )

    // Atualizar fila: SENT
    await prisma.whatsAppMessageQueue.update({
      where: { id: messageId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        error: null
      }
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[CRON] Failed to send message ${messageId}:`, errorMsg)

    // Atualizar fila: FAILED + retry com backoff
    const currentRetryCount = message.retryCount || 0
    const nextRetryAt = RETRY_BACKOFF_MS[currentRetryCount]
      ? new Date(Date.now() + RETRY_BACKOFF_MS[currentRetryCount])
      : null

    await prisma.whatsAppMessageQueue.update({
      where: { id: messageId },
      data: {
        status: currentRetryCount >= 2 ? 'FAILED' : 'PENDING',
        error: errorMsg,
        retryCount: currentRetryCount + 1,
        nextAttemptAt: nextRetryAt
      }
    })
  }
}

async function updateQueueStatus(
  messageId: string,
  status: string,
  error: string
): Promise<void> {
  await prisma.whatsAppMessageQueue.update({
    where: { id: messageId },
    data: {
      status: status as any,
      error
    }
  })
}

/**
 * Resposta fallback simples quando sem IA
 */
function simpleFallbackResponse(inboundText: string): string {
  const lower = inboundText.toLowerCase()

  // Pattern simples
  if (
    lower.includes('oi') ||
    lower.includes('olá') ||
    lower.includes('e aí')
  ) {
    return 'Oi! 👋 Como posso ajudar você hoje?'
  }

  if (
    lower.includes('preço') ||
    lower.includes('valor') ||
    lower.includes('quanto custa')
  ) {
    return 'Nossos preços variam conforme o serviço. Qual serviço você está interessado?'
  }

  if (
    lower.includes('agendar') ||
    lower.includes('agende') ||
    lower.includes('marcar')
  ) {
    return '📅 Ótimo! Qual serviço você deseja? (Ex: Lavagem, Detalhamento, Polimento)'
  }

  if (
    lower.includes('horário') ||
    lower.includes('funciona') ||
    lower.includes('aberto')
  ) {
    return 'Funcionamos de seg-sab, 8h às 18h. Como posso ajudar?'
  }

  return 'Entendi! Para melhor ajudar, pode detalhar um pouco mais? 😊'
}
