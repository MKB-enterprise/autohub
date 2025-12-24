# 🔄 Guia de Migração para Multi-Tenant

## ⚠️ IMPORTANTE: Leia Antes de Aplicar

Este guia explica como aplicar todas as mudanças no seu sistema. **Backup do banco de dados é essencial** antes de prosseguir.

---

## 📋 Checklist de Mudanças Implementadas

### ✅ Banco de Dados
- [x] Schema Prisma atualizado com modelos multi-tenant
- [x] Arquivo de migração criado (`20251223_multi_tenant_setup`)
- [x] Novos modelos: `Business`, `BusinessSettings`, `ServicePackage`, `AppointmentCancellation`, `CustomerRating`, `NotificationTemplate`, `NotificationLog`
- [x] Todos os modelos antigos agora incluem `businessId`

### ✅ Autenticação
- [x] `AuthContext` atualizado para suportar Business
- [x] Novos métodos: `loginBusiness`, `registerBusiness`, `loginCustomer`, `registerCustomer`
- [x] JWT Token agora suporta tanto `customerId` quanto `businessId`

### ✅ APIs
- [x] `/api/auth/business/register` - Registrar estética
- [x] `/api/auth/business/login` - Login de estética
- [x] `/api/appointments/[id]/cancellation/*` - Cancelamento de agendamentos
- [x] `/api/settings/business` - Configurações gerais
- [x] `/api/settings/notifications` - Templates de notificações
- [x] `/api/settings/packages` - Pacotes de serviços

### ✅ Serviços (Services)
- [x] `notificationService.ts` - Serviço de notificações
- [x] `packageService.ts` - Serviço de pacotes

### ✅ Documentação
- [x] `MULTI_TENANT_GUIDE.md` - Guia completo de uso
- [x] `MIGRATION_GUIDE.md` - Este arquivo

---

## 🚀 Passo a Passo para Aplicar as Mudanças

### Passo 1: Fazer Backup

```bash
# PostgreSQL
pg_dump seu_banco_nome > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Passo 2: Atualizar Dependências (se necessário)

```bash
npm install
```

### Passo 3: Aplicar Migração Prisma

```bash
# Verificar o status das migrações
npx prisma migrate status

# Aplicar a migração
npx prisma migrate deploy

# Ou, em desenvolvimento
npx prisma db push
```

### Passo 4: Regenerar Cliente Prisma

```bash
npx prisma generate
```

### Passo 5: Testar

```bash
npm run dev
```

---

## 🔑 Variáveis de Ambiente Necessárias

Certifique-se que seu `.env` ou `.env.local` contém:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/agenda_automotiva"
JWT_SECRET="sua_chave_secreta_muito_segura_aqui"
NODE_ENV="development"
```

---

## 📝 Mudanças em Componentes Existentes

### 1. Atualizar Componentes que Usam `useAuth()`

**Antes:**
```tsx
const { user } = useAuth()
if (user?.isAdmin) {
  // ...
}
```

**Depois:**
```tsx
const { user, business } = useAuth()
if (user?.isAdmin || business) {
  // ... para admins de clientes
  // ... para admins de estéticas
}
```

### 2. Chamar APIs com `businessId`

Todas as APIs agora precisam que o usuário esteja autenticado (o `businessId` vem do token JWT).

**Exemplo de chamada:**
```typescript
const response = await fetch('/api/settings/business', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

---

## 🛠️ Exemplos de Uso

### Exemplo 1: Registrar e Configurar uma Estética

```javascript
// 1. Registrar
const registerRes = await fetch('/api/auth/business/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Estética Premium',
    email: 'admin@estetica.com',
    password: 'senha123'
  })
})

const { token } = await registerRes.json()
localStorage.setItem('token', token)

// 2. Configurar notificações
await fetch('/api/settings/notifications', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'APPOINTMENT_24H_REMINDER',
    title: 'Lembrete do seu agendamento',
    body: 'Você tem um agendamento amanhã às {appointmentTime}',
    isActive: true
  })
})

// 3. Criar pacote
await fetch('/api/settings/packages', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Combo Completo',
    description: 'Lavagem + Polimento + Proteção',
    discountPercent: 20,
    serviceIds: ['service_1', 'service_2', 'service_3']
  })
})
```

### Exemplo 2: Cliente Registrando em uma Estética

```javascript
// Cliente precisa saber o businessId da estética
const businessId = 'business_xyz'

