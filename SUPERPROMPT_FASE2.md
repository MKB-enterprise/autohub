# 🤖 SUPERPROMPT - Para Implementar FASE 2 (Testes de API)

Copie este prompt inteiro e mande pra outra IA (ou use comigo de novo).

---

## CONTEXTO

**Projeto**: AutoHub (Next.js 14 + PostgreSQL + Multi-tenant)  
**Fase Atual**: ✅ FASE 1 completa (Jest, factories, helpers, CI)  
**Objetivo**: **FASE 2** - Testes de rotas API + Isolamento multi-tenant  
**Tempo estimado**: 1-2 horas  

---

## O QUE EXISTE JÁ

✅ Jest rodando  
✅ 9 testes unitários de JWT passando  
✅ Factories para criar dados (createUser, createBusiness, etc)  
✅ Helpers de auth (createJWTToken, createAuthHeaders, etc)  
✅ DB isolado em Docker com cleanup automático  
✅ GitHub Actions CI configurado  
✅ Script: `npm test` (roda testes)  
✅ Script: `npm run test:ci` (CI mode com coverage)  

---

## O QUE PRECISA SER FEITO

### 1. Testes de Rota `/api/auth/login`

**Arquivo**: `tests/integration/auth.spec.ts`

**Casos de teste (AAA Pattern em Português)**:

```
Describe: POST /api/auth/login

1. "Arrange: Usuário válido criado | Act: POST com email+senha | Assert: 200 + token"
   - Criar user via factory
   - POST /api/auth/login com email + senha
   - Validar: status 200
   - Validar: response.token contém JWT válido
   - Validar: verifyJWTToken(token).businessId === user.businessId

2. "Arrange: Senha incorreta | Act: POST com email+senha errada | Assert: 401"
   - Criar user via factory
   - POST /api/auth/login com email + senha ERRADA
   - Validar: status 401
   - Validar: response.message contém "senha" OU "credenciais"

3. "Arrange: Email não existe | Act: POST com email inválido | Assert: 401"
   - POST /api/auth/login com email que NÃO existe
   - Validar: status 401
   - Validar: response.message contém "encontrado" OU "credenciais"

4. "Arrange: Email vazio | Act: POST sem email | Assert: 400"
   - POST /api/auth/login com body vazio ou sem email
   - Validar: status 400
   - Validar: response.errors menciona email

5. "Arrange: Payload inválido | Act: POST com dados malformados | Assert: 400"
   - POST /api/auth/login com body não-JSON
   - Validar: status 400
```

**Dicas**:
- Usar `supertest` para requisições HTTP
- Cada teste: `afterEach(async () => await cleanupDatabase())`
- Importar factories: `import { createBusiness, createUser } from '@/tests/fixtures/factories'`
- Importar helpers: `import { createAuthHeaders } from '@/tests/helpers/auth'`

### 2. Testes de Rota `/api/auth/register`

**Arquivo**: `tests/integration/auth-register.spec.ts`

**Casos de teste**:

```
Describe: POST /api/auth/register

1. "Arrange: Dados válidos | Act: POST register | Assert: 201 + user criado"
   - POST /api/auth/register com { email, password, name, businessName }
   - Validar: status 201
   - Validar: response.user.email === enviado
   - Validar: BD contém novo User e Business
   - Validar: response contém token

2. "Arrange: Email já existe | Act: POST register com email dup | Assert: 409"
   - Criar user1 via factory
   - POST register com email de user1
   - Validar: status 409
   - Validar: message contém "email" OU "já existe"

3. "Arrange: Senha fraca | Act: POST register com senha < 6 char | Assert: 400"
   - POST register com password = "123"
   - Validar: status 400
   - Validar: message menciona "senha" OU "comprimento"

4. "Arrange: Dados incompletos | Act: POST register faltando campos | Assert: 400"
   - POST register SEM email
   - POST register SEM password
   - POST register SEM name
   - Todos devem retornar 400 com mensagem clara
```

### 3. Testes de Isolamento Multi-tenant

**Arquivo**: `tests/integration/tenant-isolation.spec.ts`

**Casos de teste**:

