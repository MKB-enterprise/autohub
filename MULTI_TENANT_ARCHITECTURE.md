# Multi-Tenant SaaS Architecture Guide

## 📋 Visão Geral

Este documento descreve a arquitetura de SaaS multi-tenant implementada no AutoHub. O sistema permite que múltiplas empresas (tenants) rodem de forma completamente isolada, com dados, configurações e branding personalizados.

## 🏗️ Arquitetura

### Componentes Principais

#### 1. **Tenant Resolution (Resolução de Tenant)**

O sistema resolve o tenant de três formas possíveis:

```
1. Subdomínio: empresa.autohub.com
2. Header: X-Tenant-Slug: empresa
3. Path: /t/empresa-slug/...
```

**Arquivo:** `lib/tenant-resolver.ts`

Fluxo:
- Middleware Next.js intercepta request
- Extrai slug do tenant (subdomínio/header/path)
- Valida existência e status do business
- Injeta `x-tenant-id` e `x-tenant-slug` nos headers
- Cacheia resultado por 5 minutos

#### 2. **Autenticação com Multi-Tenant**

`lib/auth-multi-tenant.ts` estende autenticação com:

- **TokenPayload** inclui: `tenantId`, `businessId`, `role` (OWNER/STAFF/CUSTOMER)
- Validação automática: token deve pertencer ao tenant da request
- Guards por role: `requireOwner()`, `requireStaffOrOwner()`
- Isolamento garantido a nível de autenticação

#### 3. **Configurações de Tenant (TenantSettings)**

`lib/tenant-settings.ts` define estruturas JSON:

```typescript
TenantSettingsData {
  branding: BrandingConfig // cores, logo, tema
  hours: HoursConfig // horários, timezone, políticas
  capacity: CapacityConfig // vagas, capacidade
  cards: CardsConfig // dashboard cards customizáveis
  contact: ContactConfig // whatsapp, telefone, endereço
  notification: NotificationConfig // templates, lembretes
}
```

Cada config é validada e sanitizada antes de salvar no BD.

#### 4. **Banco de Dados**

**Schema Prisma:**

```prisma
model Business {
  id String @id
  slug String @unique // para URL/resolution
  name String
  // ... branding fields
  users User[] // usuários internos
  tenantSettings TenantSettings?
  // ... relacionamentos
}

model User {
  id String
  businessId String
  email String
  role UserRole (OWNER | STAFF | CUSTOMER)
  @@unique([businessId, email])
}

model TenantSettings {
  id String
  businessId String @unique
  brandingConfig Json // { displayName, colors, theme, ... }
  hoursConfig Json
  capacityConfig Json
  cardsConfig Json
  contactConfig Json
  notificationConfig Json
}
```

**Índices:** `(businessId, field)` em todas as tabelas para isolamento

#### 5. **Middleware Next.js**

`middleware.ts`:

```typescript
export async function middleware(request: NextRequest) {
  // Pula rotas públicas (login, register)
  // Resolve tenant para rotas protegidas
  // Injeta x-tenant-id nos headers
}
```

## 🔐 Segurança e Isolamento

### Garantias de Isolamento

1. **Middleware Level**: `x-tenant-id` injetado e validado
2. **Database Level**: 
   - Índices `(tenant_id, id)` em todas tabelas
   - Constraints `unique([tenant_id, email])`
3. **API Level**:
   - `getTenantFromRequest()` valida tenant
   - Queries sempre filtram por `tenantId`
   - Autorização por role
4. **Frontend Level**:
   - `useTenant()` hook carrega settings do tenant
   - TenantProvider injeta branding

### Validações Críticas

```typescript
// ❌ ERRADO - pode vazar dados
const users = await prisma.user.findMany()

// ✅ CERTO
const tenantId = request.headers.get('x-tenant-id')
const users = await prisma.user.findMany({
  where: { businessId: tenantId }
})
```

## 📚 Endpoints de Admin do Tenant

### GET `/api/tenant/settings`

Retorna todas as configurações do tenant.

**Response:**
```json
{
  "success": true,
  "data": {
    "branding": { ... },
    "hours": { ... },
    "capacity": { ... },
    "cards": { ... },
    "contact": { ... },
    "notification": { ... }
  }
}
```

### PUT `/api/tenant/settings`

Atualiza configurações (apenas OWNER).

**Request:**
```json
{
  "branding": {
    "displayName": "Nova Empresa",
    "colors": { "primary": "#3B82F6", ... },
    "theme": "dark"
  },
  "hours": {
    "timezone": "America/Sao_Paulo",
    "slotDurationMinutes": 60
  }
}
```

## 🎨 Branding Dinâmico no Frontend

### Uso no Layout

```tsx
import { TenantProvider, useBranding } from '@/lib/TenantContext'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <TenantProvider>
          <YourApp>{children}</YourApp>
        </TenantProvider>
      </body>
    </html>
  )
}
```

### Componentes

```tsx
function Header() {
  const branding = useBranding()
  return (
    <header style={{ 
      backgroundColor: branding.colors.primary 
    }}>
      {branding.logo && <img src={branding.logo.url} />}
      <h1>{branding.displayName}</h1>
    </header>
  )
}
```

### CSS Variables

O TenantProvider injeta CSS vars:

```css
:root {
  --color-primary: #3B82F6;
  --color-secondary: #1E40AF;
  --color-background: #F9FAFB;
  --color-text: #1F2937;
}
```

## 🚀 Como Criar um Novo Tenant

### Via API

```bash
# 1. Registrar novo business
curl -X POST http://localhost:3000/api/auth/business/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Estética Premium",
    "email": "admin@premium.com.br",
    "phone": "11 99999-9999",
    "password": "senha-forte"
  }'
```

