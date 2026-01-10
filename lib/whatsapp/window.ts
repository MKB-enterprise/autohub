/**
 * 24h Window Detector
 * Valida se cliente enviou mensagem nos últimos 24h
 */

/**
 * Determina se estamos dentro da janela de 24h
 * Se dentro: pode enviar texto livre
 * Se fora: só pode enviar template UTILITY
 */
export function isWithin24hWindow(
  lastCustomerMessageAt: Date | null,
  now: Date = new Date()
): boolean {
  if (!lastCustomerMessageAt) {
    return false // Sem histórico, fora da janela
  }

  const diffMs = now.getTime() - lastCustomerMessageAt.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)

  return diffHours < 24
}

/**
 * Retorna quantas horas faltam para sair da janela
 */
export function hoursUntilWindowExpires(lastCustomerMessageAt: Date): number {
  const now = new Date()
  const diffMs = now.getTime() - lastCustomerMessageAt.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  return Math.max(0, 24 - diffHours)
}
