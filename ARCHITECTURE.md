# 🏗️ Arquitetura do Sistema - AutoHub

Documentação técnica da arquitetura, componentes e fluxos do sistema.

---

## 📊 Visão Geral

**AutoHub** é uma aplicação SaaS multi-tenant para gestão de estética automotiva, construída como monolito modular em Next.js.

### Stack Tecnológica

| Camada | Tecnologia | Versão | Propósito |
|--------|-----------|--------|-----------|
| **Frontend** | Next.js (App Router) | 14.0.4 | SSR + Client Components |
| **Backend** | Next.js API Routes | 14.0.4 | REST APIs |
| **Database** | PostgreSQL | 16+ | Armazenamento persistente |
| **ORM** | Prisma | 5.7.1 | Type-safe database access |
| **Auth** | JWT + bcryptjs | - | Autenticação stateless |
| **State** | SWR | 2.3.6 | Client-side cache/fetch |
| **Validation** | Zod | 4.3.5 | Schema validation |
| **Runtime** | Node.js | 20+ | Server runtime |

---

## 🎨 Arquitetura de Alto Nível

```
┌─────────────────────────────────────────────────────┐
│                    Internet                          │
└──────────────────┬──────────────────────────────────┘
                   │
         ┌─────────▼─────────┐
         │   Load Balancer   │ (Nginx/Vercel/Railway)
         │   + SSL/HTTPS     │
         └─────────┬─────────┘
                   │
    ┌──────────────▼──────────────┐
    │      Next.js Application     │
    │  ┌────────────────────────┐  │
    │  │  Frontend (React)      │  │ SSR + Client Components
    │  │  - /t/[slug]/*         │  │
    │  │  - Client Components   │  │
    │  └────────────────────────┘  │
    │  ┌────────────────────────┐  │
    │  │  Backend (API Routes)  │  │ REST APIs
    │  │  - /api/*              │  │
    │  │  - Middleware          │  │
    │  └────────────────────────┘  │
    │  ┌────────────────────────┐  │
    │  │  Business Logic        │  │ lib/*
    │  │  - Auth                │  │
    │  │  - Tenant Resolution   │  │
    │  │  - Availability        │  │
    │  └────────────────────────┘  │
    └──────────────┬──────────────┘
                   │
         ┌─────────▼─────────┐
         │   PostgreSQL      │
         │   (Prisma ORM)    │
         └───────────────────┘
         
┌──────────────────────────────────────────────┐
│      External Integrations (Optional)        │
├──────────────────────────────────────────────┤
│  - WhatsApp Cloud API (Meta)                 │
│  - Anthropic Claude API (IA)                 │
│  - Email Service (futuro)                    │
└──────────────────────────────────────────────┘
```

---

## 🏢 Multi-Tenancy

### Estratégia: **Database-Level Isolation com `businessId`**

Cada tenant (empresa) é isolado no nível de banco por meio da coluna `businessId` presente em todas as tabelas.

#### Resolução de Tenant

A aplicação suporta 3 métodos de resolução (em ordem de prioridade):

1. **URL Path**: `/t/[slug]/...`
2. **Header**: `X-Tenant-Slug: empresa`
3. **Subdomain**: `empresa.autohub.com` (configurável)

#### Fluxo de Resolução

```
Request → Middleware → Tenant Resolver
                           │
                           ├─→ Extract slug from URL/Header/Domain
                           ├─→ Query database for Business
                           ├─→ Validate Business.isActive
                           └─→ Inject tenantId in context
```

**Código**: [lib/tenant-resolver.ts](lib/tenant-resolver.ts)

#### Isolamento de Dados

```sql
-- Exemplo de query com tenant isolation
SELECT * FROM appointments 
WHERE business_id = :tenantId 
  AND customer_id = :customerId;
```

**Proteção**: Prisma middleware (futuro) ou query guards em todas as APIs.

---

## 🔐 Autenticação e Autorização

### Tipos de Usuários

| Tipo | JWT Payload | Acesso |
|------|-------------|--------|
| **Customer** | `{ customerId, email }` | Área do cliente (qualquer tenant) |
| **Business/Admin** | `{ businessId, userId, email }` | Dashboard admin (apenas seu tenant) |

### Fluxo de Autenticação

