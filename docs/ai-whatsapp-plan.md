# AI + WhatsApp Integration Plan (MVP)

**Data:** January 10, 2026  
**Status:** Phase 0 - Audit Complete

---

## 1. TENANT & BUSINESS RESOLUTION

### Como funciona hoje:
- **middleware.ts**: Valida que rotas `/t/{slug}/*` são permitidas e passa para Next.js
- **tenant-resolver.ts**: 
  - `resolveTenantBySlug(slug)` busca em BD com cache 5 min
  - Extrai slug de:
    1. Subdomínio (ex: `empresa.autohub.com`)
    2. Header `X-Tenant-Slug`
    3. Path `/t/{slug}/...`
  - Retorna `TenantContext` com `tenantId`, `tenantSlug`, `business` obj
- **Prisma Client**: Inicializado em `lib/db.ts`
- **Feature flags**: Localizadas em `lib/plan.ts`
  - `getPlanForBusiness(businessId)` retorna:
    - `plan.whatsapp` (boolean)
    - `plan.ai` (boolean)
    - `plan.maxUsers`, `plan.code`
  - Fallback para `subscriptionPlan` enum (BASIC, PROFESSIONAL, ENTERPRISE)

---

## 2. MODELOS EXISTENTES

### AiInsightLog (ai_insight_logs)
```sql
- id (PK)
- businessId (FK) -> Business
- userId (FK, nullable)
- prompt (texto)
- response (texto nullable)
- latencyMs (int nullable)
- costUsd (decimal nullable)
- createdAt
```
**Índice**: (businessId, createdAt)

### WhatsAppMessageQueue (whatsapp_message_queue)
```sql
- id (PK)
- businessId (FK) -> Business
- customerId (FK, nullable) -> Customer
- phone (string)
- templateKey (string) -- referência a NotificationTemplate.type
- payload (JSON)
- status (enum: PENDING, SENT, FAILED)
- scheduledAt (datetime nullable)
- sentAt (datetime nullable)
- error (string nullable)
- createdAt, updatedAt
```
**Índice**: (businessId, status)

### NotificationTemplate (notification_templates)
```sql
- id (PK)
- businessId (FK) -> Business
- type (enum: APPOINTMENT_CREATED, APPOINTMENT_CONFIRMED, ..., APPOINTMENT_1H_REMINDER)
- title (string)
- body (string) -- aceita {vars}
- isActive (boolean)
- createdAt, updatedAt
```
**Unique**: (businessId, type)

### Plan (plans) - Já existe, será usado
```sql
- id (PK)
- code (string unique)
- name (string)
- maxUsers (int nullable)
- whatsappEnabled (boolean)
- aiEnabled (boolean)
- monthlyQuoteLimit (int nullable)
- createdAt, updatedAt
```

### Business (businesses)
- Tem relacionamento: `plan (FK)` -> Plan
- Tem slug único
- Campos: email, phone, address, branding config, etc.

---

## 3. LOGGER E LOGGING

### Logger atual:
- **lib/logger.ts**: File-based logger (fs append a `debug-auth.log`)
  - Funções: `appendLog()`, `clearLog()`, `readLog()`
  - Apenas server-side (verifica `typeof window`)

### Recomendação MVP:
- Usar `console.log()` com timestamp estruturado
- Logar em `AiInsightLog` para chamadas de IA (sempre)
- Logar em `NotificationLog` para mensagens WhatsApp (sempre)
- Estrutura de logs: `[timestamp] [businessId] [channel] [action] [details]`

---

## 4. CUSTOMER E CONVERSATION

### Customer (customers)
- Tem `businessId`, `phone`, `email`, etc.
- Já tem relacionamento com `WhatsAppMessageQueue`
- Unique: (businessId, phone) e (businessId, email)

### Não existe ainda: WhatsAppConversation
**Será criado em FASE 3** (tabela nova mínima):
```sql
WhatsAppConversation:
- id (PK)
- businessId (FK)
- customerPhone (string)
- lastCustomerMessageAt (datetime) -- para janela 24h
- stateJson (JSON) -- conversa em progresso
- status (enum: ACTIVE, INACTIVE, AWAITING_RESPONSE)
- createdAt, updatedAt
Unique: (businessId, customerPhone)
```

### Não existe ainda: WhatsAppInboundMessage
**Será criado em FASE 3** (log de inbound):
```sql
WhatsAppInboundMessage:
- id (PK)
- businessId (FK)
- conversationId (FK)
- fromPhone (string)
- text (string)
- receivedAt (datetime)
- rawJson (JSON) -- resposta da Meta
- createdAt
```

---

## 5. APIS E ESTRUTURA EXISTENTES

### WhatsApp API (app/api/whatsapp/)
- **queue/** - VAZIO, apenas pasta estrutura

### Estrutura geral:
- `/app/api/[modelo]/route.ts` - padrão Next.js 14 App Router
- Cada route recebe `NextRequest`, retorna `NextResponse`
- Rotas públicas (sem auth) estão listadas em middleware.ts publicPaths

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
| 3 | api/whatsapp | Webhook inbound | `app/api/whatsapp/webhook/route.ts` + migrations |
| 4 | api/cron | Queue consumer | `app/api/cron/process-whatsapp-queue/route.ts` |
| 5 | config | Templates + 24h | Update NotificationTemplate, docs |
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
