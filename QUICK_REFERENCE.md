# ⚡ QUICK REFERENCE - Testes AutoHub

## 🚀 Start em 30 segundos

```bash
# 1. BD rodando (mantenha em segundo plano)
docker-compose -f docker-compose.test.yml up -d

# 2. Carregar variáveis
export $(cat .env.test | xargs)

# 3. Rodar migrações (primeira vez)
npx prisma migrate deploy --skip-generate

# 4. Rodar testes
npm test

# Esperado: 9/9 ✅ PASSING
```

---

## 📝 Escrever Novo Teste

### Template Base (copie e adapte)

```typescript
// tests/integration/seu-feature.spec.ts
import { cleanupDatabase } from '@/tests/setup/db'
import { createUser, createBusiness } from '@/tests/fixtures/factories'
import { createAuthHeaders, createBusinessToken } from '@/tests/helpers/auth'

describe('Sua Feature', () => {
  // Limpar BD após cada teste
  afterEach(async () => {
    await cleanupDatabase()
  })

  it('Arrange: Setup | Act: Ação | Assert: Validação', async () => {
    // ARRANGE (preparar dados)
    const business = await createBusiness('tenant-id')
    const user = await createUser(business.id, { email: 'test@example.com' })
    const token = createBusinessToken(business.id, user.id)
    const headers = createAuthHeaders(token)

    // ACT (executar ação)
    const response = await fetch('/api/seu-endpoint', {
      method: 'POST',
      headers,
      body: JSON.stringify({ /* dados */ })
    })

    // ASSERT (validar resultado)
    expect(response.status).toBe(201)
    expect(await response.json()).toHaveProperty('id')
  })
})
```

---

## 🏭 Factories Cheat Sheet

```typescript
import { 
  createTenant,
  createBusiness,
  createUser,
  createCustomer,
  createCar,
  createService,
  createEmployee,
  createAppointment,
  createProduct,
} from '@/tests/fixtures/factories'

// Criar tenant
const tenant = await createTenant()

// Criar business dentro de tenant
const biz = await createBusiness(tenant.id)

// Criar user (funcionário)
const user = await createUser(biz.id)

// Criar customer (cliente)
const customer = await createCustomer(tenant.id)

// Criar carro para cliente
const car = await createCar(customer.id)

// Criar serviço
const service = await createService(biz.id)

// Criar agendamento
const appt = await createAppointment(biz.id, customer.id, car.id)
```

---

## 🔐 Auth Helpers Cheat Sheet

```typescript
import {
  createJWTToken,
  createCustomerToken,
  createBusinessToken,
  verifyJWTToken,
  createAuthHeaders,
  createExpiredToken,
} from '@/tests/helpers/auth'

// Token de cliente (sem businessId - acessa qualquer tenant)
const customerToken = createCustomerToken('customer-123', 'email@test.com')

// Token de admin/user (com businessId - acessa só seu tenant)
const adminToken = createBusinessToken('biz-123', 'user-456', 'admin@test.com')

// Headers prontos pra requisição HTTP
const headers = createAuthHeaders(customerToken)
// Result: { Authorization: 'Bearer eyJ...', 'Content-Type': 'application/json' }

// Validar token
const payload = verifyJWTToken(customerToken)
console.log(payload.customerId)  // 'customer-123'

// Token expirado (pra testar erros)
const expiredToken = createExpiredToken({ email: 'test@test.com' })
```

---

## 🧪 Commands

| Comando | O que faz |
|---------|-----------|
| `npm test` | Rodar todos os testes |
| `npm test -- tests/unit/auth.spec.ts` | Rodar arquivo específico |
| `npm run test:unit` | Só unitários |
| `npm run test:integration` | Só integração |
| `npm run test:watch` | Modo watch (reexecuta ao salvar) |
| `npm run test:coverage` | Gera relatório de cobertura |
| `npm run test:ci` | CI mode (exatamente como GitHub) |

---

## 📊 Test Status Check

```bash
# Ver últimos 10 testes que rodaram
npm test 2>&1 | tail -30

# Ver coverage detalhado
npm run test:coverage
open coverage/lcov-report/index.html  # Abrir no navegador

# Ver testes em tempo real
npm run test:watch
# Apertar 'a' para rodar todos
# Apertar 'f' para rodar only failed
# Apertar 'q' para sair
```

---

## 🐳 Docker DB Commands

```bash
# Subir BD de teste
docker-compose -f docker-compose.test.yml up -d

# Ver status
docker-compose -f docker-compose.test.yml ps

# Ver logs
docker-compose -f docker-compose.test.yml logs postgres-test

# Parar BD
docker-compose -f docker-compose.test.yml down

# Parar + deletar dados
docker-compose -f docker-compose.test.yml down -v

# Acessar BD via terminal
docker exec -it autohub-test-db psql -U test -d autohub_test

# SQL direto
docker exec autohub-test-db psql -U test -d autohub_test -c "SELECT COUNT(*) FROM users;"
```

---

## 🔍 Debug Testes

