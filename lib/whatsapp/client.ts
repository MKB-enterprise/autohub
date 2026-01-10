/**
 * WhatsApp Cloud API Client
 * Funções para enviar mensagens via Meta WhatsApp Cloud API
 */

import { z } from 'zod'

// Schemas de validação para payloads
export const SendTextMessageSchema = z.object({
  to: z.string().regex(/^\d+$/, 'Phone must be digits only'),
  text: z.string().min(1).max(4096)
})

export const WhatsAppComponentSchema = z.object({
  type: z.enum(['body', 'header']),
  parameters: z.array(
    z.object({
      type: z.string(),
      text: z.string().optional()
    })
  )
})

export const SendTemplateMessageSchema = z.object({
  to: z.string().regex(/^\d+$/, 'Phone must be digits only'),
  templateNameOrId: z.string().min(1),
  language: z.string().default('pt_BR'),
  components: z.array(WhatsAppComponentSchema).optional()
})

type SendTextMessageInput = z.infer<typeof SendTextMessageSchema>
type SendTemplateMessageInput = z.infer<typeof SendTemplateMessageSchema>

/**
 * Envia mensagem de texto via Cloud API
 */
export async function sendTextMessage(input: SendTextMessageInput): Promise<{
  messageId: string
  status: string
}> {
  const validated = SendTextMessageSchema.parse(input)

  const {
    META_WA_ACCESS_TOKEN,
    META_WA_PHONE_NUMBER_ID,
    WHATSAPP_API_VERSION = 'v19.0'
  } = process.env

  if (!META_WA_ACCESS_TOKEN || !META_WA_PHONE_NUMBER_ID) {
    throw new Error('WhatsApp Cloud API credentials not configured')
  }

  const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${META_WA_PHONE_NUMBER_ID}/messages`

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: validated.to,
    type: 'text',
    text: {
      preview_url: false,
      body: validated.text
    }
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${META_WA_ACCESS_TOKEN}`
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(
        `Meta API error: ${response.status} - ${JSON.stringify(errorData)}`
      )
    }

    const data = await response.json() as { messages?: Array<{ id: string }> }
    const messageId = data.messages?.[0]?.id || 'unknown'

    return {
      messageId,
      status: 'sent'
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to send text message: ${errorMsg}`)
  }
}

/**
 * Envia mensagem com template via Cloud API
 */
export async function sendTemplateMessage(
  input: SendTemplateMessageInput
): Promise<{
  messageId: string
  status: string
}> {
  const validated = SendTemplateMessageSchema.parse(input)

  const {
    META_WA_ACCESS_TOKEN,
    META_WA_PHONE_NUMBER_ID,
    WHATSAPP_API_VERSION = 'v19.0'
  } = process.env

  if (!META_WA_ACCESS_TOKEN || !META_WA_PHONE_NUMBER_ID) {
    throw new Error('WhatsApp Cloud API credentials not configured')
  }

  const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${META_WA_PHONE_NUMBER_ID}/messages`

  const payload = {
    messaging_product: 'whatsapp',
    to: validated.to,
    type: 'template',
    template: {
      name: validated.templateNameOrId,
      language: {
        code: validated.language
      },
      ...(validated.components && { components: validated.components })
    }
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${META_WA_ACCESS_TOKEN}`
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(
        `Meta API error: ${response.status} - ${JSON.stringify(errorData)}`
      )
    }

    const data = await response.json() as { messages?: Array<{ id: string }> }
    const messageId = data.messages?.[0]?.id || 'unknown'

    return {
      messageId,
      status: 'sent'
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to send template message: ${errorMsg}`)
  }
}
