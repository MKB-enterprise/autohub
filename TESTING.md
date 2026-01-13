# 🧪 Guia de Testes - AutoHub

## Início Rápido

### 1. Instalar Dependências

```bash
npm install
```

Isso instala:
- `jest` - Framework de testes
- `@testing-library/react` - Testes de componentes React
- `supertest` - Testes de API routes
- `@faker-js/faker` - Geração de dados fake

### 2. Preparar Banco de Testes

```bash
# Subir PostgreSQL em container (porta 5433)
docker-compose -f docker-compose.test.yml up -d

# Aguardar ~5s para banco inicializar, depois:
# Carregar variáveis de ambiente de teste
export $(cat .env.test | xargs)

# Rodar migrações no banco de teste
npx prisma migrate deploy --skip-generate
```

### 3. Rodar Testes

```bash
# Todos os testes
npm test

# Apenas testes unitários
npm run test:unit

# Apenas integração
npm run test:integration

# Com cobertura
npm run test:coverage

# Modo watch (reexecuta quando arquivo muda)
npm run test:watch

# CI mode (exatamente como roda no GitHub Actions)
npm run test:ci
```

---

## 📁 Estrutura de Testes

```
tests/
├── setup/
│   └── db.ts                    # Setup isolado de banco (limpeza entre testes)
├── helpers/
│   └── auth.ts                  # Helpers de JWT, tokens, headers
├── fixtures/
│   └── factories.ts             # Factories (createUser, createBusiness, etc)
├── unit/
│   └── auth.spec.ts             # Testes unitários de autenticação
└── integration/
    ├── tenant-isolation.spec.ts # Testes multi-tenant
    ├── auth.spec.ts             # Testes de rota de auth
    └── appointments.spec.ts     # Testes de fluxo de agendamento
```

---

## 🎯 Padrão de Escrita: AAA (Arrange-Act-Assert)

Todos os testes seguem este padrão com comentários em português:

```typescript
describe('Descrição do comportamento', () => {
  it('Arrange: Dados iniciais | Act: Ação | Assert: Resultado esperado', () => {
    // Arrange (Preparar dados)
    const customerId = 'customer-123'
    
    // Act (Executar ação)
    const token = createCustomerToken(customerId)
    
    // Assert (Verificar resultado)
    expect(token).toBeDefined()
    expect(verifyJWTToken(token).customerId).toBe(customerId)
  })
})
```

---

## 🏭 Factories (Arrange automático)

Use factories para criar dados de teste sem duplicação:

```typescript
import { createTenant, createCustomer, createAppointment } from '@/tests/fixtures/factories'

// Cria um tenant
const tenant = await createTenant()

// Cria um cliente dentro do tenant
const customer = await createCustomer(tenant.id)

// Cria um agendamento para o cliente
const car = await createCar(customer.id)
const appointment = await createAppointment(
  'business-id',
  customer.id,
  car.id
)
```

---

## 🔐 Helpers de Autenticação

```typescript
import {
  createCustomerToken,
  createBusinessToken,
  createAuthHeaders,
  verifyJWTToken,
} from '@/tests/helpers/auth'

// Token de cliente (sem businessId)
const customerToken = createCustomerToken('customer-123', 'test@example.com')

// Token de admin/employee (com businessId)
const adminToken = createBusinessToken('biz-123', 'user-456', 'admin@test.com')

// Headers prontos pra usar em requisições HTTP
const headers = createAuthHeaders(customerToken)
// Resultado: { Authorization: 'Bearer eyJ...', 'Content-Type': 'application/json' }

// Validar token
const payload = verifyJWTToken(customerToken)
console.log(payload.customerId) // 'customer-123'
```

---

## 🗄️ Limpeza Automática de Banco

Após cada teste, o banco é limpo para evitar contaminação entre testes:

