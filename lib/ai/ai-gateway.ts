/**
 * AI Gateway
 * Orquestra chamadas de IA com validações, logs e fallbacks
 */

import { prisma } from '../db'
import { AIRunInput, AIRunOutput, AIProviderConfig } from './types'
import { faqTriageCapability } from './capabilities/faq-triage'
import { whatsappTriageCapability } from './capabilities/whatsapp-triage'

const CAPABILITIES_MAP = {
  faq_triage: faqTriageCapability,
  whatsapp_triage: whatsappTriageCapability
}

/**
 * Roda uma capability de IA
 * 1. Valida feature flag (Plan.aiEnabled)
 * 2. Chama capability apropriada
 * 3. Loga em AiInsightLog
 * 4. Retorna output
 */
export async function runAI(input: AIRunInput): Promise<AIRunOutput> {
  const { capability, params, context } = input
  const startTime = Date.now()

  try {
    // 1. Buscar business + plan para validar feature flag
    const business = await prisma.business.findUnique({
      where: { id: context.businessId },
      select: {
        id: true,
        plan: {
          select: {
            id: true,
            aiEnabled: true
          }
        }
      }
    })

    if (!business) {
      throw new Error(`Business não encontrado: ${context.businessId}`)
    }

    // Feature flag check
    const aiEnabled = business.plan?.aiEnabled ?? false
    if (!aiEnabled) {
      // IA desabilitada no plano - retornar fallback rule-based
      console.log(
        `[AI] IA desabilitada para business ${context.businessId}. Usando fallback.`
      )
      return {
        text: 'Desculpe, este recurso não está disponível no seu plano.',
        confidence: 0
      }
    }

    // 2. Executar capability
    const capabilityHandler = CAPABILITIES_MAP[capability as keyof typeof CAPABILITIES_MAP]
    if (!capabilityHandler) {
      throw new Error(`Capability desconhecida: ${capability}`)
    }

    const output = await capabilityHandler.run(params, context)
    const latencyMs = Date.now() - startTime

    // 3. Logar em AiInsightLog
    // Sanitizar prompt/response para não vazar PII
    const sanitizedPrompt = sanitizeForLog(JSON.stringify(params))
    const sanitizedResponse = sanitizeForLog(output.text)

    await logAiInsight({
      businessId: context.businessId,
      userId: context.userId,
      prompt: sanitizedPrompt,
      response: sanitizedResponse,
      latencyMs,
      costUsd: null // MVP: sem custo de IA (rule-based)
    })

    console.log(
      `[AI] ${capability} executado. latency=${latencyMs}ms, confidence=${output.confidence}`
    )

    return output
  } catch (error) {
    const latencyMs = Date.now() - startTime
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido'

    console.error(`[AI] Erro em ${capability}:`, errorMsg)

    // Logar erro
    await logAiInsight({
      businessId: context.businessId,
      userId: context.userId,
      prompt: `[ERROR] ${capability}`,
      response: `Erro: ${errorMsg}`,
      latencyMs,
      costUsd: null
    })

    // Retornar resposta segura
    return {
      text: 'Desculpe, ocorreu um erro. Tente novamente.',
      confidence: 0,
      handoffToHuman: true
    }
  }
}

/**
 * Sanitiza log para não vazar PII
 */
function sanitizeForLog(text: string): string {
  // Remover emails, telefones, CPF
  return text
    .replace(/[\w.-]+@[\w.-]+\.\w+/g, '[email]')
    .replace(/\(\d{2}\)\s?\d{4,5}-?\d{4}/g, '[phone]')
    .replace(/\d{3}\.\d{3}\.\d{3}-\d{2}/g, '[cpf]')
}

/**
 * Loga insight de IA em BD
 */
async function logAiInsight(data: {
  businessId: string
  userId?: string
  prompt: string
  response: string
  latencyMs: number
  costUsd: number | null
}): Promise<void> {
  try {
    await prisma.aiInsightLog.create({
      data: {
        businessId: data.businessId,
        userId: data.userId,
        prompt: data.prompt,
        response: data.response,
        latencyMs: data.latencyMs,
        costUsd: data.costUsd
      }
    })
  } catch (error) {
    // Não falhar a requisição se logging falhar
    console.error('[AI] Erro ao logar AiInsightLog:', error)
  }
}