Resposta:
```json
{
  "business": {
    "id": "abc123",
    "name": "Estética Premium",
    "email": "admin@premium.com.br"
  },
  "token": "eyJhbGc..."
}
```

### Setup Inicial

O sistema cria automaticamente:
- ✅ Registro no `Business`
- ✅ Slug gerado (derivado de nome/email)
- ✅ `BusinessSettings` com padrões
- ✅ `TenantSettings` com config default
- ✅ Templates de notificação padrão

## 📊 Fluxo de Request

```
1. Cliente acessa: empresa.autohub.com/agenda

2. Middleware intercepta
   → Resolve slug "empresa"
   → Valida Business (ativo, subscriptionValid)
   → Injeta x-tenant-id, x-tenant-slug

3. Page Component (agenda)
   → Autenticação: verifica token
   → Validação: token.tenantId == x-tenant-id
   → Queries: filtram por tenantId

4. Response
   → Dados retornados apenas daquele tenant
   → Branding aplicado
```

## 🧪 Testes de Isolamento

### Teste 1: Separação de Dados

```typescript
// Tenant A
const tenantA = await createBusinessWithTenant('A')
const serviceA = await createService(tenantA.id, 'Lavagem')

// Tenant B
const tenantB = await createBusinessWithTenant('B')
const servicesB = await getServicesForTenant(tenantB.id)

// Validação
expect(servicesB).not.toContain(serviceA) // ✅ Pass
expect(servicesB).toHaveLength(0)
```

### Teste 2: Isolamento de Auth

```typescript
// Login Tenant A
const tokenA = await login('a@example.com', 'password', tenantA.id)

// Tentar acessar Tenant B com token A
const response = await fetch('/api/tenant/settings', {
  headers: {
    'Authorization': `Bearer ${tokenA}`,
    'X-Tenant-Slug': 'tenant-b'
  }
})

expect(response.status).toBe(403) // ✅ Acesso negado
```

### Teste 3: Branding Aplicado

```typescript
// Tenant A
await updateBranding(tenantA.id, {
  displayName: 'Premium A',
  colors: { primary: '#FF0000' }
})

// Tenant B
await updateBranding(tenantB.id, {
  displayName: 'Premium B',
  colors: { primary: '#00FF00' }
})

// Validações
const settingsA = await getTenantSettings(tenantA.id)
expect(settingsA.branding.displayName).toBe('Premium A')
expect(settingsA.branding.colors.primary).toBe('#FF0000')

const settingsB = await getTenantSettings(tenantB.id)
expect(settingsB.branding.displayName).toBe('Premium B')
expect(settingsB.branding.colors.primary).toBe('#00FF00')
```

## 📋 Checklist de Implementação por Feature

### Adicionar Nova Feature Multi-Tenant

```typescript
// 1. Atualizar Schema (schema.prisma)
model MyNewEntity {
  id String @id
  businessId String // SEMPRE adicionar tenant_id
  business Business @relation(fields: [businessId])
  // campos...
  
  @@unique([businessId, someUniqueField])
  @@index([businessId])
}

// 2. Criar Migração
$ npm run db:migrate

// 3. Criar API Endpoint (/api/my-entity)
// GET: obter dados filtrados por tenant
// POST: criar com tenant_id validado
// PUT/DELETE: autorizar e validar tenant

// 4. Guardar Tenant em Request
const tenant = await getTenantFromRequest(request)
// Usar tenant.tenantId em todas as queries

// 5. Atualizar Frontend
// Se precisar de settings do tenant:
const { settings } = useTenant()
```

## 🔄 Migrações do Banco

Já executadas:
- `20251230_enhance_multi_tenant`: Adiciona `User`, `TenantSettings`, campos branding no `Business`

Para executar:
```bash
npm run db:migrate
```

Para resets (desenvolvimento):
```bash
npm run db:push   # Força schema
```

## 📞 Contato e Suporte

### Configurações por Tenant

Cada tenant pode personalizar:
- ✅ Identidade visual (cores, logo, tema)
- ✅ Horários de funcionamento
- ✅ Capacidade/vagas
- ✅ Dashboard cards
- ✅ Contato (whatsapp, telefone, endereço, sociais)
- ✅ Templates de notificação
- ✅ Termos de serviço e privacidade

### Painel de Configurações

Acessar em: `/configuracoes`

Apenas OWNER pode editar. Mudanças aplicam em tempo real ao frontend via cache invalidation.

## 🎯 Próximos Passos

1. ✅ Migração de dados existentes (Business → Tenant)
2. ✅ Ajuste de endpoints existentes para filtrar por tenant
3. ✅ Testes E2E multi-tenant
4. ⏳ Upload de logo e favicon
5. ⏳ Rate limiting por tenant
6. ⏳ Analytics por tenant
7. ⏳ Billing e planos

## 🐛 Troubleshooting

### "Tenant not found"
- Verificar se slug está correto
- Validar Business no BD (isActive)
- Verificar hostname/path

### "Acesso negado (403)"
- Token não pertence ao tenant
- Role insuficiente
- Business inativo

### "Dados de outro tenant aparecem"
- Query não filtra por tenantId ❌
- Adicionar `where: { businessId: tenantId }`

## 📖 Referências Arquivos

| Arquivo | Responsabilidade |
|---------|------------------|
| `lib/tenant-resolver.ts` | Extrair e validar tenant |
| `lib/auth-multi-tenant.ts` | Autenticação com roles |
| `lib/tenant-settings.ts` | Schemas e validadores |
| `lib/TenantContext.tsx` | Context e hooks frontend |
| `middleware.ts` | Next.js middleware |
| `app/api/tenant/settings/route.ts` | CRUD de settings |
| `app/configuracoes/page.tsx` | Painel de admin do tenant |
| `prisma/schema.prisma` | Modelos do BD |
