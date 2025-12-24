# 📚 API Endpoints Reference

## Autenticação

### Business (Estética)
```
POST   /api/auth/business/register        Registrar estética
POST   /api/auth/business/login           Login de estética
```

### Customer (Cliente)
```
POST   /api/auth/register                 Registrar cliente
POST   /api/auth/login                    Login de cliente
POST   /api/auth/verify-code              Login com código SMS
GET    /api/auth/me                       Dados do usuário autenticado
POST   /api/auth/logout                   Logout
```

---

## Configurações (Admin Only)

### Configurações Gerais
```
GET    /api/settings/business             Obter todas as configurações
PATCH  /api/settings/business             Atualizar configurações
```

### Notificações
```
GET    /api/settings/notifications        Listar templates
PUT    /api/settings/notifications        Criar/atualizar template
```

### Pacotes de Serviços
```
GET    /api/settings/packages             Listar pacotes
POST   /api/settings/packages             Criar pacote
PATCH  /api/settings/packages/:id         Atualizar pacote
DELETE /api/settings/packages/:id         Deletar pacote
```

---

## Serviços

```
GET    /api/services                      Listar serviços
POST   /api/services                      Criar serviço (admin)
GET    /api/services/:id                  Obter serviço
PATCH  /api/services/:id                  Atualizar serviço (admin)
DELETE /api/services/:id                  Deletar serviço (admin)
```

---

## Categorias

```
GET    /api/categories                    Listar categorias
POST   /api/categories                    Criar categoria (admin)
GET    /api/categories/:id                Obter categoria
PATCH  /api/categories/:id                Atualizar categoria (admin)
DELETE /api/categories/:id                Deletar categoria (admin)
```

---

## Clientes

```
GET    /api/customers                     Listar clientes (admin)
POST   /api/customers                     Criar cliente (admin)
GET    /api/customers/:id                 Obter cliente
PATCH  /api/customers/:id                 Atualizar cliente
DELETE /api/customers/:id                 Deletar cliente (admin)
```

---

## Veículos

```
GET    /api/cars                          Listar veículos (do cliente)
POST   /api/cars                          Criar veículo
GET    /api/cars/:id                      Obter veículo
PATCH  /api/cars/:id                      Atualizar veículo
DELETE /api/cars/:id                      Deletar veículo
```

---

## Agendamentos

```
GET    /api/appointments                  Listar agendamentos (admin)
POST   /api/appointments                  Criar agendamento
GET    /api/appointments/:id              Obter agendamento
PATCH  /api/appointments/:id              Atualizar status
DELETE /api/appointments/:id              Deletar agendamento (admin)
```

### Cancelamento
```
POST   /api/appointments/:id/cancel       Cancelar agendamento
GET    /api/appointments/:id/cancellation Obter motivo cancelamento
DELETE /api/appointments/:id/cancellation Remover cancelamento (admin)
```

### Disponibilidade
```
GET    /api/appointments/availability     Slots disponíveis
```

---

## Avaliações & Reputação

```
GET    /api/customers/:id/ratings         Listar avaliações de cliente
POST   /api/appointments/:id/rate         Avaliar agendamento
```

---

## Dashboard (Admin)

```
GET    /api/dashboard/stats               Estatísticas
GET    /api/dashboard/revenue             Receita
GET    /api/dashboard/appointments        Agendamentos recentes
```

---

## Padrão de Resposta

### Sucesso (2xx)
```json
{
  "data": { ... },
  "message": "Operação realizada com sucesso"
}
```

### Erro (4xx, 5xx)
```json
{
  "error": "Descrição do erro",
  "code": "ERROR_CODE",
  "status": 400
}
```

---

## Headers Necessários

Todas as requisições devem incluir:
```
Authorization: Bearer {token}
Content-Type: application/json
```

---

## Query Parameters Comuns

```
?limit=50          Limite de resultados
?offset=0          Deslocamento
?date=2025-12-23   Filtrar por data
?status=COMPLETED  Filtrar por status
?search=termo      Buscar por termo
```

---

**Última atualização: 23 de Dezembro de 2025**
