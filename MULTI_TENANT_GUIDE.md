# 🚀 Sistema Multi-Tenant com Configurações Avançadas

## Visão Geral

O sistema foi refatorado para suportar múltiplas estéticas (negócios), cada uma com sua própria:
- Clientes independentes
- Serviços e categorias
- Agendamentos
- Configurações personalizadas
- Pacotes de serviços com desconto
- Templates de notificações customizáveis

## 🔐 Autenticação Multi-Tenant

### Fluxo de Negócio (Estética)

```
1. Registro: POST /api/auth/business/register
2. Login: POST /api/auth/business/login
3. Headers: Incluir token JWT no header Authorization
```

#### Exemplo: Registrar uma Estética

```bash
POST /api/auth/business/register
Content-Type: application/json

{
  "name": "Estética Premium",
  "email": "admin@estetica.com",
  "phone": "+55 11 99999-9999",
  "password": "senha_segura_123"
}

Response:
{
  "business": {
    "id": "business_123",
    "name": "Estética Premium",
    "email": "admin@estetica.com",
    "subscriptionPlan": "BASIC"
  },
  "token": "eyJhbGc..."
}
```

#### Exemplo: Login de Estética

```bash
POST /api/auth/business/login
Content-Type: application/json

{
  "email": "admin@estetica.com",
  "password": "senha_segura_123"
}

Response:
{
  "business": {
    "id": "business_123",
    "name": "Estética Premium",
    "email": "admin@estetica.com",
    "subscriptionPlan": "BASIC"
  },
  "token": "eyJhbGc..."
}
```

### Fluxo de Cliente

```
1. Registro: POST /api/auth/register (com businessId)
2. Login: POST /api/auth/login (com businessId)
```

---

## ⚙️ Configurações de Negócio

### 1. Configurações Gerais

**GET /api/settings/business**
- Obter todas as configurações

**PATCH /api/settings/business**
- Atualizar configurações

Campos configuráveis:
- `openingTimeWeekday`: Horário de abertura
- `closingTimeWeekday`: Horário de fechamento
- `slotIntervalMinutes`: Intervalo entre slots (em minutos)
- `maxCarsPerSlot`: Máximo de carros por slot
- `timezone`: Fuso horário
- `reputationEnabled`: Ativar sistema de reputação
- `reputationAdvancePercent`: % de desconto para clientes com boa reputação
- `notificationsEnabled`: Ativar notificações
- `notificationChannel`: 'email' | 'sms' | 'whatsapp'
- `packagesEnabled`: Ativar pacotes de serviços

**Exemplo:**

```bash
PATCH /api/settings/business
Authorization: Bearer {token}
Content-Type: application/json

{
  "openingTimeWeekday": "08:00",
  "closingTimeWeekday": "18:00",
  "slotIntervalMinutes": 30,
  "maxCarsPerSlot": 5,
  "timezone": "America/Sao_Paulo",
  "notificationsEnabled": true,
  "notificationChannel": "email",
  "notifyOn24hBefore": true,
  "notifyOn1hBefore": true,
  "packagesEnabled": true
}
```

---

## 🔔 Sistema de Notificações Configurável

### Tipos de Templates Disponíveis

- `APPOINTMENT_CREATED` - Quando agendamento é criado
- `APPOINTMENT_CONFIRMED` - Quando agendamento é confirmado
- `APPOINTMENT_CANCELED` - Quando agendamento é cancelado
- `APPOINTMENT_RESCHEDULED` - Quando agendamento é reagendado
- `APPOINTMENT_24H_REMINDER` - Lembrete 24h antes
- `APPOINTMENT_1H_REMINDER` - Lembrete 1h antes
- `APPOINTMENT_COMPLETED` - Quando serviço é concluído

### Variáveis Disponíveis para Templates

```
{customerName} - Nome do cliente
{appointmentDate} - Data do agendamento (formato: DD/MM/YYYY)
{appointmentTime} - Hora do agendamento (formato: HH:MM)
{serviceName} - Nome do serviço
{servicesList} - Lista de serviços separada por vírgula
{businessName} - Nome da estética
```

### APIs de Notificação