```
┌────────┐      POST /api/auth/login      ┌────────────┐
│ Client ├──────────────────────────────→ │ API Route  │
└────────┘                                 └─────┬──────┘
                                                 │
                                        ┌────────▼────────┐
                                        │ 1. Resolve      │
                                        │    Tenant       │
                                        └────────┬────────┘
                                                 │
                                        ┌────────▼────────┐
                                        │ 2. Verify       │
                                        │    Credentials  │
                                        └────────┬────────┘
                                                 │
                                        ┌────────▼────────┐
                                        │ 3. Generate JWT │
                                        └────────┬────────┘
                                                 │
┌────────┐     Set-Cookie: auth_token    ┌──────▼────────┐
│ Client │◄──────────────────────────────┤  Response     │
└────────┘                                └───────────────┘
```

### Proteção de Rotas

**Frontend** ([lib/AuthContext.tsx](lib/AuthContext.tsx)):
- Verifica token via `/api/auth/me`
- Redireciona para login se inválido
- Valida correspondência `businessId` vs `tenantId`

**Backend** ([lib/auth.ts](lib/auth.ts)):
- Middleware `requireAuth()` (futuro)
- Validação de JWT em cada request sensível

---

## 📦 Estrutura de Módulos

### Frontend (`app/`)

```
app/
├── t/[slug]/                # Tenant-scoped pages
│   ├── dashboard/           # Admin dashboard
│   ├── agendamentos/        # Appointments management
│   ├── cliente/             # Customer self-service
│   ├── clientes/            # Customer CRUD (admin)
│   ├── servicos/            # Services CRUD
│   ├── estoque/             # Inventory management
│   ├── financeiro/          # Financial module
│   ├── produtos/            # Products + Dilution
│   ├── orcamentos/          # Budgets
│   └── login/               # Tenant login page
├── api/                     # Backend API Routes
│   ├── auth/                # Authentication
│   ├── appointments/        # Appointments CRUD
│   ├── budgets/             # Budget management
│   ├── inventory/           # Stock movements
│   ├── whatsapp/            # WhatsApp integration
│   ├── ai/                  # AI insights
│   └── health/              # Healthcheck
└── globals.css              # Global styles
```

### Backend Logic (`lib/`)

```
lib/
├── auth.ts                  # JWT generation/verification
├── tenant-resolver.ts       # Multi-tenant resolution
├── tenant-client.ts         # Client-side tenant helpers
├── availability.ts          # Appointment availability logic
├── db.ts                    # Prisma client singleton
├── env-validation.ts        # Environment validation
├── hooks/                   # Custom React hooks
│   └── useAsyncAction.ts
└── AuthContext.tsx          # Authentication context
```

### Database (`prisma/`)

```
prisma/
├── schema.prisma            # Database schema
├── migrations/              # SQL migrations
└── seed.ts                  # Seed data
```

---

## 🔄 Fluxos Principais

### 1. Agendamento de Serviço

```
Customer → Frontend → POST /api/appointments
                            │
                     ┌──────▼────────┐
                     │ 1. Validate   │
                     │    tenant     │
                     └──────┬────────┘
                            │
                     ┌──────▼────────┐
                     │ 2. Check      │
                     │    availability│
                     └──────┬────────┘
                            │
                     ┌──────▼────────┐
                     │ 3. Create     │
                     │    Appointment│
                     └──────┬────────┘
                            │
                     ┌──────▼────────┐
                     │ 4. Create     │
                     │    Services   │
                     └──────┬────────┘
                            │
                     ┌──────▼────────┐
                     │ 5. Send       │
                     │    Notification│
                     └───────────────┘
```

**APIs Envolvidas**:
- `POST /api/appointments`
- `GET /api/appointments/availability`

### 2. Finalização de Serviço (Baixa de Estoque + Financeiro)

```
Admin → Complete Appointment
             │
      ┌──────▼────────┐
      │ 1. Update     │
      │    status =   │
      │    COMPLETED  │
      └──────┬────────┘
             │
      ┌──────▼────────┐
      │ 2. Create     │
      │    Inventory  │
      │    Movements  │
      └──────┬────────┘
             │
      ┌──────▼────────┐
      │ 3. Create     │
      │    Financial  │
      │    Transaction│
      └──────┬────────┘
             │
      ┌──────▼────────┐
      │ 4. Update     │
      │    Customer   │
      │    Rating     │
      └───────────────┘
```

**APIs Envolvidas**:
- `POST /api/appointments/[id]/complete`

### 3. Diluição de Produtos

```
Admin → Create Dilution Recipe → Create Batch
            │                        │
     ┌──────▼────────┐       ┌───────▼────────┐
     │ Define ratio  │       │ Prepare batch  │
     │ (1:10, etc)   │       │ (calculate ml) │
     └───────────────┘       └────────┬───────┘
                                      │
                              ┌───────▼────────┐
                              │ Deduct stock   │
                              │ of concentrate │
                              └────────────────┘
```

