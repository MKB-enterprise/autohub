# 🚀 Guia Rápido de Implementação - Sistema de Diluição

## ⚡ Setup Inicial (5 minutos)

### 1. Rodar Migration

```bash
cd c:\Users\matheus\projects\autohub

# Aplicar migration no banco
npx prisma migrate dev

# Gerar Prisma Client atualizado
npx prisma generate

# Verificar se aplicou
npx prisma studio
```

### 2. Testar Conexão

```bash
# Verificar se as novas tabelas existem
psql -d autohub -c "\dt" | grep -E "(product_categories|dilution)"
```

---

## 📝 Cadastro Inicial (10 minutos)

### Opção A: Via API (Recomendado)

Use o arquivo de teste abaixo:

```bash
# Criar arquivo de teste
touch test-dilution-setup.js
```

**Conteúdo do `test-dilution-setup.js`:**

```javascript
const businessId = 'SEU_BUSINESS_ID_AQUI'; // Substituir pelo ID real

async function setup() {
  const baseUrl = 'http://localhost:3000/api';
  const headers = {
    'Content-Type': 'application/json',
    'x-business-id': businessId,
  };

  // 1. Criar categoria
  const catRes = await fetch(`${baseUrl}/product-categories`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'APC (Limpador Multiuso)',
      description: 'All Purpose Cleaners'
    })
  });
  const category = await catRes.json();
  console.log('✅ Categoria criada:', category.category.name);

  // 2. Criar produto concentrado
  const prodRes = await fetch(`${baseUrl}/products-dilution`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      categoryId: category.category.id,
      name: 'APC Super Concentrado',
      brand: 'Vonixx',
      isConcentrated: true,
      packageSizeMl: 5000,
      costTotal: 150.00,
      stockMinMl: 1000
    })
  });
  const product = await prodRes.json();
  console.log('✅ Produto criado:', product.product.name);

  // 3. Criar receita 1:10
  const recipeRes = await fetch(`${baseUrl}/dilution-recipes`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      productId: product.product.id,
      name: 'Limpeza Pesada (1:10)',
      ratioProduct: 1,
      ratioWater: 10,
      targetBottleMl: 1000
    })
  });
  const recipe = await recipeRes.json();
  console.log('✅ Receita criada:', recipe.recipe.name);

  console.log('\n🎉 Setup completo!');
  console.log('IDs para usar nos próximos passos:');
  console.log('- Product ID:', product.product.id);
  console.log('- Recipe ID:', recipe.recipe.id);
}

setup().catch(console.error);
```

Executar:

```bash
node test-dilution-setup.js
```

### Opção B: Via SQL Direto

```sql
-- Substitua 'YOUR_BUSINESS_ID' pelo ID real do seu tenant
INSERT INTO product_categories (id, business_id, name, description)
VALUES 
  (gen_random_uuid()::text, 'YOUR_BUSINESS_ID', 'APC (Limpador Multiuso)', 'All Purpose Cleaners');

-- Pegar o ID da categoria criada e usar abaixo
INSERT INTO products (
  id, business_id, category_id, name, brand, 
  is_concentrated, package_size_ml, cost_total, stock_min_ml,
  unit, cost, current_stock, min_stock, is_active
)
VALUES (
  gen_random_uuid()::text,
  'YOUR_BUSINESS_ID',
  'CATEGORY_ID_AQUI',
  'APC Super Concentrado',
  'Vonixx',
  true,
  5000,
  150.00,
  1000,
  'ml',
  150.00,
  0,
  0,
  true
);
```

---

## 🔗 Integrar Hook de Consumo

### Localizar endpoint de conclusão de appointment

Procurar por:

```bash
# Buscar onde status é atualizado para COMPLETED
grep -r "COMPLETED" app/api/appointments/
```

### Adicionar import e chamar hook

```typescript
// No arquivo app/api/appointments/[id]/route.ts (ou similar)

import { updateAppointmentWithHook } from '@/lib/hooks/appointment-completion-hook';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const businessId = req.headers.get('x-business-id');
  const userId = req.headers.get('x-user-id');
  
  // ANTES (exemplo):
  // const updated = await prisma.appointment.update({
  //   where: { id: params.id },
  //   data: body
  // });

  // DEPOIS (com hook):
  const updated = await updateAppointmentWithHook(
    params.id,
    body,
    businessId!,
    userId || undefined
  );

  return NextResponse.json({ appointment: updated });
}
```

---

## ✅ Checklist de Validação

### 1. Banco de Dados

- [ ] Tabelas criadas: `product_categories`, `dilution_recipes`, etc
- [ ] Colunas adicionadas em `products`: `is_concentrated`, `package_size_ml`, etc
- [ ] Enum `InventoryMovementType` possui `OUT`, `DILUTION`
- [ ] View `v_product_stock_ml` criada
- [ ] Função `get_product_stock_ml()` criada

### 2. API Endpoints

- [ ] `GET/POST /api/product-categories` responde
- [ ] `GET/POST /api/products-dilution` responde
- [ ] `GET/POST /api/dilution-recipes` responde
- [ ] `GET/POST /api/dilution-batches` responde
- [ ] `GET/POST /api/service-usage-templates` responde
- [ ] `GET/POST /api/appointments/[id]/complete` responde

