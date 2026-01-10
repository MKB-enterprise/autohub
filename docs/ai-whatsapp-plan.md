# AI + WhatsApp Integration Plan (MVP)

**Data:** January 10, 2026  
**Status:** Phase 0 – Auditoria revisada

---

## 1. TENANT & BUSINESS RESOLUTION

### Como funciona hoje
- **middleware.ts**: deixa passar `/t/{slug}/…` e `/api/**`; demais rotas redirecionam para marketing.
- **lib/tenant-resolver.ts**: resolve tenant por subdomínio, header `X-Tenant-Slug`, path `/t/{slug}` ou cookie `tenant_slug`; cache em memória 5 min; fallback dev para `default`. Quando possível, reaproveita `auth_token`.
- **Prisma Client**: `lib/db.ts` instancia singleton do Prisma Client.
- **Feature flags**: `lib/plan.ts` expõe `getPlanForBusiness`, `assertWhatsAppAllowed`, `assertIaAllowed`; usa `Plan` quando existe ou fallback de `subscriptionPlan` enum (`SubscriptionPlan` BASIC/PROFESSIONAL/ENTERPRISE → `SIMPLES/PROFISSIONAL/COMPLETO`).

---

## 2. MODELOS EXISTENTES

### AiInsightLog (ai_insight_logs)
- Campos: id, businessId (FK), userId?, prompt, response?, latencyMs?, costUsd?, createdAt.
- Índice: (businessId, createdAt).

### WhatsAppMessageQueue (whatsapp_message_queue)
- Campos: id, businessId (FK), customerId?, phone, templateKey, payload JSON, status (PENDING/SENT/FAILED), scheduledAt?, sentAt?, error?, conversationId?, inboundMessageId?, retryCount, nextAttemptAt?, createdAt/updatedAt.
- Índices: (businessId, status) e (businessId, conversationId).

### WhatsAppConversation (whatsapp_conversations)
- Campos: id, businessId (FK), customerPhone, customerId?, lastCustomerMessageAt?, stateJson JSON, status (ACTIVE/INACTIVE/AWAITING_RESPONSE), createdAt/updatedAt.
- Unique: (businessId, customerPhone).

### WhatsAppInboundMessage (whatsapp_inbound_messages)
- Campos: id, businessId (FK), conversationId (FK), fromPhone, text, receivedAt, rawJson JSON, waMessageId?, createdAt.
- Índices: (businessId, conversationId) e (businessId, receivedAt).

### NotificationTemplate (notification_templates)
- Enum atual `NotificationTemplateType`: APPOINTMENT_CREATED, APPOINTMENT_CONFIRMED, APPOINTMENT_CANCELED, APPOINTMENT_RESCHEDULED, APPOINTMENT_24H_REMINDER, APPOINTMENT_1H_REMINDER, APPOINTMENT_COMPLETED.
- Unique: (businessId, type). Campos: title, body, isActive.

### Plan (plans)
- Campos: code (unique), name, maxUsers?, whatsappEnabled, aiEnabled, monthlyQuoteLimit?, createdAt/updatedAt.

### Business (businesses)
- Contém slug (unique), relação opcional para `Plan` (planId) e enum `subscriptionPlan` legado.

---

## 3. LOGGER E LOGGING

### Logger atual
- **lib/logger.ts**: logger file-based (`debug-auth.log`), server-side only, helpers `appendLog`, `clearLog`, `readLog`.

### Recomendação MVP:
- Usar `console.log()` com timestamp estruturado
- Logar em `AiInsightLog` para chamadas de IA (sempre)
- Logar em `NotificationLog` para mensagens WhatsApp (sempre)
- Estrutura de logs: `[timestamp] [businessId] [channel] [action] [details]`

---

## 4. CUSTOMER E CONVERSATION

### Customer (customers)
- Campos de identificação + relacionamento com `WhatsAppMessageQueue`. Unique: (businessId, phone) e (businessId, email).

### Conversas e inbound já existem
- `WhatsAppConversation` e `WhatsAppInboundMessage` já estão no schema; não precisamos criar novas tabelas para sessão/inbound no MVP, apenas usar.