```bash
# Um teste específico (use .only)
it.only('Seu teste aqui', () => { /* ... */ })
npm test

# Pular um teste (use .skip)
it.skip('Teste que falta implementar', () => { /* ... */ })

# Verbose output
npm test -- --verbose

# Detalhado mesmo
npm test -- --verbose --listTests

# Só que falharam (se houver)
npm test -- --onlyChanged

# Modo debug (inspecto Chrome)
node --inspect-brk ./node_modules/.bin/jest --runInBand
# Depois: chrome://inspect
```

---

## ❓ Troubleshooting Rápido

| Erro | Solução |
|------|---------|
| `ECONNREFUSED localhost:5433` | `docker-compose -f docker-compose.test.yml up -d` |
| `Database does not exist` | `npx prisma migrate deploy --skip-generate` |
| `MODULE_NOT_FOUND` | `npm install` |
| `@/ not found` | Verificar tsconfig.json paths |
| `Tests hanging` | Ctrl+C, rodar `npm test -- --forceExit` |
| `.env.test not found` | Já está criado, se não: cria localizado aqui |

---

## 📚 Estrutura de Diretórios

```
tests/
├── setup/
│   └── db.ts              ← Cleanup automático
├── helpers/
│   └── auth.ts            ← JWT, tokens, headers
├── fixtures/
│   └── factories.ts       ← Criar dados fake
├── unit/
│   └── auth.spec.ts       ← 9 testes unitários ✅
└── integration/
    ├── auth.spec.ts       ← (FASE 2)
    └── appointments.spec.ts  ← (FASE 3)
```

---

## 🎯 AAA Pattern (Padrão de Escrita)

```typescript
it('Arrange: Dados | Act: Ação | Assert: Validação', () => {
  // 🔴 ARRANGE (preparar)
  const x = 5
  const y = 3

  // 🟡 ACT (executar)
  const result = x + y

  // 🟢 ASSERT (validar)
  expect(result).toBe(8)
})
```

**SEMPRE use este padrão**.

---

## 🚀 Próximas Fases

### FASE 1 ✅ (Agora)
- Jest setup
- Factories
- Helpers auth
- 9 testes unitários

### FASE 2 🟡 (Próxima)
- Testes de rota API
- 17 novos testes integration
- Coverage 60%+

### FASE 3 ⭕ (Depois)
- Testes de fluxo completo
- 20 novos testes
- Coverage 80%+

### FASE 4 ⭕ (Final)
- E2E (Cypress/Playwright)
- Performance tests
- Coverage 90%+

---

## 📄 Documentação Completa

- **[TESTING.md](./TESTING.md)** - Guia detalhado
- **[PHASE_1_COMPLETE.md](./PHASE_1_COMPLETE.md)** - Status FASE 1
- **[TESTING_DASHBOARD.md](./TESTING_DASHBOARD.md)** - Overview completo
- **[SUPERPROMPT_FASE2.md](./SUPERPROMPT_FASE2.md)** - Próxima fase (pra IA)

---

## ⏱️ Tempos Típicos

| Ação | Tempo |
|------|-------|
| `npm install` | 30s |
| `npm test` (9 tests) | 7s |
| `npm run test:coverage` | 15s |
| `docker-compose up` | 5s |
| `npx prisma migrate` | 3s |

---

## 👍 Best Practices

✅ DO:
- Cleanup automático (`afterEach`)
- Factories para todos os dados
- Testar comportamento (não implementação)
- Um assert por teste (ou tightly related)
- Nomes descritivos com Arrange|Act|Assert

❌ DON'T:
- Hard-code dados (usar factories)
- Mockar BD (usar real)
- Testes que sempre passam
- Test implementation details
- Deixar estado entre testes

---

## 🎓 Exemplos Rápidos

### Teste de Login
```typescript
it('Arrange: User válido | Act: POST login | Assert: 200 + token', async () => {
  const business = await createBusiness('tenant-id')
  const user = await createUser(business.id)
  
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: user.email,
      password: 'Test@1234'
    })
  })
  
  expect(response.status).toBe(200)
  expect(await response.json()).toHaveProperty('token')
})
```

### Teste de Isolamento Multi-tenant
```typescript
it('Arrange: 2 tenants | Act: Acessa dados | Assert: Isolado', async () => {
  const t1 = await createTenant()
  const t2 = await createTenant()
  const b1 = await createBusiness(t1.id)
  const b2 = await createBusiness(t2.id)
  const u1 = await createUser(b1.id)
  
  const token = createBusinessToken(b1.id, u1.id)
  const headers = createAuthHeaders(token)
  
  const response = await fetch('/api/businesses', { headers })
  const businesses = await response.json()
  
  // u1 só vê seu próprio business
  expect(businesses).toHaveLength(1)
  expect(businesses[0].id).toBe(b1.id)
})
```

---

## 💾 Save & Reload

```bash
# Salvar progresso
git add .
git commit -m "feat: add tests"
git push

# CI roda automaticamente
# Se passar → ✅ Deploy ready
# Se falhar → Avisos no GitHub

# Puxar changes (outro dev)
git pull
npm install
docker-compose -f docker-compose.test.yml up -d
npm test
```

---

**Last Updated**: 2026-01-12  
**Versão**: 1.0  
**Status**: ✅ READY  

Salve este arquivo como bookmark! 🔖