const registerRes = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'João Silva',
    email: 'joao@email.com',
    phone: '11999999999',
    password: 'senha123',
    businessId: businessId,
    userType: 'customer'
  })
})
```

---

## ⚡ Performance e Índices

O schema inclui índices para otimizar queries:

```sql
-- Índices criados automaticamente
- appointments(business_id, start_datetime)
- appointments(business_id, status)
- notification_logs(business_id, sent_at)
- services(business_id, name) UNIQUE
- categories(business_id, name) UNIQUE
- customers(business_id, phone) UNIQUE
- cars(business_id, plate) UNIQUE
```

---

## 🔒 Segurança

### Validações Implementadas

1. ✅ Verificação de `businessId` em todas as requisições admin
2. ✅ Isolamento de dados por tenant
3. ✅ Hashing de senhas com bcrypt
4. ✅ JWT com expiração
5. ✅ Validação de status de assinatura

### O Que Você Ainda Precisa Fazer

1. **Rate Limiting**: Implementar nas APIs de login
2. **HTTPS**: Usar em produção
3. **CORS**: Configurar domínios permitidos
4. **2FA**: Implementar para contas de negócio
5. **Auditoria**: Log de ações administrativas

---

## 🐛 Troubleshooting

### Erro: "relation 'businesses' does not exist"

**Solução:**
```bash
npx prisma migrate deploy
npx prisma generate
npm run dev
```

### Erro: "businessId não encontrado"

**Causa**: Cliente/Admin não está autenticado corretamente

**Solução**: Verificar se o token JWT está sendo enviado

### Dados Duplicados ou Corrompidos

Se algo der errado, você pode restaurar:

```bash
# Restaurar banco de dados
psql seu_banco_nome < backup_arquivo.sql

# Refazer o schema
npx prisma db push
```

---

## 📊 Estrutura de Dados Esperada Após Migração

```
databases
├── businesses (nova)
│   ├── id
│   ├── name
│   ├── email
│   ├── subscriptionPlan
│   └── ...
│
├── business_settings (nova)
│   ├── businessId → businesses(id)
│   ├── notificationsEnabled
│   ├── packagesEnabled
│   └── ...
│
├── service_packages (nova)
│   ├── businessId → businesses(id)
│   └── ...
│
├── notification_templates (nova)
│   ├── businessId → businesses(id)
│   └── ...
│
├── customers (atualizado)
│   ├── businessId → businesses(id) [NOVO]
│   └── ...
│
├── services (atualizado)
│   ├── businessId → businesses(id) [NOVO]
│   └── ...
│
└── ... (todos com businessId agora)
```

---

## 🎯 Próximas Etapas Sugeridas

1. **Criar Interface de Administração**
   - Painel de configurações
   - Gerenciar pacotes
   - Customizar notificações

2. **Implementar Notificações Reais**
   - Integrar SendGrid/Mailgun para Email
   - Integrar Twilio para SMS
   - Integrar WhatsApp Business API

3. **Sistema de Pagamento**
   - Integrar Stripe/MercadoPago
   - Validar assinatura antes de usar features

4. **Relatórios**
   - Dashboard com gráficos
   - Exportar para PDF/Excel

5. **Mobile App**
   - React Native
   - Sincronizar agendamentos em tempo real

---

## 📞 Suporte

Se tiver dúvidas sobre as mudanças, consulte:

1. `MULTI_TENANT_GUIDE.md` - Guia de funcionalidades
2. `prisma/schema.prisma` - Estrutura do banco
3. `/app/api` - Exemplos de APIs
4. `/lib/services` - Serviços implementados

---

## ✅ Checklist Final

- [ ] Backup do banco de dados feito
- [ ] `npm install` executado
- [ ] Migração do Prisma aplicada
- [ ] `npx prisma generate` executado
- [ ] `npm run dev` funciona
- [ ] APIs testadas (registrar estética, login, etc)
- [ ] Componentes atualizados se necessário
- [ ] Testes passando

---

**Data: 23 de Dezembro de 2025**

Todas as mudanças foram aplicadas com sucesso! 🎉
