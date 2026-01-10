# WhatsApp Cloud API Templates Setup

**Status:** Phase 5 - Templates & 24h Window  
**Date:** January 10, 2026

---

## Overview

WhatsApp Cloud API requires pre-approved message templates for sending messages **outside the 24-hour customer response window**. This guide documents how to set up and use templates in the AutoHub system.

### Key Concepts

1. **24h Window**: If a customer sent a message within the last 24 hours, you can send free-form text.
2. **Outside 24h**: You MUST use a pre-approved UTILITY template to reopen conversation.
3. **Template Approval**: Templates are created and approved in Meta Business Manager, not in our app.
4. **Our Role**: We map template IDs to template keys and render variables.

---

## 1. Create Templates in Meta Business Manager

### Steps

1. Go to **Meta Business Manager** → **Apps** → Your WhatsApp Business App
2. Click **Message Templates** or **Business Account Settings** → **Message Templates**
3. Create new template with:
   - **Category**: UTILITY (required for 24h window outside messages)
   - **Language**: Portuguese (pt_BR)
   - **Approval Queue**: Submit for approval (typically 2-24 hours)

### Required Templates for MVP

Create these 3 templates in Meta:

#### Template 1: APPOINTMENT_CONFIRMATION_UTILITY
- **Name** (in Meta): `appointment_confirmation` or `appointment_confirmation_utility`
- **Category**: UTILITY
- **Body**: 
  ```
  Olá {{1}}, seu agendamento foi confirmado!

  Serviço: {{2}}
  Data e Hora: {{3}}

  Qualquer dúvida, responda esta mensagem.
  ```
- **Variables**: {{1}} = customerName, {{2}} = serviceName, {{3}} = datetime
- **Once Approved**, Meta will return a **Template Name** (e.g., `appointment_confirmation_utility`)

#### Template 2: APPOINTMENT_REMINDER_UTILITY
- **Name** (in Meta): `appointment_reminder` or `appointment_reminder_utility`
- **Category**: UTILITY
- **Body**:
  ```
  Olá {{1}}, você tem um agendamento em 24h!

  Serviço: {{2}}
  Data e Hora: {{3}}

  Confirme respondendo esta mensagem.
  ```

#### Template 3: REOPEN_CONVERSATION_UTILITY
- **Name** (in Meta): `reopen_conversation` or `reopen_conversation_utility`
- **Category**: UTILITY
- **Body**:
  ```
  Olá {{1}}, posso te ajudar a agendar um serviço? 

  Responda esta mensagem para continuarmos! 😊
  ```
- **Note**: Minimal template for reopening closed 24h window

---

## 2. Map Template IDs in .env

Once templates are approved in Meta, you'll get the **template name**. Add them to `.env`:

```bash
# WhatsApp Cloud API Template IDs (from Meta)
WA_TEMPLATE_APPOINTMENT_CONFIRMATION=appointment_confirmation_utility
WA_TEMPLATE_APPOINTMENT_REMINDER=appointment_reminder_utility
WA_TEMPLATE_REOPEN_CONVERSATION=reopen_conversation_utility
```

These are used by `lib/whatsapp/template-resolver.ts` to map `NotificationTemplateType` → Meta template name.

---

## 3. Create Templates in AutoHub Database (Optional)

For consistency, optionally create `NotificationTemplate` rows per business:

```sql
INSERT INTO notification_templates (id, business_id, type, title, body, is_active, created_at, updated_at)
VALUES 
  ('temp1', 'BUSINESS_ID', 'APPOINTMENT_CONFIRMATION_UTILITY', 'Appointment Confirmation', 
   'Olá {{customerName}}, seu agendamento foi confirmado!...', true, now(), now()),
  ('temp2', 'BUSINESS_ID', 'APPOINTMENT_REMINDER_UTILITY', 'Appointment Reminder',
   'Olá {{customerName}}, você tem um agendamento em 24h!...', true, now(), now()),
  ('temp3', 'BUSINESS_ID', 'REOPEN_CONVERSATION_UTILITY', 'Reopen Conversation',
   'Olá {{customerName}}, posso te ajudar a agendar um serviço?...', true, now(), now());
```

Or use the AutoHub Admin UI (if exists) to create these templates once approved in Meta.

---

## 4. How AutoHub Uses Templates

### Workflow

1. **Webhook receives message** → `app/api/whatsapp/webhook/route.ts`
   - Persists inbound, creates/updates conversation
   - Enqueues response task

2. **Cron processes queue** → `app/api/cron/process-whatsapp-queue/route.ts`
   - Checks `lastCustomerMessageAt`
   - **Within 24h**: Send free-form text (via AI or fallback)
   - **Outside 24h**: Call `renderFullTemplate('REOPEN_CONVERSATION_UTILITY', businessId, vars)`
     - Resolves template name from env or DB
     - Renders variables
     - Calls `sendTemplateMessage()`

3. **sendTemplateMessage** → `lib/whatsapp/client.ts`
   - Sends to Meta Cloud API with template name + language + components

### Code Example

```typescript
import { renderFullTemplate, sendTemplateMessage } from '@/lib/whatsapp'

// Outside 24h window
const template = await renderFullTemplate(
  'REOPEN_CONVERSATION_UTILITY',
  businessId,
  { customerName: 'João Silva' }
)

await sendTemplateMessage({
  to: phoneNumber,
  templateNameOrId: template.templateNameOrId,
  language: 'pt_BR',
  components: template.components
})
```

---

## 5. Template Variables & Escaping

All variables are **escaped** to prevent XSS-style injection:

```typescript
export function renderTemplateVariables(
  template: string,
  variables: Record<string, string>
): string {
  // Replaces {key} with escaped value
  // e.g., {customerName} → João & Silva → João &amp; Silva
}
```

**Supported variables** (will be documented per template type):
- `{customerName}` - From conversation or Customer model
- `{serviceName}` - From Service model
- `{appointmentDateTime}` - From Appointment model
- `{businessPhone}` - From Business config

---

## 6. Troubleshooting

### Template not found in Meta
- Check **Meta Business Manager** → **Message Templates** for approval status
- Templates must be **APPROVED** before use
- If rejected, edit and resubmit

### "Invalid template name" error from Cloud API
- Verify `.env` variable matches exactly the name in Meta
- Template name is case-sensitive
- Example: `appointment_confirmation_utility` (lowercase, underscores)

### Variables not rendering
- Check that variable names are wrapped in `{}`
- Ensure variable values are provided in `renderFullTemplate()` call
- Special chars will be escaped; expected behavior

### Outside 24h window not working
- Verify `lastCustomerMessageAt` is being set correctly when webhook receives message
- Ensure `Plan.whatsappEnabled = true` for business
- Check cron is running and has CRON_SECRET

---

## 7. Future Enhancements

- **Admin Dashboard**: Create/edit templates UI for each business
- **Template Library**: Pre-built templates for different industries
- **A/B Testing**: Track which templates have higher engagement
- **Localization**: Support for other languages (es_ES, en_US, etc.)
- **Approval Workflow**: Notify admins when template awaiting approval

---

## 8. References

- [Meta WhatsApp Cloud API - Message Templates](https://developers.facebook.com/docs/whatsapp/cloud-api/messages/message-templates)
- [Template Categories & Limitations](https://developers.facebook.com/docs/whatsapp/message-templates/guidelines-and-best-practices)
- [24h Messaging Window](https://developers.facebook.com/docs/whatsapp/cloud-api/conversations)
