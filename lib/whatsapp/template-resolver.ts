/**
 * Template Resolver
 * Mapeia templateKey -> templateId (Meta aprovado)
 * Renderiza variáveis de forma segura
 */

import { z } from 'zod'
import { prisma } from '../db'

// Schema de template renderizado
export const RenderedTemplateSchema = z.object({
  templateNameOrId: z.string(),
  language: z.string(),
  components: z
    .array(
      z.object({
        type: z.enum(['body', 'header']),
        parameters: z.array(
          z.object({
            type: z.string(),
            text: z.string().optional()
          })
        )
      })
    )
    .optional()
})

export type RenderedTemplate = z.infer<typeof RenderedTemplateSchema>

/**
 * Configuração de templates
 * NOTA MVP: usar env vars como fallback, depois tabela BD
 */
const TEMPLATE_ID_MAP: Record<string, string> = {
  APPOINTMENT_CONFIRMATION_UTILITY: process.env.WA_TEMPLATE_APPOINTMENT_CONFIRMATION || 'appointment_confirmation',
  APPOINTMENT_REMINDER_UTILITY: process.env.WA_TEMPLATE_APPOINTMENT_REMINDER || 'appointment_reminder',
  REOPEN_CONVERSATION_UTILITY:
    process.env.WA_TEMPLATE_REOPEN_CONVERSATION || 'reopen_conversation'
}

/**
 * Obtém template ID a partir do templateKey
 */
export async function resolveTemplateId(
  templateKey: string,
  businessId: string
): Promise<string> {
  // MVP: primeiro tenta env/map, depois BD
  if (TEMPLATE_ID_MAP[templateKey]) {
    return TEMPLATE_ID_MAP[templateKey]
  }

  // Se quiser, pode buscar em BD
  const template = await prisma.notificationTemplate.findFirst({
    where: {
      businessId,
      // Mapear type enum para templateKey se necessário
    }
  })

  if (!template) {
    throw new Error(`Template não encontrado: ${templateKey}`)
  }

  // Aqui você pode adicionar campo templateId na BD
  // return template.templateId || template.type
  return templateKey
}

/**
 * Renderiza variáveis em texto de template
 * Escape simples contra XSS (mesmo que não aplicável em WhatsApp, é prática)
 */
export function renderTemplateVariables(
  template: string,
  variables: Record<string, string>
): string {
  let result = template

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{${key}}`
    const escapedValue = value.replace(/[&<>"']/g, (char) => {
      const escapeMap: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }
      return escapeMap[char] || char
    })
    result = result.replaceAll(placeholder, escapedValue)
  }

  return result
}

/**
 * Renderiza template completo com componentes
 * Suporta body e header com variáveis
 */
export async function renderFullTemplate(
  templateKey: string,
  businessId: string,
  variables?: Record<string, string>
): Promise<RenderedTemplate> {
  const templateId = await resolveTemplateId(templateKey, businessId)

  const components: Array<{ type: 'body' | 'header'; parameters: Array<{ type: string; text?: string }> }> = []

  // MVP: hardcodear templates, depois via BD
  // Cada template tem seu body text pré-definido na Meta
  switch (templateKey) {
    case 'APPOINTMENT_CONFIRMATION_UTILITY': {
      // Meta template: appointment_confirmation_utility
      // Variables: {{1}} = customerName, {{2}} = serviceName, {{3}} = datetime
      const bodyText = 'Olá {customerName}, seu agendamento foi confirmado!\n\nServiço: {serviceName}\nData e Hora: {appointmentDateTime}\n\nQualquer dúvida, responda esta mensagem.'
      components.push({
        type: 'body',
        parameters: [
          {
            type: 'text',
            text: variables ? renderTemplateVariables(bodyText, variables) : bodyText
          }
        ]
      })
      break
    }
    case 'APPOINTMENT_REMINDER_UTILITY': {
      // Meta template: appointment_reminder_utility
      // Variables: {{1}} = customerName, {{2}} = serviceName, {{3}} = datetime
      const bodyText = 'Olá {customerName}, você tem um agendamento em 24h!\n\nServiço: {serviceName}\nData e Hora: {appointmentDateTime}\n\nConfirme respondendo esta mensagem.'
      components.push({
        type: 'body',
        parameters: [
          {
            type: 'text',
            text: variables ? renderTemplateVariables(bodyText, variables) : bodyText
          }
        ]
      })
      break
    }
    case 'REOPEN_CONVERSATION_UTILITY': {
      // Meta template: reopen_conversation_utility
      // Variables: {{1}} = customerName (optional)
      const bodyText = 'Olá {customerName}, posso te ajudar a agendar um serviço?\n\nResponda esta mensagem para continuarmos! 😊'
      components.push({
        type: 'body',
        parameters: [
          {
            type: 'text',
            text: variables ? renderTemplateVariables(bodyText, variables) : bodyText
          }
        ]
      })
      break
    }
    default:
      throw new Error(`Template desconhecido: ${templateKey}`)
  }

  return {
    templateNameOrId: templateId,
    language: 'pt_BR',
    components: components.length > 0 ? components : undefined
  }
}
