import { AICapabilityHandler, AIRunOutput, AIContext } from '../types'

interface WhatsAppTriageParams {
  text: string
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
}

export const whatsappTriageCapability: AICapabilityHandler = {
  name: 'whatsapp_triage',
  systemPrompt:
    'Você responde como atendente de WhatsApp, em português, com mensagens curtas, claras e sem formatação especial. Ajude a entender a intenção e peça os mínimos dados para seguir.',
  buildUserPrompt: (params: Record<string, unknown>) => {
    const text = typeof params.text === 'string' ? params.text : ''
    return `Mensagem recebida no WhatsApp: "${text}"`
  },
  async run(
    params: Record<string, unknown>,
    context: AIContext
  ): Promise<AIRunOutput> {
    const text = typeof params.text === 'string' ? params.text : ''
    const conversationHistory = Array.isArray(params.conversationHistory) ? params.conversationHistory : []
    const lowerText = text.toLowerCase().trim()

    if (!lowerText) {
      return {
        text: '👋 Oi! Como posso ajudar?',
        confidence: 0,
        handoffToHuman: true
      }
    }

    // Detectar padrões simples de WhatsApp
    const patterns = [
      {
        test: (t: string) =>
          t.includes('oi') ||
          t.includes('olá') ||
          t.includes('e aí') ||
          t.includes('tudo bem'),
        response: '👋 Oi! Bem-vindo! Como posso ajudar você hoje?',
        intent: 'greeting'
      },
      {
        test: (t: string) => t.includes('obrigad') || t.includes('valeu'),
        response: '😊 De nada! Qualquer coisa, é só chamar.',
        intent: 'thanks'
      },
      {
        test: (t: string) =>
          t.includes('preço') ||
          t.includes('valor') ||
          t.includes('quanto custa'),
        response:
          'Nossos preços variam por serviço. Qual serviço você está interessado?',
        intent: 'pricing',
        handoff: false
      },
      {
        test: (t: string) =>
          t.includes('agendar') ||
          t.includes('agende') ||
          t.includes('marcar'),
        response:
          '📅 Ótimo! Qual serviço você deseja agendar? (Ex: Lavagem, Detalhamento, etc)',
        intent: 'scheduling',
        handoff: true
      },
      {
        test: (t: string) =>
          t.includes('horário') ||
          t.includes('funciona') ||
          t.includes('está aberto'),
        response: 'Funcionamos de seg-sab, das 08h às 18h. Posso ajudar em algo?',
        intent: 'hours',
        handoff: false
      },
      {
        test: (t: string) =>
          t.includes('cancelar') ||
          t.includes('remarca') ||
          t.includes('mover agendamento'),
        response:
          'Entendi. Para cancelar ou remarcar, preciso de mais infos. Qual é seu número de agendamento?',
        intent: 'rescheduling',
        handoff: true
      }
    ]

    // Procurar por match
    for (const pattern of patterns) {
      if (pattern.test(lowerText)) {
        return {
          text: pattern.response,
          confidence: 0.8,
          tags: [pattern.intent],
          intent: pattern.intent,
          handoffToHuman: pattern.handoff ?? false
        }
      }
    }

    // Fallback: resposta genérica
    return {
      text:
        'Entendi sua dúvida! Para melhor ajudar, você poderia ser mais específico? 😊',
      confidence: 0.3,
      tags: ['generic'],
      intent: 'unknown',
      handoffToHuman: true
    }
  }
}