**APIs Envolvidas**:
- `POST /api/dilution-recipes`
- `POST /api/dilution-batches`

---

## 💾 Modelo de Dados (Schema Resumido)

### Core Entities

```prisma
Business (Tenant)
├─→ Customer
│   └─→ Car
├─→ User (Staff/Admin)
├─→ Service
│   └─→ Category
├─→ Product
│   ├─→ ProductCategory
│   └─→ DilutionRecipe
│       └─→ DilutionBatch
├─→ Appointment
│   ├─→ AppointmentService
│   ├─→ InventoryMovement
│   └─→ FinancialTransaction
├─→ Budget
│   ├─→ BudgetItem
│   └─→ BudgetSignature
└─→ BusinessSettings
```

**Referência Completa**: [prisma/schema.prisma](prisma/schema.prisma)

---

## 🔗 Integrações Externas

### WhatsApp Cloud API (Meta)

**Propósito**: Envio de notificações e mensagens automáticas

**Fluxo**:
```
Trigger (Appointment Created) 
   → Queue Message
   → Cron Job (/api/cron/process-whatsapp-queue)
   → Send via Meta API
```

**Configuração**:
- `META_WA_ACCESS_TOKEN`
- `META_WA_PHONE_NUMBER_ID`
- `WHATSAPP_VERIFY_TOKEN` (webhook verification)

**Endpoints**:
- `POST /api/whatsapp/webhook` - Recebe mensagens
- `GET /api/cron/process-whatsapp-queue` - Processa fila

### Anthropic Claude (IA)

**Propósito**: Geração de insights e análises

**Uso**:
- Análise de comportamento de clientes
- Sugestões de otimização
- Insights financeiros

**Configuração**:
- `ANTHROPIC_API_KEY`
- `AI_MODEL` (default: claude-3-5-sonnet-20241022)

---

## 🛡️ Segurança

### Implementado

✅ JWT com expiração (7 dias)  
✅ Bcrypt para hash de senhas (salt rounds: 10)  
✅ Tenant isolation (businessId em queries)  
✅ HTTPS enforced (em produção)  
✅ Environment variable validation  
✅ Healthcheck endpoint  

### Recomendações Futuras

🔲 Rate limiting (login, APIs públicas)  
🔲 CSRF tokens (mutations críticas)  
🔲 Input sanitization (XSS)  
🔲 SQL injection protection (já mitigado por Prisma)  
🔲 Audit logging (ações sensíveis)  
🔲 2FA/MFA  

---

## 📈 Escalabilidade

### Limitações Atuais (Monolito)

- Single-process (horizontal scaling limitado)
- Sem cache distribuído
- Sem queue system robusto

### Estratégias de Escala

**Curto Prazo (1000-10000 users)**:
- ✅ Deploy múltiplas instâncias (load balancer)
- ✅ Database read replicas
- ✅ CDN para assets estáticos
- 🔲 Redis para cache e sessions

**Médio Prazo (10000+ users)**:
- 🔲 Separar APIs em microserviços (appointments, billing, notifications)
- 🔲 Message queue (RabbitMQ/SQS) para jobs assíncronos
- 🔲 Database sharding por tenant

---

## 🧪 Testing

### Estratégia

- **Unit Tests**: `tests/unit/` (Jest)
- **Integration Tests**: `tests/` (Jest + Prisma)
- **E2E Tests**: 🔲 (Playwright - futuro)

### Executar Testes

```bash
npm run test          # Todos os testes
npm run test:unit     # Apenas unit
npm run test:integration  # Apenas integration
npm run test:ci       # CI mode com coverage
```

---

## 🔄 CI/CD

### Pipeline (GitHub Actions)

Arquivo: [.github/workflows/ci.yml](.github/workflows/ci.yml)

**Stages**:
1. **Lint + TypeCheck**: ESLint + tsc
2. **Tests**: Jest (unit + integration)
3. **Build**: Next.js build
4. **Coverage**: Upload to Codecov

**Triggers**:
- Push para `main` ou `develop`
- Pull Requests

---

## 📚 Referências

- [DEPLOY.md](./DEPLOY.md) - Deployment guide
- [RUNBOOK.md](./RUNBOOK.md) - Operational runbook
- [README.md](./README.md) - Development setup
- Prisma Docs: https://www.prisma.io/docs
- Next.js App Router: https://nextjs.org/docs/app
- SWR: https://swr.vercel.app/

---

**Última atualização**: Janeiro 2026  
**Versão**: 1.0.0
