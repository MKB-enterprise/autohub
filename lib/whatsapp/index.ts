/**
 * WhatsApp Module - Índice
 */

export { sendTextMessage, sendTemplateMessage } from './client'
export { isWithin24hWindow, hoursUntilWindowExpires } from './window'
export {
  resolveTemplateId,
  renderTemplateVariables,
  renderFullTemplate
} from './template-resolver'
export type { RenderedTemplate } from './template-resolver'
