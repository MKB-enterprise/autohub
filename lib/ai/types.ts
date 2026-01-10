/**
 * AI Core Types
 * Define interfaces e tipos para o sistema de IA
 */

export interface AIContext {
  businessId: string
  businessSlug?: string
  channel: 'whatsapp' | 'web' | 'api'
  userId?: string
  customerId?: string
  correlationId: string
}

export interface AIRunInput {
  capability: 'faq_triage' | 'whatsapp_triage'
  params: Record<string, unknown>
  context: AIContext
}

export interface AIRunOutput {
  text: string
  confidence?: number // 0-1
  tags?: string[]
  handoffToHuman?: boolean
  intent?: string
}

export interface AICapabilityHandler {
  run(params: Record<string, unknown>, context: AIContext): Promise<AIRunOutput>
}

export type AIProviderType = 'anthropic' | 'mock'

export interface AIProviderConfig {
  type: AIProviderType
  apiKey?: string
  model?: string
  maxTokens?: number
}
