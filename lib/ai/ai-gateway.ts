import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../db'
import { getPlanForBusiness } from '../plan'
import { AIRunInput, AIRunOutput, AIProviderConfig, AICapabilityHandler } from './types'
import { faqTriageCapability } from './capabilities/faq-triage'
import { whatsappTriageCapability } from './capabilities/whatsapp-triage'

const CAPABILITIES_MAP = {
  faq_triage: faqTriageCapability,
  whatsapp_triage: whatsappTriageCapability
} satisfies Record<string, AICapabilityHandler>

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
    const plan = await getPlanForBusiness(context.businessId)
    if (!plan || !plan.ai) {
      return {
        text: 'IA não disponível no seu plano atual.',
        confidence: 0,
        handoffToHuman: true
      }
    }

    const capabilityHandler = CAPABILITIES_MAP[capability as keyof typeof CAPABILITIES_MAP]
    if (!capabilityHandler) {
      throw new Error(`Capability desconhecida: ${capability}`)
    }

    const providerConfig = getProviderConfig()
    const promptForLog = capabilityHandler.buildUserPrompt(params, context)

    let output: AIRunOutput
    let costUsd: number | null = null

    if (providerConfig.type === 'anthropic') {
      try {
        const providerResult = await runWithAnthropic({
          config: providerConfig,
          systemPrompt: capabilityHandler.systemPrompt,
          userPrompt: promptForLog
        })
        output = providerResult.output
        costUsd = providerResult.costUsd ?? null
      } catch (providerError) {
        console.warn('[AI] Erro no provider, usando fallback rule-based:', providerError)
        output = await capabilityHandler.run(params, context)
      }
    } else {
      output = await capabilityHandler.run(params, context)
    }

    const latencyMs = Date.now() - startTime
    await logAiInsight({
      businessId: context.businessId,
      userId: context.userId,
      prompt: sanitizeForLog(promptForLog || JSON.stringify(params)),
      response: sanitizeForLog(output.text),
      latencyMs,
      costUsd
    })

    return output
  } catch (error) {
    const latencyMs = Date.now() - startTime
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido'

    await logAiInsight({
      businessId: context.businessId,
      userId: context.userId,
      prompt: `[ERROR] ${capability}`,
      response: `Erro: ${errorMsg}`,
      latencyMs,
      costUsd: null
    })

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
    console.error('[AI] Erro ao logar AiInsightLog:', error)
  }
}

function getProviderConfig(): AIProviderConfig {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (apiKey) {
    return {
      type: 'anthropic',
      apiKey,
      model: process.env.AI_MODEL,
      maxTokens: 240
    }
  }
  return { type: 'mock' }
}

async function runWithAnthropic(params: {
  config: AIProviderConfig
  systemPrompt: string
  userPrompt: string
}): Promise<{ output: AIRunOutput; costUsd?: number }> {
  const client = new Anthropic({ apiKey: params.config.apiKey || '' })
  const response = await client.messages.create({
    model: params.config.model || 'claude-3-5-sonnet-20241022',
    max_tokens: params.config.maxTokens || 240,
    temperature: 0.3,
    system: params.systemPrompt,
    messages: [
      {
        role: 'user',
        content: params.userPrompt
      }
    ]
  })

  const textPart = response.content.find((c) => c.type === 'text')
  const text = (textPart as { text?: string } | undefined)?.text || ''

  return {
    output: {
      text: text.trim() || 'Sem resposta no momento.',
      confidence: 0.6
    },
    costUsd: undefined
  }
}
