export type AICapability = 'faq_triage' | 'whatsapp_triage'

export interface AIContext {
  businessId: string
  businessSlug?: string
  channel: string
  userId?: string
  customerId?: string
  correlationId?: string
}

export interface AIRunInput {
  capability: AICapability
  params: Record<string, unknown>
  context: AIContext
}

export interface AIRunOutput {
  text: string
  confidence?: number
  tags?: string[]
  handoffToHuman?: boolean
  intent?: string
  meta?: Record<string, unknown>
}

export interface AICapabilityHandler {
  name: AICapability
  systemPrompt: string
  buildUserPrompt: (params: Record<string, unknown>, context: AIContext) => string
  run(params: Record<string, unknown>, context: AIContext): Promise<AIRunOutput>
}

export type AIProviderType = 'anthropic' | 'mock'

export interface AIProviderConfig {
  type: AIProviderType
  apiKey?: string
  model?: string
  maxTokens?: number
}