```typescript
import { cleanupDatabase } from '@/tests/setup/db'

afterEach(async () => {
  // Automático - jest.setup.js cuida disso
  await cleanupDatabase()
})
```

---

## ✅ Fluxos Críticos Testados

### FASE 1 (Obrigatório)
- [x] Autenticação JWT (tokens válidos, expirados, inválidos)
- [x] Isolamento multi-tenant (clientes não veem dados uns dos outros)
- [x] Factories funcionando (criar dados de teste)
- [x] CI rodando (GitHub Actions)

### FASE 2 (Próximo)
- [ ] Rota POST /api/auth/login (401, 200)
- [ ] Rota POST /api/auth/register (409, 400, 201)
- [ ] Middleware validando tokens
- [ ] Tenant resolver funcionando

### FASE 3 (Depois)
- [ ] Fluxo de agendamento completo
- [ ] Confirmação via WhatsApp
- [ ] Cálculo de financeiro
- [ ] Receitas dilutivas

---

## 🔍 Coverage

```bash
npm run test:coverage
```

Gera relatório em `coverage/` com cobertura por arquivo.

**Meta**: 80%+ de cobertura antes de fazer PR.

---

## 🚀 CI/CD

### Em Pull Request:
```bash
npm run lint          # ESLint
npx tsc --noEmit      # TypeScript
npm run test:ci       # Testes com coverage
```

Se algum falhar, PR não pode ser merged. ✅ **Bloqueio automático**.

### Em merge pra main:
- Roda testes novamente
- Roda build Next.js
- Envia coverage pra Codecov

---

## 🐛 Debugging de Testes

```bash
# Rodar um arquivo específico
npm test -- tests/unit/auth.spec.ts

# Rodar apenas um teste (usar .only)
npm test -- tests/unit/auth.spec.ts --testNamePattern="Arrange: Token válido"

# Com logs detalhados
npm test -- --verbose

# Modo debug (chrome://inspect)
node --inspect-brk node_modules/.bin/jest --runInBand
```

---

## 📊 Exemplo: Teste de Integração

```typescript
import { createBusiness, createCustomer, createAppointment } from '@/tests/fixtures/factories'
import { cleanupDatabase } from '@/tests/setup/db'
import { createCustomerToken, createAuthHeaders } from '@/tests/helpers/auth'

describe('Fluxo de Agendamento', () => {
  afterEach(async () => {
    await cleanupDatabase()
  })

  it('Arrange: Cliente + carro + serviço | Act: Agenda | Assert: Criado com sucesso', async () => {
    // Arrange
    const tenant = await createTenant()
    const customer = await createCustomer(tenant.id)
    const car = await createCar(customer.id)
    const business = await createBusiness(tenant.id)
    const service = await createService(business.id)
    
    const token = createCustomerToken(customer.id)
    const headers = createAuthHeaders(token)
    
    // Act
    const response = await fetch('/api/appointments', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        customerId: customer.id,
        carId: car.id,
        services: [service.id],
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }),
    })
    
    // Assert
    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data.appointment.customerId).toBe(customer.id)
    expect(data.appointment.carId).toBe(car.id)
  })
})
```

---

## ❓ FAQ

**P: Por que maxWorkers=1?**  
R: Banco de testes é sequencial (evita deadlock com Prisma).

**P: Como debugar erro de isolamento multi-tenant?**  
R: Use `cleanupDatabase()` explicitamente entre testes.

**P: Preciso de dados reais ou mocks?**  
R: Banco real em container (Docker). Mocks só para APIs externas.

**P: Por que .env.test separado?**  
R: Usa DB de teste, JWT_SECRET de teste, não conecta com produção.

---

## 📚 Leitura Recomendada

- [Jest docs](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)
- [Prisma Testing](https://www.prisma.io/docs/guides/testing)
- [Padrão AAA](https://testingjavascript.com/)

---

**Última atualização**: 2026-01-12  
**Mantido por**: Copilot (AutoHub FASE 1)