### 3. Fluxo de Consumo

- [ ] Criar template de consumo para um serviço
- [ ] Criar appointment com esse serviço
- [ ] Marcar appointment como COMPLETED
- [ ] Verificar se `ServiceExecutionProductUsage` foi criado
- [ ] Verificar se `InventoryMovement` (SERVICE_OUT) foi criado
- [ ] Verificar se `appointment.inventoryWrittenOff = true`

---

## 🧪 Script de Teste Completo

```javascript
// test-full-flow.js
const businessId = 'SEU_BUSINESS_ID';
const baseUrl = 'http://localhost:3000/api';
const headers = {
  'Content-Type': 'application/json',
  'x-business-id': businessId,
};

async function testFullFlow() {
  console.log('🧪 Iniciando teste do fluxo completo...\n');

  // 1. Criar produto
  const productRes = await fetch(`${baseUrl}/products-dilution`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'Produto Teste',
      isConcentrated: true,
      packageSizeMl: 1000,
      costTotal: 50,
      stockMinMl: 100
    })
  });
  const { product } = await productRes.json();
  console.log('✅ 1. Produto criado:', product.id);

  // 2. Registrar entrada de estoque (1000ml)
  const stockRes = await fetch(`${baseUrl}/inventory-movements`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      productId: product.id,
      movementType: 'IN',
      quantity: 1000,
      note: 'Teste inicial'
    })
  });
  console.log('✅ 2. Estoque adicionado: 1000ml');

  // 3. Criar receita 1:10
  const recipeRes = await fetch(`${baseUrl}/dilution-recipes`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      productId: product.id,
      name: 'Teste 1:10',
      ratioProduct: 1,
      ratioWater: 10,
      targetBottleMl: 1000
    })
  });
  const { recipe } = await recipeRes.json();
  console.log('✅ 3. Receita criada:', recipe.id);

  // 4. Criar template de consumo
  const templateRes = await fetch(`${baseUrl}/service-usage-templates`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      serviceId: 'SEU_SERVICE_ID',
      vehicleType: 'SEDAN',
      productId: product.id,
      recipeId: recipe.id,
      quantityMl: 500  // Usa 500ml de solução
    })
  });
  console.log('✅ 4. Template criado (500ml de solução = ~46ml concentrado)');

  // 5. Preview de consumo
  const previewRes = await fetch(
    `${baseUrl}/appointments/SEU_APPOINTMENT_ID/complete`,
    { headers }
  );
  const preview = await previewRes.json();
  console.log('✅ 5. Preview:', preview);

  // 6. Processar conclusão
  const completeRes = await fetch(
    `${baseUrl}/appointments/SEU_APPOINTMENT_ID/complete`,
    { method: 'POST', headers }
  );
  const result = await completeRes.json();
  console.log('✅ 6. Conclusão processada:', result);

  // 7. Verificar estoque final
  const stockCheckRes = await fetch(
    `${baseUrl}/stock?productId=${product.id}`,
    { headers }
  );
  const stockInfo = await stockCheckRes.json();
  console.log('✅ 7. Estoque final:', stockInfo.stock.currentStockMl, 'ml');
  console.log('   (Esperado: ~954ml = 1000ml - 46ml)');

  console.log('\n🎉 Teste completo!');
}

testFullFlow().catch(console.error);
```

---

## 🐛 Troubleshooting

### Erro: "Business ID não fornecido"
**Solução:** Adicionar header `x-business-id` em todas as requisições

### Erro: "Estoque insuficiente"
**Solução:** Registrar entrada de estoque via API ou SQL:
```sql
INSERT INTO inventory_movements (...)
VALUES (..., 'IN', 1000, ...);
```

### Erro: "Receita não encontrada"
**Solução:** Verificar se `recipeId` existe e pertence ao produto correto

### Hook não dispara
**Solução:** 
1. Verificar se importou `updateAppointmentWithHook`
2. Verificar se status mudou para COMPLETED
3. Verificar logs no console

---

## 📊 Monitoramento

### Queries Úteis

```sql
-- Ver estoque atual de todos produtos
SELECT * FROM v_product_stock_ml;

-- Ver últimas movimentações
SELECT * FROM inventory_movements 
ORDER BY created_at DESC 
LIMIT 10;

-- Ver consumo por appointment
SELECT 
  a.id,
  a.status,
  a.inventory_written_off,
  COUNT(seu.id) as produtos_consumidos
FROM appointments a
LEFT JOIN service_execution_product_usage seu ON seu.appointment_id = a.id
WHERE a.business_id = 'YOUR_BUSINESS_ID'
GROUP BY a.id;
```

---

## 🎯 Próximos Passos

1. ✅ Setup inicial completo
2. ✅ Cadastrar produtos reais do negócio
3. ✅ Configurar receitas de diluição
4. ✅ Definir templates de consumo por serviço
5. ✅ Testar fluxo completo
6. 🚀 Produção!

---

**Tempo estimado total: 30-45 minutos** ⏱️

Boa implementação! 🚀
