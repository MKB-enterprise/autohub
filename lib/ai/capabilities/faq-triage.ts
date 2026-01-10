import { AICapabilityHandler, AIRunOutput, AIContext } from '../types'

interface FaqTriageParams {
  text: string
  language?: string
}

const FAQ_INTENTS = [
  { keyword: ['preço', 'valor', 'custa', 'quanto'], intent: 'pricing', tag: 'pricing' },
  { keyword: ['duração', 'tempo', 'demora', 'quanto tempo'], intent: 'duration', tag: 'duration' },
  { keyword: ['endereço', 'localização', 'onde', 'fica'], intent: 'location', tag: 'location' },
  { keyword: ['horário', 'funciona', 'abre', 'fecha', 'atende'], intent: 'hours', tag: 'hours' },
  { keyword: ['cancelamento', 'remarcar', 'agendar'], intent: 'scheduling', tag: 'scheduling' },
  { keyword: ['atraso', 'atrasa', 'chegar', 'demora'], intent: 'policy', tag: 'policy' },
  { keyword: ['como funciona', 'como agendar', 'processo'], intent: 'process', tag: 'process' }
]

export const faqTriageCapability: AICapabilityHandler = {
  name: 'faq_triage',
  systemPrompt:
    'Você é um assistente conciso que responde dúvidas rápidas sobre serviços automotivos. Respostas curtas, diretas, estilo WhatsApp, em português do Brasil.',
  buildUserPrompt: (params: Record<string, unknown>) => {
    const text = typeof params.text === 'string' ? params.text : ''
    return `Pergunta do cliente: "${text}"`
  },
  async run(params: Record<string, unknown>, context: AIContext): Promise<AIRunOutput> {
    const { text = '' } = params as FaqTriageParams
    const lowerText = text.toLowerCase().trim()

    if (!lowerText) {
      return {
        text: 'Desculpe, não entendi. Pode detalhar melhor o que precisa?',
        confidence: 0,
        handoffToHuman: true
      }
    }

    // Simples pattern matching rule-based (MVP)
    let bestMatch = null
    let bestScore = 0

    for (const faq of FAQ_INTENTS) {
      for (const kw of faq.keyword) {
        if (lowerText.includes(kw)) {
          bestMatch = faq
          bestScore = Math.max(bestScore, 0.7)
          break
        }
      }
    }

    if (!bestMatch) {
      // Intenção genérica
      return {
        text: 'Entendi sua dúvida. Para melhor ajudar, pode me dizer o que especificamente deseja?',
        confidence: 0.3,
        tags: ['generic'],
        handoffToHuman: true,
        intent: 'unknown'
      }
    }

    // Resposta baseada em intenção
    const responseMap: Record<string, string> = {
      pricing: 'Para informações de preços, consulte nossos serviços no app ou converse com nosso atendimento.',
      duration: 'A duração varia conforme o serviço. Qual serviço você está interessado?',
      location: 'Estamos localizados em um endereço fixo. Para mais detalhes, envie sua localização ou converse com o atendimento.',
      hours: 'Nossos horários de funcionamento são de segunda a sábado. Confira nossos detalhes no app.',
      scheduling: 'Adoraríamos te ajudar com agendamento! Qual serviço e data você prefere?',
      policy: 'Temos uma política de atraso. Converse com nosso atendimento para detalhes.',
      process: 'Você pode agendar diretamente pelo app ou conversando conosco agora!'
    }

    return {
      text: responseMap[bestMatch.intent] || 'Como posso ajudar?',
      confidence: bestScore,
      tags: [bestMatch.tag],
      intent: bestMatch.intent,
      handoffToHuman: ['scheduling'].includes(bestMatch.intent)
    }
  }
}
