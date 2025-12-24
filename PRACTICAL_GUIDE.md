# 🎓 Guia Prático: Do Zero ao Negócio Operacional

Este guia mostra passo a passo como usar o novo sistema para colocar uma estética em operação.

---

## 📋 Índice

1. [Setup Inicial](#setup-inicial)
2. [Criar Estética](#criar-estética)
3. [Configurar Sistema](#configurar-sistema)
4. [Criar Serviços](#criar-serviços)
5. [Criar Pacotes](#criar-pacotes)
6. [Customizar Notificações](#customizar-notificações)
7. [Primeira Venda](#primeira-venda)

---

## Setup Inicial

### Pré-requisitos

```bash
# Node.js 18+
node --version

# PostgreSQL rodando
psql --version

# Dependências instaladas
npm install
```

### Iniciar Banco de Dados

```bash
# Aplicar migração
npx prisma migrate deploy

# Gerar cliente Prisma
npx prisma generate

# Opcional: Ver dados no Prisma Studio
npx prisma studio
```

### Iniciar Servidor

```bash
npm run dev
```

Servidor rodando em: `http://localhost:3000`

---

## Criar Estética

### Passo 1: Registrar

```bash
curl -X POST http://localhost:3000/api/auth/business/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Estética Premium Veículos",
    "email": "admin@estetica-premium.com",
    "phone": "11987654321",
    "password": "SenhaSegura123!"
  }'
```

**Response:**
```json
{
  "business": {
    "id": "business_abc123",
    "name": "Estética Premium Veículos",
    "email": "admin@estetica-premium.com",
    "subscriptionPlan": "BASIC"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Guardar:**
- `business_id`: `business_abc123`
- `token`: Para usar nas próximas requisições

### Passo 2: Login (Depois)

```bash
curl -X POST http://localhost:3000/api/auth/business/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@estetica-premium.com",
    "password": "SenhaSegura123!"
  }'
```

---

## Configurar Sistema

### Configurações Gerais

```bash
curl -X PATCH http://localhost:3000/api/settings/business \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "openingTimeWeekday": "08:00",
    "closingTimeWeekday": "19:00",
    "slotIntervalMinutes": 30,
    "maxCarsPerSlot": 4,
    "timezone": "America/Sao_Paulo",
    "reputationEnabled": true,
    "reputationAdvancePercent": 15,
    "notificationsEnabled": true,
    "notificationChannel": "email",
    "notifyOn24hBefore": true,
    "notifyOn1hBefore": false,
    "packagesEnabled": true
  }'
```

**O que significa:**
- Abre às 08:00, fecha às 19:00
- Slots de 30 minutos
- Máximo 4 carros por slot
- Desconto de 15% para clientes com boa reputação
- Enviar email 24h antes do agendamento
- Pacotes com desconto habilitados

---

## Criar Serviços

Você precisa criar serviços primeiro (provavelmente já tem, mas mostramos como):

### Criar Categoria

```bash
curl -X POST http://localhost:3000/api/categories \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Limpeza",
    "description": "Serviços de limpeza"
  }'
```

**Response:**
```json
{
  "id": "cat_123",
  "name": "Limpeza",
  "description": "Serviços de limpeza"
}
```

### Criar Serviços

```bash
# Serviço 1: Lavagem Básica
curl -X POST http://localhost:3000/api/services \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Lavagem Básica",
    "description": "Lavagem externa com shampoo",
    "durationMinutes": 30,
    "price": 50.00,
    "categoryId": "cat_123"
  }'
```

**Response:**
```json
{
  "id": "srv_lavagem_1",
  "name": "Lavagem Básica",
  "price": 50.00,
  "durationMinutes": 30
}
```

```bash
# Serviço 2: Polimento
curl -X POST http://localhost:3000/api/services \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Polimento",
    "description": "Polimento com máquina profissional",
    "durationMinutes": 45,
    "price": 80.00,
    "categoryId": "cat_123"
  }'
```

```bash
# Serviço 3: Proteção Nano
curl -X POST http://localhost:3000/api/services \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Proteção Nanotecnologia",
    "description": "Aplicação de nanotecnologia 5 anos",
    "durationMinutes": 60,
    "price": 120.00,
    "categoryId": "cat_123"
  }'
```

**IDs para guardar:**
- `srv_lavagem_1`
- `srv_polimento_2`
- `srv_nano_3`

---

## Criar Pacotes

Agora crie um combo oferecendo desconto:

```bash
curl -X POST http://localhost:3000/api/settings/packages \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Combo Completo",
    "description": "Lavagem + Polimento + Proteção Nano - Aproveitamento máximo!",
    "discountPercent": 25,
    "serviceIds": ["srv_lavagem_1", "srv_polimento_2", "srv_nano_3"]
  }'
```

**Cálculo:**
```
Lavagem Básica:        R$ 50,00
Polimento:             R$ 80,00
Proteção Nano:         R$ 120,00
                       ─────────
Subtotal:              R$ 250,00
Desconto (25%):       -R$ 62,50
                       ─────────
Preço Final:           R$ 187,50
```

**Cliente economiza R$ 62,50!** 🎉

---

## Customizar Notificações

### Visualizar Templates Atuais

```bash
curl -X GET http://localhost:3000/api/settings/notifications \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### Customizar Lembrete 24h

```bash
curl -X PUT http://localhost:3000/api/settings/notifications \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "APPOINTMENT_24H_REMINDER",
    "title": "🚗 Seu agendamento é AMANHÃ!",
    "body": "Olá {customerName}! Não esqueça: você tem agendamento amanhã às {appointmentTime} na {businessName}. Estamos esperando por você! 🎉",
    "isActive": true
  }'
```

### Customizar Confirmação