**GET /api/settings/notifications**
- Listar todos os templates de notificação

**PUT /api/settings/notifications**
- Criar ou atualizar template

**Exemplo: Atualizar Template**

```bash
PUT /api/settings/notifications
Authorization: Bearer {token}
Content-Type: application/json

{
  "type": "APPOINTMENT_24H_REMINDER",
  "title": "Lembrete: Seu agendamento é amanhã!",
  "body": "Olá {customerName}, não esqueça do seu agendamento amanhã às {appointmentTime}. Estamos esperando por você!",
  "isActive": true
}
```

---

## 📦 Pacotes de Serviços com Desconto

Criar combos de serviços com desconto automático.

### APIs de Pacotes

**GET /api/settings/packages**
- Listar todos os pacotes

**POST /api/settings/packages**
- Criar novo pacote

**PATCH /api/settings/packages/[id]**
- Atualizar pacote

**DELETE /api/settings/packages/[id]**
- Deletar pacote

### Exemplo: Criar Pacote

```bash
POST /api/settings/packages
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Combo Completo",
  "description": "Lavagem + Polimento + Proteção",
  "discountPercent": 15,
  "serviceIds": ["service_1", "service_2", "service_3"]
}

Response:
{
  "id": "package_1",
  "businessId": "business_123",
  "name": "Combo Completo",
  "description": "Lavagem + Polimento + Proteção",
  "discountPercent": 15,
  "isActive": true,
  "services": [
    {
      "serviceId": "service_1",
      "service": {
        "id": "service_1",
        "name": "Lavagem",
        "price": 50.00,
        "durationMinutes": 30
      }
    },
    // ... mais serviços
  ],
  "createdAt": "2025-12-23T10:00:00Z"
}
```

### Cálculo de Preço com Desconto

```javascript
// Exemplo: 3 serviços de R$ 50 com 15% de desconto
const services = [
  { price: 50 },
  { price: 50 },
  { price: 50 }
]
const discountPercent = 15

const subtotal = 150
const discount = 150 * (15 / 100) = 22.50
const finalPrice = 150 - 22.50 = 127.50
```

---

## ❌ Cancelamento de Agendamentos

### API de Cancelamento

**POST /api/appointments/[id]/cancel**
- Cancelar agendamento

**GET /api/appointments/[id]/cancellation**
- Obter detalhes do cancelamento

**DELETE /api/appointments/[id]/cancellation**
- Remover cancelamento (admin only)

### Exemplo: Cancelar Agendamento

```bash
POST /api/appointments/abc123/cancel
Authorization: Bearer {token}
Content-Type: application/json

{
  "reason": "Cliente solicitou cancelamento",
  "notes": "Cliente será contatado para reagendamento"
}

Response:
{
  "id": "cancellation_1",
  "appointmentId": "abc123",
  "reason": "Cliente solicitou cancelamento",
  "canceledBy": "business",
  "notes": "Cliente será contatado para reagendamento",
  "createdAt": "2025-12-23T10:00:00Z"
}
```

---

## 📊 Dados e Estrutura do Banco

### Modelos Principais

#### Business
```prisma
model Business {
  id: String (PK)
  name: String
  email: String (UNIQUE)
  phone: String?
  subscriptionPlan: BASIC | PROFESSIONAL | ENTERPRISE
  subscriptionStatus: ACTIVE | PAUSED | CANCELED | EXPIRED
  monthlyPrice: Decimal
  isActive: Boolean
  createdAt: DateTime
  updatedAt: DateTime
}
```

#### BusinessSettings
```prisma
model BusinessSettings {
  id: String (PK)
  businessId: String (FK, UNIQUE)
  // Horário e slots
  openingTimeWeekday: String
  closingTimeWeekday: String
  slotIntervalMinutes: Int
  maxCarsPerSlot: Int
  timezone: String
  // Reputação
  reputationEnabled: Boolean
  reputationAdvancePercent: Int
  reputationMinForAdvance: Decimal
  reputationNoShowPenalty: Decimal
  reputationRecoveryOnShow: Boolean
  // Notificações
  notificationsEnabled: Boolean
  notificationChannel: String
  notifyOn24hBefore: Boolean
  notifyOn1hBefore: Boolean
  // Features
  packagesEnabled: Boolean
}
```

