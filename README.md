# 🏁 AutoHub - Sistema de Gestão Automotiva

Sistema completo multi-tenant de controle de agendamentos para estética automotiva, com área do cliente e área administrativa. Desenvolvido com Next.js 14, TypeScript, Prisma e PostgreSQL.

---

## 📋 Índice

- [Quick Start](#-quick-start)
- [Stack Tecnológica](#-stack-tecnológica)
- [Funcionalidades](#-funcionalidades)
- [Instalação Local](#-instalação-local)
- [Testes](#-testes)
- [Deploy](#-deploy)
- [Documentação](#-documentação)

---

## 🚀 Quick Start

```bash
# 1. Clone e instale
git clone <repo-url>
cd autohub
npm ci

# 2. Configure environment
cp .env.example .env
# Edite .env com suas configurações (DATABASE_URL, JWT_SECRET)

# 3. Setup banco de dados
docker-compose up -d db  # ou use PostgreSQL externo
npm run db:migrate:deploy
npm run db:seed  # Dados de exemplo (opcional)

# 4. Inicie aplicação
npm run dev

# 5. Acesse
# http://localhost:3000/t/garageauto (tenant de exemplo)
# Login admin: 11999990000 / admin123
```

---

## 🚀 Stack Tecnológica

| Tecnologia | Uso |
|------------|-----|
| **Next.js 14** | Frontend + Backend (App Router) |
| **TypeScript** | Tipagem estática |
| **PostgreSQL** | Banco de dados |
| **Prisma** | ORM |
| **Tailwind CSS** | Estilização |
| **SWR** | Cache e revalidação de dados |
| **React Hook Form** | Formulários |
| **bcryptjs** | Hash de senhas |
| **date-fns** | Manipulação de datas |

---

## ✨ Funcionalidades

### 👤 Área do Cliente
- ✅ Cadastro e login de clientes
- ✅ Cadastro de veículos
- ✅ Agendamento de serviços com seleção de horários disponíveis
- ✅ Visualização dos agendamentos (próximos e histórico)
- ✅ Confirmação de agendamento 24h antes
- ✅ Aceitar/recusar reagendamentos sugeridos
- ✅ Sistema de reputação com estrelas
- ✅ Edição de perfil

### 🔧 Área Administrativa
- ✅ Dashboard com estatísticas do dia
- ✅ Agenda diária com navegação entre dias
- ✅ Criação de agendamentos para clientes
- ✅ Gerenciamento de clientes e veículos
- ✅ CRUD de serviços com grupos de exclusividade
- ✅ Fluxo de status: Pendente → Confirmado → Em Andamento → Concluído
- ✅ Sugestão de reagendamento para clientes
- ✅ Marcar "não compareceu" (afeta reputação)
- ✅ Configurações personalizáveis

### ⚙️ Sistema
- ✅ Verificação inteligente de disponibilidade
- ✅ Controle de capacidade (boxes simultâneos)
- ✅ Tolerância de 15 minutos entre agendamentos
- ✅ Grupos de serviços mutuamente exclusivos
- ✅ Sistema de reputação configurável
- ✅ Multi-tenant com isolamento de dados

---

## 🔧 Instalação Local

### Pré-requisitos

- Node.js 18+ 
- PostgreSQL 14+
- npm ou yarn

### Passos

```bash
# 1. Clone o repositório
git clone <repo-url>
cd autohub

# 2. Instale dependências
npm ci

# 3. Configure variáveis de ambiente
cp .env.example .env
# Edite .env:
#  - DATABASE_URL=postgresql://...
#  - JWT_SECRET=<string-forte-32+chars>

# 4. Inicie banco de dados (Docker)
docker-compose up -d db

# 5. Execute migrações
npm run db:migrate:deploy

# 6. Popule dados de exemplo
npm run db:seed

# 7. Inicie a aplicação
npm run dev
```

**Acesse**: `http://localhost:3000/t/garageauto`

**Credenciais padrão (seed)**:
- Admin: `11999990000` / `admin123`
- Cliente: `11988887777` / `cliente123`

---

## 🧪 Testes

```bash
# Rodar todos os testes
npm test

# Testes unitários
npm run test:unit

# Testes de integração
npm run test:integration

# Testes com coverage
npm run test:coverage

# CI mode
npm run test:ci

# Testes legacy específicos
npm run test:legacy:tenant    # Multi-tenant isolation
npm run test:legacy:plan      # Plan limits
npm run test:legacy:inventory # Stock write-off
npm run test:legacy:budget    # Budget signature
```

---

## 📦 Build e Deploy

```bash
# TypeCheck
npm run typecheck

# Lint
npm run lint

# Build produção
npm run build

# Iniciar produção (após build)
npm start
```

**Deploy Completo**: Ver [DEPLOY.md](./DEPLOY.md)

---

## 📚 Documentação

| Documento | Descrição |
|-----------|-----------|
| [DEPLOY.md](./DEPLOY.md) | Guia completo de deploy em produção |
| [RUNBOOK.md](./RUNBOOK.md) | Operações, troubleshooting e incidentes |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Arquitetura técnica e fluxos |
| [.env.example](./.env.example) | Variáveis de ambiente |

---

# Integração completa: agendamento -> baixa de estoque -> financeiro
npm run test:integration
```

### Credenciais padrão (seed)

| Tipo | Telefone | Senha |
|------|----------|-------|
| **Admin** | 11999999999 | admin123 |
| **Cliente** | 11988887777 | cliente123 |

---

## 📁 Estrutura do Projeto

```
├── app/
│   ├── api/                    # Rotas da API
│   │   ├── appointments/       # Agendamentos
│   │   ├── auth/               # Autenticação (login, register, me)
│   │   ├── availability/       # Verificação de horários
│   │   ├── cars/               # Veículos
│   │   ├── customers/          # Clientes
│   │   ├── services/           # Serviços
│   │   └── settings/           # Configurações
│   │       └── reputation/     # Config de reputação (público)
│   │
│   ├── agenda/                 # Agenda do admin
│   ├── clientes/               # CRUD de clientes (admin)
│   ├── servicos/               # CRUD de serviços (admin)
│   ├── configuracoes/          # Configurações (admin)
│   ├── dashboard/              # Dashboard (admin)
│   │
│   ├── cliente/                # Área do cliente
│   │   ├── page.tsx            # Meus agendamentos
│   │   ├── novo/               # Novo agendamento
│   │   └── perfil/             # Meu perfil
│   │
│   ├── login/                  # Login
│   ├── cadastro/               # Cadastro de cliente
│   └── layout.tsx              # Layout principal
│
├── components/
│   ├── ui/                     # Componentes UI reutilizáveis
│   │   ├── Alert.tsx
│   │   ├── Badge.tsx
│   │   ├── Button.tsx          # Com loading state
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Loading.tsx
│   │   ├── Modal.tsx
│   │   ├── Select.tsx
│   │   ├── Skeleton.tsx
│   │   └── Textarea.tsx
│   ├── Navigation.tsx          # Navbar
│   └── Sidebar.tsx             # Menu lateral
│
├── lib/
│   ├── AuthContext.tsx         # Contexto de autenticação
│   ├── availability.ts         # Lógica de disponibilidade
│   ├── db.ts                   # Cliente Prisma
│   └── hooks/
│       └── useFetch.ts         # Hook SWR customizado
│
└── prisma/
    ├── schema.prisma           # Schema do banco
    ├── seed.ts                 # Dados de exemplo
    └── migrations/             # Migrations
```

---

## 🔐 Sistema de Autenticação

### Fluxo de Login

```
Cliente/Admin → Login (telefone + senha) → JWT Cookie → Área correspondente
```

### Rotas protegidas

| Rota | Acesso |
|------|--------|
| `/dashboard`, `/agenda`, `/clientes`, `/servicos`, `/configuracoes` | Admin |
| `/cliente`, `/cliente/novo`, `/cliente/perfil` | Cliente |
| `/login`, `/cadastro` | Público |

### Cookies

- `auth-token`: JWT com dados do usuário (id, name, phone, isAdmin)
- Expiração: 7 dias

---

## 📅 Sistema de Confirmação de Agendamentos

### Fluxo completo

```
1. PENDING              → Cliente agenda
2. CONFIRMED_BY_CLIENT  → Cliente confirma 24h antes
3. CONFIRMED            → Estética confirma
4. IN_PROGRESS          → Serviço em andamento
5. COMPLETED            → Serviço concluído
```

### Status possíveis

| Status | Descrição | Cor |
|--------|-----------|-----|
| `PENDING` | Aguardando confirmação do cliente | Cinza |
| `CONFIRMED_BY_CLIENT` | Cliente confirmou, aguarda estética | Azul |
| `CONFIRMED` | Confirmado por ambos ✓ | Verde |
| `RESCHEDULED` | Estética sugeriu novo horário | Laranja |
| `IN_PROGRESS` | Em andamento | Amarelo |
| `COMPLETED` | Concluído | Verde |
| `CANCELED` | Cancelado | Vermelho |
| `NO_SHOW` | Cliente não compareceu | Vermelho |

### Regras de confirmação

- Cliente só pode confirmar **24 horas antes** do agendamento
- Se não confirmar a tempo, agendamento pode ser cancelado
- Estética pode sugerir reagendamento (RESCHEDULED)
- Cliente pode aceitar ou recusar a sugestão

---

## ⭐ Sistema de Reputação do Cliente

### Como funciona

Cada cliente tem uma **nota de 0 a 5 estrelas** que afeta sua capacidade de agendar.

### Regras padrão (configuráveis)

| Evento | Efeito |
|--------|--------|
| **Cliente novo** | Começa com nota **5.0** |
| **Não compareceu (NO_SHOW)** | Nota vai para **2.5** |
| **Compareceu (nota ≥ 3)** | Ganha **+0.2** (máx 5.0) |
| **Compareceu (nota < 3)** | Volta para **5.0** (reabilitação) |

### Penalidade

- **Nota < 3.0** → Exige pagamento antecipado de **50%** para agendar

### Configurações disponíveis (tela de Configurações)

| Config | Padrão | Descrição |
|--------|--------|-----------|
| `reputationEnabled` | `true` | Ativar/desativar sistema |
| `reputationNoShowPenalty` | `2.5` | Nota após uma falta |
| `reputationMinForAdvance` | `3.0` | Nota mínima para não pagar antecipado |
| `reputationAdvancePercent` | `50` | % de pagamento antecipado |
| `reputationRecoveryOnShow` | `true` | Se comparecer, volta para 5.0 |

### Exemplo de fluxo

```
João (nota 5.0) → Falta → Nota 2.5 → Precisa pagar 50% antecipado
                                   → Paga e comparece → Nota volta para 5.0!
```

---

## 🔗 Grupos de Serviços (Exclusividade Mútua)

### O que é?

Serviços do mesmo **grupo** são mutuamente exclusivos - o cliente só pode escolher um.

### Exemplo

| Serviço | Grupo |
|---------|-------|
| Lavagem Simples | `lavagem` |
| Lavagem Completa | `lavagem` |
| Lavagem Premium | `lavagem` |
| Polimento Básico | `polimento` |
| Polimento Técnico | `polimento` |
| Cristalização | `polimento` |
| Higienização Bancos | `null` (sem grupo) |

### Comportamento

- Ao selecionar "Lavagem Completa", "Lavagem Simples" e "Lavagem Premium" ficam **bloqueados**
- Serviços sem grupo podem ser combinados livremente
- Visual: serviços bloqueados ficam esmaecidos com aviso

---

## 📡 API Endpoints

### Autenticação

```
POST   /api/auth/login      # Login
POST   /api/auth/register   # Cadastro de cliente
GET    /api/auth/me         # Dados do usuário logado
POST   /api/auth/logout     # Logout
```

### Agendamentos

```
GET    /api/appointments?date=YYYY-MM-DD   # Listar por data
POST   /api/appointments                    # Criar
GET    /api/appointments/:id                # Buscar
PATCH  /api/appointments/:id                # Atualizar status
DELETE /api/appointments/:id                # Deletar
```

### Disponibilidade

```
GET    /api/availability?date=YYYY-MM-DD&serviceIds=id1,id2
```

### Clientes

```
GET    /api/customers?search=termo    # Listar/buscar
POST   /api/customers                  # Criar
GET    /api/customers/:id              # Buscar com histórico
PATCH  /api/customers/:id              # Atualizar
DELETE /api/customers/:id              # Deletar
```

### Carros

```
GET    /api/cars?customerId=id    # Listar
POST   /api/cars                   # Criar
PATCH  /api/cars/:id               # Atualizar
DELETE /api/cars/:id               # Deletar
```

### Serviços

```
GET    /api/services              # Listar ativos
POST   /api/services              # Criar
PATCH  /api/services/:id          # Atualizar
DELETE /api/services/:id          # Desativar
```

### Configurações

```
GET    /api/settings              # Buscar todas
PATCH  /api/settings              # Atualizar
GET    /api/settings/reputation   # Config de reputação (público)
```

---

## ⚙️ Configurações

### Horário e Capacidade

| Config | Descrição | Padrão |
|--------|-----------|--------|
| `openingTimeWeekday` | Horário de abertura | 08:00 |
| `closingTimeWeekday` | Horário de fechamento | 18:00 |
| `slotIntervalMinutes` | Intervalo entre slots | 15 |
| `maxCarsPerSlot` | Boxes simultâneos | 2 |
| `timezone` | Fuso horário | America/Sao_Paulo |

### Reputação

| Config | Descrição | Padrão |
|--------|-----------|--------|
| `reputationEnabled` | Sistema ativo | true |
| `reputationNoShowPenalty` | Nota após falta | 2.5 |
| `reputationMinForAdvance` | Nota mín. sem antecipado | 3.0 |
| `reputationAdvancePercent` | % antecipado | 50 |
| `reputationRecoveryOnShow` | Reabilita ao comparecer | true |

---

## 🗃️ Modelagem do Banco

### Diagrama simplificado

```
Customer (1) ──────< (N) Car
    │                     │
    │                     │
    └──< Appointment >────┘
              │
              │
              └──< AppointmentService >── Service
                                            │
                                            └── serviceGroup
```

### Tabelas principais

**customers**
- `id`, `name`, `phone`, `email`, `password`, `isAdmin`
- `rating`, `noShowCount`, `completedCount`

**cars**
- `id`, `customerId`, `plate`, `model`, `color`

**services**
- `id`, `name`, `durationMinutes`, `price`, `isActive`, `serviceGroup`

**appointments**
- `id`, `customerId`, `carId`, `startDatetime`, `endDatetime`
- `status`, `totalPrice`, `notes`, `businessNotes`
- `suggestedDatetime`, `confirmedByClientAt`, `confirmedByBusinessAt`

**appointment_services**
- `id`, `appointmentId`, `serviceId`, `price`

**settings**
- Configurações de horário, capacidade e reputação

---

## 🌐 Deploy

### Vercel (Recomendado)

1. Push para GitHub
2. Importar na Vercel
3. Configurar variáveis de ambiente:
   - `DATABASE_URL`
   - `JWT_SECRET`
4. Deploy!

### Banco de Dados

**Supabase** (gratuito)
```
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"
```

**Railway** (gratuito com limite)
```
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/railway"
```

### Migrations em produção

```bash
npx prisma migrate deploy

### Multi-tenant (dev vs prod)

- Dev: suporte a `/t/{slug}` com fallback automático para `default` se nenhum slug for encontrado.
- Prod: sem fallback; se não houver slug válido (path/subdomínio/cookie), retorna 404.
- Cookie `tenant_slug`: SameSite=Lax, Secure em produção, HttpOnly, domain configurável via `TENANT_COOKIE_DOMAIN`; usado apenas no servidor para resolução.
- Rewrites: `/t/{slug}/api/*` e `/t/{slug}/*` reescrevem removendo o prefixo e injetando `x-tenant-slug`.
- Ordem de resolução: header (apenas dev) → path → subdomínio → cookie → fallback dev.
```

---

## 🛠️ Scripts

```bash
npm run dev          # Desenvolvimento
npm run build        # Build produção
npm run start        # Iniciar produção
npm run lint         # Lint

npx prisma generate  # Gerar client
npx prisma migrate dev --name nome   # Nova migration
npx prisma db push   # Push sem migration
npx prisma studio    # Interface visual
npx prisma db seed   # Popular dados
```

---

## 📝 Notas Técnicas

### Loading States

Todos os botões de ação possuem estado de loading para prevenir cliques duplicados:
- Botão fica desabilitado durante a ação
- Texto muda para indicar carregamento
- Ícone de spinner aparece

### Tolerância de horários

O sistema adiciona **15 minutos de tolerância** entre agendamentos para atrasos.

### Cache com SWR

Dados são cacheados e revalidados automaticamente, proporcionando:
- Respostas instantâneas do cache
- Atualização em background
- Revalidação ao focar na aba

---

## 📄 Licença

MIT

---

**Desenvolvido com ❤️ usando Next.js 14, TypeScript e Prisma**