```
Describe: Isolamento Multi-tenant

1. "Arrange: Dois tenants diferentes | Act: Cada um cria seu business | Assert: Dados isolados"
   - Criar tenant1 + business1 + user1
   - Criar tenant2 + business2 + user2
   - Token de user1 -> GET /api/businesses
   - Validar: retorna APENAS business1 (não vê business2)
   - Token de user2 -> GET /api/businesses
   - Validar: retorna APENAS business2 (não vê business1)

2. "Arrange: Dois customers em tenants diferentes | Act: Acessa dados | Assert: Isolado"
   - Criar tenant1 + customer1
   - Criar tenant2 + customer2
   - Token de customer1 -> GET /api/appointments
   - Validar: vê APENAS agendamentos de tenant1
   - Token de customer2 -> GET /api/appointments
   - Validar: vê APENAS agendamentos de tenant2

3. "Arrange: Middleware /t/[slug] | Act: Acessa com slug correto/incorreto | Assert: Validado"
   - GET /t/slug-correto -> 200 (página carrega)
   - GET /t/slug-invalido -> 404 ou redireciona
   - GET /t/slug-de-outro-business com token de negócio A -> 403

4. "Arrange: Token sem businessId (customer) | Act: Acessa /t/[qualquer-slug] | Assert: 200"
   - Token de customer (sem businessId)
   - GET /t/slug-aleatorio com customer token
   - Validar: 200 (clientes acessam qualquer tenant)

5. "Arrange: Token com businessId errado | Act: Acessa /t/[outro-slug] | Assert: 403"
   - Criar user com businessId = "biz-A"
   - Token desse user
   - GET /t/slug-de-outro-business
   - Validar: 403 (Forbidden)
```

### 4. Testes de Middleware

**Arquivo**: `tests/unit/middleware.spec.ts`

**Casos de teste**:

```
Describe: Middleware de Autenticação

1. "Arrange: Token válido no header | Act: Middleware processa | Assert: Passa"
   - Criar middleware request com Authorization header
   - Validar: request prossegue sem bloquear

2. "Arrange: Token expirado | Act: Middleware processa | Assert: Pode bloquear ou avisar"
   - Validar comportamento atual (permite ou bloqueia)

3. "Arrange: Token malformado | Act: Middleware processa | Assert: Rejeita"
   - Token inválido
   - Validar: erro apropriado
```

---

## ESTRUTURA DE ARQUIVOS

Criar:
```
tests/
├── integration/
│   ├── auth.spec.ts                 # Login tests
│   ├── auth-register.spec.ts        # Register tests
│   └── tenant-isolation.spec.ts     # Multi-tenant tests
└── unit/
    ├── auth.spec.ts                 # ✅ JÁ EXISTE (9 testes)
    └── middleware.spec.ts           # Novo
```

---

## PADRÕES OBRIGATÓRIOS

### 1. Cada teste começa LIMPO
```typescript
afterEach(async () => {
  await cleanupDatabase()  // Limpa BD entre testes
})
```

### 2. AAA Pattern em Português
```typescript
it('Arrange: Dados iniciais | Act: Ação | Assert: Validação', async () => {
  // Arrange (preparação)
  const user = await createUser(...)
  
  // Act (execução)
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email: user.email, password: 'Test@1234' })
  
  // Assert (validação)
  expect(response.status).toBe(200)
  expect(response.body.token).toBeDefined()
})
```

### 3. Usar Factories, Nunca Hard-code
```typescript
// ✅ BOM
const user = await createUser(business.id)

// ❌ RUIM
const user = await prisma.user.create({
  data: { /* ... */ }
})
```

### 4. Testar Comportamento, Não Implementação
```typescript
// ✅ BOM (testa resultado)
expect(response.status).toBe(200)
expect(response.body.token).toBeDefined()

// ❌ RUIM (testa implementação)
expect(bcrypt.compare).toHaveBeenCalled()
```

---

## IMPORTS NECESSÁRIOS

```typescript
import request from 'supertest'
import { createBusiness, createUser, createCustomer } from '@/tests/fixtures/factories'
import { createAuthHeaders, createCustomerToken } from '@/tests/helpers/auth'
import { cleanupDatabase } from '@/tests/setup/db'
import { getPrisma } from '@/tests/setup/db'

// Se testar rotas Next.js:
import handler from '@/app/api/auth/login/route'
```