#### ServicePackage
```prisma
model ServicePackage {
  id: String (PK)
  businessId: String (FK)
  name: String
  description: String?
  discountPercent: Decimal
  isActive: Boolean
  services: PackageService[]
  createdAt: DateTime
}
```

#### AppointmentCancellation
```prisma
model AppointmentCancellation {
  id: String (PK)
  businessId: String (FK)
  appointmentId: String (FK, UNIQUE)
  reason: String
  canceledBy: 'customer' | 'business'
  notes: String?
  createdAt: DateTime
}
```

---

## 💳 Planos de Assinatura

### Planos Disponíveis

#### BASIC (R$ 99,99/mês)
- ✅ Até 50 clientes
- ✅ Agendamentos básicos
- ✅ 1 usuário admin
- ❌ Pacotes de serviços
- ❌ Notificações avançadas
- ❌ Relatórios detalhados

#### PROFESSIONAL (R$ 249,99/mês)
- ✅ Até 500 clientes
- ✅ Agendamentos avançados
- ✅ 5 usuários admin
- ✅ Pacotes de serviços
- ✅ Notificações (Email, SMS)
- ✅ Relatórios básicos

#### ENTERPRISE (Custom)
- ✅ Clientes ilimitados
- ✅ Todas as features
- ✅ Usuários ilimitados
- ✅ Notificações (Email, SMS, WhatsApp)
- ✅ Relatórios avançados
- ✅ Suporte prioritário
- ✅ Integração customizada

---

## 🔑 JWT Token Structure

```typescript
{
  customerId?: string      // Para clientes
  businessId?: string      // Para estéticas
  email: string
  isAdmin: boolean
  iat: number
  exp: number
}
```

---

## 📝 Exemplos de Uso Completo

### 1. Setup Inicial de uma Estética

```bash
# 1. Registrar estética
POST /api/auth/business/register
{
  "name": "Estética XYZ",
  "email": "admin@estetica.com",
  "password": "segura123"
}

# 2. Login
POST /api/auth/business/login
{
  "email": "admin@estetica.com",
  "password": "segura123"
}
Token: abc123xyz

# 3. Configurar sistema
PATCH /api/settings/business
Authorization: Bearer abc123xyz
{
  "openingTimeWeekday": "08:00",
  "closingTimeWeekday": "19:00",
  "notificationsEnabled": true,
  "packagesEnabled": true
}

# 4. Criar pacote de serviços
POST /api/settings/packages
Authorization: Bearer abc123xyz
{
  "name": "Combo Lavagem + Polimento",
  "discountPercent": 20,
  "serviceIds": ["srv1", "srv2"]
}

# 5. Customizar templates de notificação
PUT /api/settings/notifications
Authorization: Bearer abc123xyz
{
  "type": "APPOINTMENT_24H_REMINDER",
  "title": "Não esqueça seu agendamento!",
  "body": "Olá {customerName}, seu agendamento é amanhã às {appointmentTime}",
  "isActive": true
}
```

---

## ⚠️ Considerações Importantes

### Isolamento de Dados
- Todos os dados são filtrados por `businessId`
- Clientes de um negócio não veem dados de outro
- Senhas são hash com bcrypt

### Validação de Subscrição
- Sistema verifica status da assinatura no login
- Features são liberadas conforme o plano

### Segurança
- JWT com expiração de 7 dias
- Tokens em HTTP-only cookies
- Rate limiting recomendado nas APIs públicas

---

## 🚀 Próximas Melhorias Sugeridas

1. **Webhook de Pagamento**: Integrar com Stripe/MercadoPago
2. **SMS/WhatsApp**: Integrar Twilio ou similar
3. **Email**: Integrar SendGrid ou similar
4. **Análise e Relatórios**: Dashboard com gráficos
5. **Agendamento em Tempo Real**: WebSocket para notificações
6. **Mobile App**: React Native ou Flutter
7. **2FA**: Autenticação de dois fatores
8. **Auditoria**: Log de todas as ações administrativas
