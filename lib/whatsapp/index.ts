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
export {
  getWhatsAppConfig,
  createWhatsAppConfig,
  updateWhatsAppConfig,
  deleteWhatsAppConfig,
  toggleWhatsAppConfig
} from './business-config'
export type { RenderedTemplate } from './template-resolver'
