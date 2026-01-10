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

  const components = []

  // MVP: hardcodear templates, depois via BD
  if (templateKey === 'REOPEN_CONVERSATION_UTILITY') {
    const bodyText = 'Olá, posso te ajudar a agendar um serviço? Responda esta mensagem para continuarmos.'
    components.push({
      type: 'body',
      parameters: [
        {
          type: 'text',
          text: variables ? renderTemplateVariables(bodyText, variables) : bodyText
        }
      ]
    })
  }

  return {
    templateNameOrId: templateId,
    language: 'pt_BR',
    components: components.length > 0 ? components : undefined
  }
}