```bash
curl -X PUT http://localhost:3000/api/settings/notifications \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "APPOINTMENT_CONFIRMED",
    "title": "✅ Agendamento Confirmado!",
    "body": "Perfeito! Seu agendamento foi confirmado para {appointmentDate} às {appointmentTime}. Serviços: {servicesList}. Valor: R$ XXX",
    "isActive": true
  }'
```

### Customizar Cancelamento

```bash
curl -X PUT http://localhost:3000/api/settings/notifications \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "APPOINTMENT_CANCELED",
    "title": "❌ Agendamento Cancelado",
    "body": "Seu agendamento foi cancelado. Gostaria de reagendar? Entre em contato conosco!",
    "isActive": true
  }'
```

---

## Primeira Venda

### Passo 1: Cliente Se Registra

O cliente acessa: `http://localhost:3000/register`

Ou via API:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João da Silva",
    "email": "joao@email.com",
    "phone": "11999888777",
    "password": "senha123",
    "businessId": "business_abc123"
  }'
```

### Passo 2: Cliente Registra Carro

```bash
curl -X POST http://localhost:3000/api/cars \
  -H "Authorization: Bearer TOKEN_CLIENTE" \
  -H "Content-Type: application/json" \
  -d '{
    "plate": "ABC1D23",
    "model": "Volkswagen Gol 2023",
    "color": "Branco",
    "year": 2023,
    "vehicleType": "HATCH"
  }'
```

### Passo 3: Cliente Cria Agendamento

```bash
curl -X POST http://localhost:3000/api/appointments \
  -H "Authorization: Bearer TOKEN_CLIENTE" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "cust_123",
    "carId": "car_123",
    "startDatetime": "2025-12-24T14:00:00",
    "serviceIds": ["srv_lavagem_1", "srv_polimento_2", "srv_nano_3"],
    "notes": "Veículo é novo, cuidado!"
  }'
```

**Response:**
```json
{
  "id": "appt_456",
  "status": "PENDING",
  "totalPrice": 187.50,
  "startDatetime": "2025-12-24T14:00:00",
  "appointmentServices": [
    {
      "service": { "name": "Lavagem Básica", "price": 50.00 },
      "service": { "name": "Polimento", "price": 80.00 },
      "service": { "name": "Proteção Nano", "price": 120.00 }
    }
  ]
}
```

### 🎉 Primeira Venda Completa!

#### Email Automático Enviado

```
Título: Agendamento Criado
Corpo: Seu agendamento foi criado com sucesso em 24/12/2025 às 14:00
```

#### Sistema Envia Lembrete em 24h

```
Título: 🚗 Seu agendamento é AMANHÃ!
Corpo: Olá João! Não esqueça: você tem agendamento amanhã às 14:00 
       na Estética Premium Veículos. Estamos esperando por você!
```

---

## 📊 Visualizar Estatísticas

### Consultar Logs de Notificações

```bash
curl -X GET "http://localhost:3000/api/settings/notifications/logs" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### Ver Agendamentos do Dia

```bash
curl -X GET "http://localhost:3000/api/appointments?date=2025-12-24&status=CONFIRMED" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### Dashboard Stats

```bash
curl -X GET "http://localhost:3000/api/dashboard/stats" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

**Response:**
```json
{
  "appointmentsToday": 5,
  "appointmentsYesterday": 3,
  "totalClients": 47,
  "clientsGrowth": 12,
  "carsInService": 2,
  "revenueToday": 937.50,
  "revenueAverage": 450.00
}
```

---

## 🔄 Fluxo Completo de Cancelamento

Se um cliente quiser cancelar:

### Cliente Cancela

Informações capturadas:
- Motivo: "Trouxe o carro para outro lugar"
- Data: Automática

### Sistema Registra

```
Appointment ID: appt_456
Status: CANCELED
Reason: "Trouxe o carro para outro lugar"
Canceled By: customer
Timestamp: 2025-12-24 10:30:00
```

### Cliente Recebe Email

```
Título: ❌ Agendamento Cancelado
Corpo: Seu agendamento foi cancelado. 
       Gostaria de reagendar? Entre em contato conosco!
```

---

## 🎓 Dicas Importantes

### 1. Use Postman/Insomnia

Em vez de usar `curl`, use:
- Postman: https://www.postman.com/
- Insomnia: https://insomnia.rest/

Mais fácil de testar APIs!

### 2. Variáveis de Template

Sempre use as variáveis disponíveis:
```
{customerName}      -> João da Silva
{appointmentDate}   -> 24/12/2025
{appointmentTime}   -> 14:00
{serviceName}       -> Lavagem Básica
{servicesList}      -> Lavagem Básica, Polimento, Proteção Nano
{businessName}      -> Estética Premium Veículos
```

### 3. Testar Emails Reais

Para enviar emails de verdade, integre:
- SendGrid
- Mailgun
- AWS SES

No arquivo `lib/services/notificationService.ts`, descomente a integração real!

### 4. Monitorar Performance

Use `npx prisma studio` para ver dados em tempo real.

---

## ✅ Checklist Final

- [ ] Estética registrada
- [ ] Configurações aplicadas
- [ ] Serviços criados
- [ ] Pacotes criados
- [ ] Notificações customizadas
- [ ] Cliente se registrou
- [ ] Carro registrado
- [ ] Agendamento criado
- [ ] Email recebido (ou log visto)
- [ ] Teste de cancelamento

---

## 🚀 Próximo Passo

Implementar interface gráfica para:
- Admin customizar configurações
- Admin gerenciar pacotes
- Admin ver relatórios
- Cliente agendar visualmente

---

**Dúvidas? Consulte MULTI_TENANT_GUIDE.md**
