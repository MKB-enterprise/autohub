# Multi-Tenant WhatsApp Setup Guide

**Status:** Phase 5 Complete - Each business has its own WhatsApp account  
**Date:** January 10, 2026

---

## Architecture

Each business (estética) can now have its own Meta WhatsApp account with:
- **Unique Phone Number** (`phone_number_id`)
- **Unique Access Token** (`access_token`)
- Optional: Custom branding (`display_name`, `app_secret`)

---

## Database Structure

```sql
CREATE TABLE whatsapp_business_config (
  id UUID PRIMARY KEY,
  business_id TEXT UNIQUE REFERENCES businesses(id),
  phone_number_id TEXT,
  access_token TEXT,
  display_name TEXT,           -- "Estética X" no cliente (opcional)
  app_secret TEXT,             -- Para webhook signature (opcional)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| `business_id` | ✅ | Foreign key to `businesses` |
| `phone_number_id` | ✅ | Meta Cloud API phone number ID |
| `access_token` | ✅ | Meta Bearer token for API calls |
| `display_name` | ❌ | Display name for customer messages (future use) |
| `app_secret` | ❌ | For webhook signature validation per business |
| `is_active` | ✅ | Enable/disable WhatsApp for this business |

---

## Setup Steps

### 1. Create WhatsApp Config for a Business

**Option A: Direct SQL**
```sql
INSERT INTO whatsapp_business_config 
  (id, business_id, phone_number_id, access_token, display_name, is_active)
VALUES 
  ('config-123', 'business-abc', '123456789012345', 'EAAB...token...', 'Estética X', true);
```

**Option B: Admin UI (future)**
- Admin clicks "Configure WhatsApp" for a business
- Pastes `phone_number_id` and `access_token` from Meta
- Optionally sets custom display name

### 2. How the Cron Fetches Config

```typescript
// app/api/cron/process-whatsapp-queue/route.ts
const whatsappConfig = await prisma.whatsAppBusinessConfig.findUnique({
  where: { businessId }
})

if (!whatsappConfig?.isActive) {
  // Skip this business
  return
}

// Send message using this business's credentials
await sendTextMessage(
  { to: phone, text: message },
  {
    accessToken: whatsappConfig.accessToken,
    phoneNumberId: whatsappConfig.phoneNumberId
  }
)
```

### 3. Fallback to Global Env (Optional)

If a business has no config row, the client falls back to `.env` globals:

```typescript
const accessToken = config?.accessToken || process.env.META_WA_ACCESS_TOKEN
const phoneNumberId = config?.phoneNumberId || process.env.META_WA_PHONE_NUMBER_ID
```

This is useful for:
- **Testing** (use one dev account for all businesses)
- **Legacy migrations** (gradually move to per-business configs)

---

## Environment Variables

`.env.example` now documents that WhatsApp globals are **optional fallback**:

```dotenv
# OPTIONAL: Global fallback (use if no per-business config exists)
META_WA_ACCESS_TOKEN="EAAB..."
META_WA_PHONE_NUMBER_ID="123456789012345"

# Template names (shared across all businesses, since Meta approves globally)
WA_TEMPLATE_REOPEN_CONVERSATION="reopen_conversation_utility"
```

---

## Webhook Handling

When webhook receives message for business X:
1. Finds or creates `WhatsAppConversation` for (businessId, customerPhone)
2. Persists `WhatsAppInboundMessage`
3. Enqueues `WhatsAppMessageQueue` job
4. **Cron later fetches config and sends using X's credentials**

---

## Future Enhancements

1. **Admin Dashboard**
   - Add/edit WhatsApp config per business
   - Disconnect a business from WhatsApp

2. **Per-Business App Secret**
   - Each business can have own `app_secret` for webhook signature
   - Webhook routes per business or shared validation logic

3. **Webhook URL per Business**
   - Currently: `/api/whatsapp/webhook` receives all
   - Future: `/api/whatsapp/webhook?businessId=...` or separate routes

4. **Display Name in Messages**
   - Use `whatsappConfig.displayName` in templates
   - Example: "Olá, *Estética X* aqui..."

---

## Troubleshooting

### "WhatsApp config not configured or inactive"
- Check: `whatsapp_business_config` row exists for this business
- Check: `is_active = true`
- Check: `phone_number_id` and `access_token` are filled

### "Invalid template"
- Verify template name matches exactly what Meta approved
- Template names are global (same across all businesses)

### Multiple messages to wrong business
- Ensure each business has unique `phone_number_id`
- Check webhook is correctly parsing `businessId` from message

---

## References

- [Previous: WhatsApp Templates Setup](whatsapp-templates.md)
- [Previous: AI + WhatsApp Plan](ai-whatsapp-plan.md)
