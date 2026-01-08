# 📦 Módulo de Diluição e Consumo Automático de Produtos

> Sistema completo de gestão de estoque, diluição de produtos concentrados e consumo automático por serviços executados - AutoHub Estética Automotiva

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Modelo de Dados](#modelo-de-dados)
- [Funcionalidades](#funcionalidades)
- [Como Usar](#como-usar)
- [API Endpoints](#api-endpoints)
- [Fórmulas e Cálculos](#fórmulas-e-cálculos)
- [Integração](#integração)
- [Exemplos](#exemplos)

---

## 🎯 Visão Geral

Este módulo permite:

1. **Cadastro de produtos concentrados** com controle de embalagem e custos
2. **Receitas de diluição** (ex: 1:10, 1:20) para cada produto
3. **Preparação de lotes** (batches) com baixa automática de concentrado
4. **Templates de consumo** por serviço + tipo de veículo
5. **Consumo automático** quando serviços forem concluídos
6. **Cálculo de custos** baseado no consumo real
7. **Alertas de estoque** abaixo do mínimo

### Fluxo Completo

```
1. Cadastrar Produto Concentrado
   ↓
2. Criar Receitas de Diluição (1:10, 1:20, etc)
   ↓
3. (Opcional) Preparar Lotes → Baixa estoque concentrado
   ↓
4. Configurar Templates de Consumo por Serviço + Veículo
   ↓
5. Ao concluir serviço (COMPLETED) → Consumo automático
   ↓
6. Movimentações de estoque + Registro de uso
```

---

## 🏗️ Arquitetura

### Camadas do Sistema

```
┌─────────────────────────────────────────────┐
│  UI (React/Next.js)                         │
│  - Páginas de produtos, receitas, estoque   │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  API Routes (Next.js)                       │
│  - CRUD de produtos, categorias, receitas   │
│  - Templates de consumo                     │
│  - Hook de conclusão de serviço             │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Services Layer                             │
│  - dilution-calculator.ts                   │
│  - stock-service.ts                         │
│  - consumption-service.ts                   │
│  - dilution-service.ts                      │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Database (PostgreSQL via Prisma)           │
│  - Tabelas normalizadas                     │
│  - Views para consultas                     │
│  - Funções SQL auxiliares                   │
└─────────────────────────────────────────────┘
```

### Responsabilidades

| Camada | Responsabilidade |
|--------|------------------|
| **UI** | Interfaces para cadastro, visualização, filtros |
| **API** | Validações, autenticação, orquestração |
| **Services** | Lógica de negócio, cálculos, validações complexas |
| **Database** | Persistência, integridade referencial, queries otimizadas |

---

## 📊 Modelo de Dados

### Novas Tabelas

#### 1. `product_categories`
Categorias específicas de produtos (Shampoo, APC, Cera, etc)

```sql
- id (PK)
- business_id (FK → businesses)
- name (unique por business)
- description
- created_at, updated_at
```

#### 2. `products` (ESTENDIDA)
Campos adicionados à tabela existente:

```sql
-- Novos campos
- category_id (FK → product_categories)
- brand
- is_concentrated (boolean)
- base_unit ('ml', 'g', 'unit')
- package_size_ml (tamanho da embalagem)
- cost_total (custo total da embalagem)
- stock_min_ml (alerta de estoque mínimo)
```

#### 3. `dilution_recipes`
Receitas de diluição por produto

```sql
- id (PK)
- business_id, product_id (FKs)
- name (ex: "Limpeza Pesada (1:10)")
- ratio_product (ex: 1)
- ratio_water (ex: 10)
- target_bottle_ml (ex: 1000)
- is_active
- created_at, updated_at
```

#### 4. `dilution_batches`
Registro de lotes preparados

```sql
- id (PK)
- business_id, recipe_id (FKs)
- prepared_total_ml
- used_concentrate_ml
- used_water_ml
- notes
- created_by_user_id
- created_at
```

#### 5. `service_product_usage_templates`
Templates de consumo padrão

```sql
- id (PK)
- business_id, service_id, product_id (FKs)
- vehicle_type (MOTO, HATCH, SEDAN, SUV, PICKUP, VAN)
- recipe_id (FK, nullable)
- quantity_ml (quantidade da solução aplicada)
- notes
- created_at, updated_at

UNIQUE (business_id, service_id, vehicle_type, product_id, recipe_id)
```

#### 6. `service_execution_product_usage`
Consumo REAL quando serviço executado

```sql
- id (PK)
- business_id, appointment_id, service_id (FKs)
- car_id, vehicle_type
- product_id, recipe_id (FKs)
- quantity_ml
- source ('TEMPLATE' | 'MANUAL')
- created_at
```

### Relacionamentos

```
Business (tenant)
  ├── ProductCategories
  ├── Products
  │     ├── DilutionRecipes
  │     ├── ServiceProductUsageTemplates
  │     └── InventoryMovements
  ├── Services
  │     └── ServiceProductUsageTemplates
  └── Appointments
        └── ServiceExecutionProductUsage
```

---

## ⚙️ Funcionalidades

### 1. Gestão de Produtos

**Endpoints:**
- `GET /api/products-dilution` - Lista produtos
- `POST /api/products-dilution` - Cria produto
- `GET /api/product-categories` - Lista categorias

**Exemplo de criação:**

```typescript
POST /api/products-dilution
{
  "name": "APC Super Concentrado",
  "brand": "Vonixx",
  "categoryId": "cat_123",
  "isConcentrated": true,
  "packageSizeMl": 5000,
  "costTotal": 150.00,
  "stockMinMl": 1000
}
```

### 2. Receitas de Diluição

**Endpoints:**
- `GET /api/dilution-recipes` - Lista receitas
- `POST /api/dilution-recipes` - Cria receita

**Exemplo:**

```typescript
POST /api/dilution-recipes
{
  "productId": "prod_123",
  "name": "Limpeza Pesada (1:10)",
  "ratioProduct": 1,
  "ratioWater": 10,
  "targetBottleMl": 1000
}
```

**Cálculo automático:**
- Para 1L de solução 1:10:
  - Concentrado: 91 ml
  - Água: 909 ml
  - Total: 1000 ml

### 3. Preparação de Lotes

**Endpoint:**
- `POST /api/dilution-batches` - Prepara lote

**Exemplo:**

```typescript
POST /api/dilution-batches
{
  "recipeId": "recipe_123",
  "numberOfBottles": 3,  // Preparar 3 litros
  "notes": "Preparado para o final de semana"
}
```

**Efeito:**
1. Calcula: 3 x 1000ml = 3000ml de solução
2. Concentrado necessário: ~273ml (para 1:10)
3. Valida estoque disponível
4. Cria movimento de saída (DILUTION)
5. Registra batch com detalhes

### 4. Templates de Consumo

**Endpoint:**
- `GET/POST /api/service-usage-templates`

**Exemplo:**

```typescript
POST /api/service-usage-templates
{
  "serviceId": "service_lavagem",
  "vehicleType": "SEDAN",
  "productId": "prod_apc",
  "recipeId": "recipe_1to10",
  "quantityMl": 500  // Usa 500ml de solução 1:10
}
```

**Interpretação:**
- Para lavar um SEDAN, usa 500ml de solução APC 1:10
- Consumo real de concentrado: ~46ml

### 5. Consumo Automático

**Endpoint:**
- `POST /api/appointments/{id}/complete` - Processa conclusão

**Fluxo:**

1. **Appointment muda para COMPLETED**
2. **Sistema busca:**
   - Tipo de veículo do appointment
   - Serviços executados
   - Templates de consumo correspondentes
3. **Valida estoque** (bloqueia se insuficiente)
4. **Registra consumo:**
   - Cria `ServiceExecutionProductUsage`
   - Cria `InventoryMovement` (SERVICE_OUT)
5. **Marca appointment:** `inventoryWrittenOff = true`

**Preview antes de concluir:**

```typescript
GET /api/appointments/{id}/complete

Response:
{
  "estimates": [
    {
      "serviceId": "...",
      "serviceName": "Lavagem Completa",
      "products": [
        {
          "productName": "APC Super",
          "solutionUsedMl": 500,
          "concentrateUsedMl": 46,
          "currentStock": 2000,
          "hasEnoughStock": true
        }
      ],
      "totalCost": 1.38
    }
  ],
  "totalCost": 1.38,
  "canComplete": true
}
```

---

## 🔌 API Endpoints

### Resumo Completo

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/product-categories` | Lista categorias |
| POST | `/api/product-categories` | Cria categoria |
| GET | `/api/products-dilution` | Lista produtos |
| POST | `/api/products-dilution` | Cria produto |
| GET | `/api/dilution-recipes` | Lista receitas |
| POST | `/api/dilution-recipes` | Cria receita |
| GET | `/api/dilution-batches` | Lista lotes |
| POST | `/api/dilution-batches` | Prepara lote |
| GET | `/api/stock` | Consulta estoque |
| GET | `/api/service-usage-templates` | Lista templates |
| POST | `/api/service-usage-templates` | Cria template |
| GET | `/api/appointments/{id}/complete` | Preview consumo |
| POST | `/api/appointments/{id}/complete` | Processa conclusão |

### Headers Obrigatórios

```
x-business-id: {businessId}
x-user-id: {userId} (opcional)
```

---

## 🧮 Fórmulas e Cálculos

### Diluição

#### Cálculo de Concentrado Necessário

```typescript
function calculateConcentrate(solutionMl, ratioProduct, ratioWater) {
  const totalParts = ratioProduct + ratioWater;
  const fraction = ratioProduct / totalParts;
  return Math.ceil(solutionMl * fraction);
}
```

**Exemplo:**
- Solução: 1000ml
- Ratio: 1:10
- Cálculo: ceil(1000 * 1/11) = ceil(90.909) = **91ml**

#### Cálculo de Água

```typescript
waterMl = solutionMl - concentrateMl
```

### Estoque

#### Estoque Atual

```sql
SELECT SUM(
  CASE 
    WHEN movement_type = 'IN' THEN quantity
    WHEN movement_type IN ('OUT', 'DILUTION', 'SERVICE_OUT') THEN -quantity
    WHEN movement_type = 'ADJUST' THEN quantity
    ELSE 0
  END
) as current_stock
FROM inventory_movements
WHERE product_id = ?
```

#### Custo por ML

```typescript
costPerMl = costTotal / packageSizeMl
```

#### Custo de Solução Diluída

```typescript
solutionCost = (concentrateUsed * costPerMl)
```

---

## 🔗 Integração

### Integrar no fluxo existente

#### 1. Endpoint de Conclusão de Appointment

Atualizar o endpoint que marca appointment como COMPLETED:

```typescript
// Em: app/api/appointments/[id]/route.ts

import { updateAppointmentWithHook } from '@/lib/hooks/appointment-completion-hook';

export async function PATCH(req, { params }) {
  const { status } = await req.json();
  const businessId = req.headers.get('x-business-id');
  const userId = req.headers.get('x-user-id');

  // Usar wrapper que dispara hook automaticamente
  const updated = await updateAppointmentWithHook(
    params.id,
    { status },
    businessId,
    userId
  );

  return NextResponse.json({ appointment: updated });
}
```

#### 2. Formulário de Conclusão de Serviço

```typescript
// Adicionar botão "Ver Consumo" antes de concluir

async function handlePreviewConsumption() {
  const res = await fetch(`/api/appointments/${appointmentId}/complete`);
  const data = await res.json();
  
  // Mostrar modal com estimativa
  setEstimate(data);
  setShowPreview(true);
}

async function handleComplete() {
  const res = await fetch(
    `/api/appointments/${appointmentId}/complete`,
    { method: 'POST' }
  );
  
  if (res.ok) {
    toast.success('Serviço concluído e produtos baixados do estoque');
  } else {
    const error = await res.json();
    toast.error(error.error);
  }
}
```

---

## 💡 Exemplos de Uso

### Exemplo 1: Cadastro Completo de Produto

```typescript
// 1. Criar categoria
const category = await fetch('/api/product-categories', {
  method: 'POST',
  body: JSON.stringify({
    name: 'APC (Limpador Multiuso)',
    description: 'All Purpose Cleaners'
  })
});

// 2. Criar produto concentrado
const product = await fetch('/api/products-dilution', {
  method: 'POST',
  body: JSON.stringify({
    categoryId: category.id,
    name: 'Vonixx APC',
    brand: 'Vonixx',
    isConcentrated: true,
    packageSizeMl: 5000,
    costTotal: 150.00,
    stockMinMl: 1000
  })
});

// 3. Registrar entrada de estoque
const stock = await fetch('/api/inventory-movements', {
  method: 'POST',
  body: JSON.stringify({
    productId: product.id,
    movementType: 'IN',
    quantity: 5000,
    unitCost: 0.03,
    note: 'Compra inicial'
  })
});

// 4. Criar receitas de diluição
await fetch('/api/dilution-recipes', {
  method: 'POST',
  body: JSON.stringify({
    productId: product.id,
    name: 'Limpeza Pesada (1:10)',
    ratioProduct: 1,
    ratioWater: 10,
    targetBottleMl: 1000
  })
});

await fetch('/api/dilution-recipes', {
  method: 'POST',
  body: JSON.stringify({
    productId: product.id,
    name: 'Limpeza Média (1:20)',
    ratioProduct: 1,
    ratioWater: 20,
    targetBottleMl: 1000
  })
});
```

### Exemplo 2: Configurar Consumo por Serviço

```typescript
// Lavagem Completa para diferentes tipos de veículos

const templates = [
  { vehicleType: 'MOTO', quantityMl: 200 },
  { vehicleType: 'HATCH', quantityMl: 400 },
  { vehicleType: 'SEDAN', quantityMl: 500 },
  { vehicleType: 'SUV', quantityMl: 700 },
  { vehicleType: 'PICKUP', quantityMl: 800 },
  { vehicleType: 'VAN', quantityMl: 900 },
];

for (const template of templates) {
  await fetch('/api/service-usage-templates', {
    method: 'POST',
    body: JSON.stringify({
      serviceId: 'service_lavagem_completa',
      vehicleType: template.vehicleType,
      productId: 'prod_vonixx_apc',
      recipeId: 'recipe_1to10',
      quantityMl: template.quantityMl
    })
  });
}
```

### Exemplo 3: Fluxo Completo de Serviço

```typescript
// 1. Cliente agenda lavagem de SEDAN
const appointment = await createAppointment({
  serviceId: 'service_lavagem',
  carId: 'car_sedan_cliente',
  // ...
});

// 2. Funcionário conclui serviço
await fetch(`/api/appointments/${appointment.id}`, {
  method: 'PATCH',
  body: JSON.stringify({ status: 'COMPLETED' })
});

// 3. Sistema automaticamente:
// - Busca template: Lavagem + SEDAN
// - Encontra: 500ml de APC 1:10
// - Calcula: 46ml de concentrado consumido
// - Verifica estoque: OK (2000ml disponíveis)
// - Cria ServiceExecutionProductUsage
// - Cria InventoryMovement (OUT, 46ml)
// - Marca appointment.inventoryWrittenOff = true

// 4. Novo estoque: 2000ml - 46ml = 1954ml
```

---

## 🚀 Próximos Passos

### Para Colocar em Produção

1. **Rodar Migration:**
   ```bash
   npx prisma migrate dev --name add_dilution_system
   npx prisma generate
   ```

2. **Seed Inicial:**
   - Executar `seed-categories.sql` com businessId real
   - Ou criar categorias via API

3. **Cadastrar Produtos:**
   - Usar UI em `/estoque/diluicao`
   - Ou API endpoints

4. **Configurar Templates:**
   - Definir consumo padrão por serviço
   - Ajustar por tipo de veículo

5. **Testar Fluxo:**
   - Criar appointment teste
   - Marcar como COMPLETED
   - Verificar movimentações de estoque

### Melhorias Futuras

- [ ] Dashboard de consumo (gráficos)
- [ ] Previsão de compras baseada em histórico
- [ ] Alertas automáticos de estoque baixo
- [ ] Relatórios de custo por serviço
- [ ] App mobile para registrar consumo
- [ ] Integração com fornecedores (pedido automático)

---

## 📝 Notas Importantes

### Segurança

- ✅ Multi-tenant: Todas as queries filtram por `businessId`
- ✅ Validações: Estoque insuficiente bloqueia conclusão
- ✅ Audit trail: Todas movimentações registradas com timestamp e user
- ✅ Integridade: FKs com CASCADE/RESTRICT apropriados

### Performance

- ✅ Índices em colunas de busca frequente
- ✅ Views materializadas para estoque (opcional)
- ✅ Queries otimizadas com JOINs necessários

### Manutenibilidade

- ✅ Código modular em services
- ✅ Tipos TypeScript completos
- ✅ Documentação inline
- ✅ Fórmulas centralizadas

---

## 📞 Suporte

Em caso de dúvidas ou problemas:

1. Consulte os comentários no código
2. Verifique os logs de erro
3. Teste com dados de exemplo
4. Revise as validações de estoque

---

**Desenvolvido para AutoHub - Sistema de Gestão para Estética Automotiva** 🚗✨