---

## 5. APIS E ESTRUTURA EXISTENTES

### WhatsApp API (app/api/whatsapp/)
- **queue/route.ts**: GET/POST; exige admin (`requireAdmin`), valida plano com `assertWhatsAppAllowed`, persiste em `WhatsAppMessageQueue`. Não há webhook nem consumer implementados.

### Estrutura geral
- Rotas API no App Router (`app/api/**/route.ts`), retornam `NextResponse`. Rotas públicas listadas em `middleware.ts` bypassam redirect.

---

## 6. DEPENDÊNCIAS ATUAIS

```json
{
  "@prisma/client": "^5.7.1",
  "bcryptjs": "^2.4.3",
  "date-fns": "^2.30.0",
  "date-fns-tz": "^2.0.0",
  "jsonwebtoken": "^9.0.2",
  "next": "^14.0.4",
  "react": "^18.2.0"
}
```

### A ADICIONAR (MVP):
- `zod` (validação payload)
- `@anthropic-ai/sdk` (IA)

---

## 7. ENV VARS NECESSÁRIOS (MVP)

```bash
# Tenant/Multi-tenant
NEXT_PUBLIC_MARKETING_URL=http://localhost:4000
TENANT_COOKIE_DOMAIN=localhost

# WhatsApp Cloud API
WHATSAPP_VERIFY_TOKEN=seu_token_secreto
META_WA_ACCESS_TOKEN=seu_access_token
META_WA_PHONE_NUMBER_ID=seu_phone_id
META_WA_APP_SECRET=seu_app_secret (opcional, para validação)
PUBLIC_BASE_URL=http://localhost:3000 (para webhook callback)

# IA (Anthropic)
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
AI_MODEL=claude-3-5-sonnet-20241022 (ou similar)

# Cron
CRON_SECRET=seu_secret_para_validar_cron

# Database (já existe)
DATABASE_URL=postgresql://...
```

---

## 8. ROADMAP EXECUTIVO (FASES)

| Fase | Módulo | Objetivo | Arquivos Novo |
|------|--------|----------|---|
| 0 | - | Auditoria | `docs/ai-whatsapp-plan.md` |
| 1 | lib/ai | AI Core reutilizável | `lib/ai/{types,ai-gateway,capabilities/*}.ts` |
| 2 | lib/whatsapp | Client Meta | `lib/whatsapp/{client,window,template-resolver}.ts` |
| 3 | api/whatsapp | Webhook inbound | `app/api/whatsapp/webhook/route.ts` (usar tabelas existentes) + eventual config BusinessWhatsApp mapping |
| 4 | api/cron | Queue consumer | `app/api/cron/process-whatsapp-queue/route.ts` |
| 5 | config | Templates + 24h | Expand `NotificationTemplateType`/mapeamento, docs |
| 6 | tests | Qualidade | `tests/`, smoke tests |

---

## 9. CHECKLIST DE NÃO-REGRESSÃO

- [ ] Rotas `/t/{slug}/*` continuam funcionando
- [ ] Auth JWT + cookie httpOnly continua validado
- [ ] Feature flags funcionam (plan.ai, plan.whatsapp)
- [ ] Prisma migrations rodam sem erro
- [ ] Dashboard, appointments, services não quebrados
- [ ] Webhooks externos (se houver) continuam

---

## 10. DECISÕES ARQUITETURAIS

1. **IA dentro de Consumer**: Webhook NUNCA chama IA (async via cron)
2. **Sem Redis MVP**: Queue é tabela BD + cron, backoff simples
3. **Zod para validação**: Toda payload externa validada
4. **Logs estruturados**: Em BD (AiInsightLog, NotificationLog) + console
5. **Feature flags first**: Cada ação verifica Plan.aiEnabled/Plan.whatsappEnabled
6. **Template keys**: Mapeamento hardcoded env vars (Fase 5)
7. **Sem tools ainda**: IA não executa agendamento, apenas sugere

---

**Próximo passo:** FASE 1 - Criar AI Core em `lib/ai/`