---

## COMO RODAR OS TESTES

```bash
# Ter BD rodando
docker-compose -f docker-compose.test.yml up -d

# Terminal separado
export $(cat .env.test | xargs)
npm run test:integration

# Ou só os testes que você escreveu
npm test -- tests/integration/auth.spec.ts
```

---

## ANTI-BURRICE (Regras pra IA não criar testes burros)

❌ **NÃO FAÇA**:
- Mock de BD quando temos container real
- Testes que passam sempre (sem Assert que falha)
- Criar dados com hard-code (usar factories)
- Testar "Alguém chamou a função X" (testar comportamento final)
- Deixar estado entre testes (sempre cleanup)
- Testes com names genéricos ("Should work")

✅ **FAÇA**:
- Teste com BD real
- Assert que FALHA se código quebra
- Factories reutilizáveis
- Testar resultado final (status, dados retornados)
- Cleanup automático com `afterEach`
- Names descritivos com Arrange|Act|Assert

---

## DELIVERABLES ESPERADOS

Ao terminar, mandar:

1. ✅ `tests/integration/auth.spec.ts` (5 casos de teste)
2. ✅ `tests/integration/auth-register.spec.ts` (4 casos)
3. ✅ `tests/integration/tenant-isolation.spec.ts` (5 casos)
4. ✅ `tests/unit/middleware.spec.ts` (3 casos)
5. ✅ Todos os testes PASSANDO (`npm run test:integration` = "Test Suites: 4 passed")
6. ✅ Coverage em torno de 60%+ (ou mais)
7. ✅ Atualizar TESTING.md com novos testes

Total esperado: **~17 novos testes, todos passando**

---

## REFERÊNCIAS NO PROJETO

- [TESTING.md](./TESTING.md) - Guia de testes
- [PHASE_1_COMPLETE.md](./PHASE_1_COMPLETE.md) - Status FASE 1
- [tests/unit/auth.spec.ts](./tests/unit/auth.spec.ts) - Exemplo de teste
- [tests/helpers/auth.ts](./tests/helpers/auth.ts) - Helpers prontos
- [tests/fixtures/factories.ts](./tests/fixtures/factories.ts) - Factories prontos
- [jest.config.js](./jest.config.js) - Config
- [.github/workflows/ci.yml](./.github/workflows/ci.yml) - CI/CD

---

## CHECKLIST PRÉ-IMPLEMENTAÇÃO

Antes de começar, valide:

- [ ] FASE 1 está completa (`npm test -- tests/unit/auth.spec.ts` = 9/9 passing)
- [ ] DB de teste rodando (`docker-compose -f docker-compose.test.yml up`)
- [ ] `.env.test` carregado (`export $(cat .env.test | xargs)`)
- [ ] Node modules instalados (`npm install`)
- [ ] Prisma gerado (`npm run postinstall`)

Se algum falhar, rodar:
```bash
npm install
npx prisma generate
docker-compose -f docker-compose.test.yml up -d
export $(cat .env.test | xargs)
npx prisma migrate deploy --skip-generate
npm test -- tests/unit/auth.spec.ts  # Validar FASE 1
```

---

## PRÓXIMAS FASES (depois de FASE 2)

**FASE 3** (Testes de Fluxo):
- Agendamento completo (create → confirm → WhatsApp)
- Financeiro (calcular comissões)
- Dilutivo (recipe writeoff)

**FASE 4** (E2E com Cypress/Playwright):
- Login no navegador
- Agendamento via UI
- Multi-tenant isolamento visual

**FASE 5** (Performance + Security):
- Load tests (k6)
- SAST (Semgrep)
- Dependency audit (npm audit)

---

**Criado por**: Copilot  
**Data**: 2026-01-12  
**Tempo para FASE 2**: ~1-2 horas  
**Total de Testes ao fim FASE 2**: ~26 (9 unit + 17 integration)  
**Coverage esperado**: 60-70%

**Próximo comando**:
```bash
npm run test:integration  # Rodar assim que terminar
```

---

*Este superprompt é suficiente e independente. Você pode copiar tudo acima, dar pra outra IA, e ela consegue implementar FASE 2 sozinha, sem pedir esclarecimentos.*
