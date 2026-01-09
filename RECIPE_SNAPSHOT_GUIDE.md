# Recipe Snapshot System - Data Integrity Protection

## Problema Identificado

Quando um lote é preparado com uma receita em um estado específico (ex: proporção 1:10), e depois a receita é editada (ex: para 1:20), o lote fica com dados "aparentemente inconsistentes" com a receita atual. Isso pode confundir o usuário, fazendo-o achar que é um erro do sistema quando na verdade ele próprio alterou a receita após o preparo.

## Solução Implementada: Recipe Snapshot Pattern

O sistema agora captura e armazena o estado da receita no **momento exato** em que o lote é preparado, permitindo:

1. **Detecção de Divergência**: Comparar a receita que foi usada com a receita atual
2. **Auditoria Transparente**: Mostrar ao usuário exatamente o que foi alterado depois
3. **Proteção de Dados**: Bloquear edições de receitas que já têm lotes preparados

## Arquitetura Técnica

### 1. Banco de Dados (Migration)

**Arquivo**: `prisma/migrations/20260108_add_recipe_snapshots/migration.sql`

Adicionadas 4 colunas à tabela `dilution_batches`:
- `recipe_name_snapshot` (TEXT): Nome da receita no momento do preparo
- `ratio_product_snapshot` (FLOAT): Proporção de concentrado (ex: 1 em 1:10)
- `ratio_water_snapshot` (FLOAT): Proporção de água (ex: 10 em 1:10)
- `target_bottle_ml_snapshot` (INT): Volume alvo em ml

**Status**: Aplicada automaticamente ✅

### 2. Schema Prisma

**Arquivo**: `prisma/schema.prisma` (linhas 831-857)

```prisma
model DilutionBatch {
  // ... campos existentes ...
  
  // Snapshot da receita no momento do preparo (para detectar alterações posteriores)
  recipeNameSnapshot        String?  @map("recipe_name_snapshot")
  ratioProductSnapshot      Float?   @map("ratio_product_snapshot")
  ratioWaterSnapshot        Float?   @map("ratio_water_snapshot")
  targetBottleMlSnapshot    Int?     @map("target_bottle_ml_snapshot")
  
  // ... resto do modelo ...
}
```

### 3. Serviço de Diluição

**Arquivo**: `lib/services/dilution-service.ts`

#### 3.1 Captura de Snapshot (linhas 67-79)

Quando um lote é criado via `createDilutionBatch()`, os valores da receita são armazenados:

```typescript
const batch = await prisma.dilutionBatch.create({
  data: {
    // ... dados do lote ...
    // Capturar snapshot da receita para detectar alterações posteriores
    recipeNameSnapshot: recipe.name,
    ratioProductSnapshot: recipe.ratioProduct,
    ratioWaterSnapshot: recipe.ratioWater,
    targetBottleMlSnapshot: recipe.targetBottleMl,
    createdByUserId,
  },
});
```

#### 3.2 Função de Detecção (linhas 395-434)

Nova função `detectRecipeDivergence()` compara snapshot vs receita atual:

```typescript
export function detectRecipeDivergence(batch, recipe): {
  hasChanged: boolean;
  changes: string[];
}
```

Retorna lista de alterações (ex: "Proporção: 1:10 → 1:20")

#### 3.3 Proteção de Edição (linhas 212-252)

`updateDilutionRecipe()` agora bloqueia edições se houver lotes preparados:

```typescript
const activeBatches = await prisma.dilutionBatch.count({
  where: { recipeId }
});

if (activeBatches > 0) {
  throw new Error(
    `Não é possível alterar esta receita pois há ${activeBatches} lote(s) preparado(s)...`
  );
}
```

### 4. Interface de Usuário

**Arquivo**: `app/estoque/diluicao/page.tsx` (funções BatchesView)

#### 4.1 Detecção de Divergência (linhas 862-886)

Para cada lote exibido, calcula divergência em tempo real:

```tsx
const divergence = {
  hasChanged: false,
  changes: [] as string[]
}

if (hasSnapshot && recipe) {
  if (b.recipeNameSnapshot !== recipe.name) {
    divergence.changes.push(...)
  }
  // ... comparações para cada campo ...
  divergence.hasChanged = divergence.changes.length > 0
}
```

#### 4.2 Badge de Alerta (linhas 896-899)

Quando há divergência, exibe badge amarelo:

```tsx
{divergence.hasChanged && (
  <span className="text-xs bg-amber-900 text-amber-200 px-2 py-0.5 rounded">
    ⚠️ Receita alterada
  </span>
)}
```

#### 4.3 Detalhes de Alterações (linhas 908-913)

Mostra lista detalhada das alterações:

```
Alterações na receita desde o preparo:
• Nome: "Ultra Concentrado" → "Ultra Concentrado v2"
• Proporção: 1:10 → 1:20
• Água: 1:10 → 1:15

⚠️ Este lote foi preparado com os parâmetros originais. 
   As alterações acima foram feitas depois.
```

## Fluxo de Uso

### Cenário 1: Preparar Lote (Sem Alterações Posteriores)

1. Usuário vai para `Estoque > Diluição > Lotes`
2. Clica em "Preparar Lote"
3. Seleciona receita (ex: "Ultra 1:10") e confirma
4. **Snapshot capturado**: name="Ultra", ratioProduct=1, ratioWater=10
5. Lote aparece na lista sem aviso (divergence.hasChanged=false)

### Cenário 2: Alterar Receita Depois (Será Detectado)

1. Receita "Ultra 1:10" tem 1 lote preparado
2. Usuário tenta editar proporção para "1:20"
3. **Erro bloqueado**: "Não é possível alterar esta receita pois há 1 lote(s) preparado(s)"
4. Usuário deve desabilitar a receita ao invés de editar

### Cenário 3: Modificação Forçada (Banco de Dados)

Se alguém alterasse receita diretamente no banco (bypass da API):

1. Lote mantém snapshot original: ratioProductSnapshot=1, ratioWaterSnapshot=10
2. Receita atual: ratioProduct=2, ratioWater=20
3. **Divergência detectada** na exibição:
   - Badge "⚠️ Receita alterada" aparece
   - Alterações listadas detalhadamente
   - Mensagem: "Este lote foi preparado com os parâmetros originais"

## Casos de Uso

### ✅ Auditoria e Rastreabilidade
- Histórico completo de lotes com seus parâmetros originais
- Detecção automática de divergências
- Sem necessidade de logs adicionais

### ✅ Proteção de Dados
- Não permite editar receita enquanto há lotes vigentes
- Força boas práticas: desabilitar receita ao invés de editar
- Previne confusão sobre "qual era a proporção daquele lote"

### ✅ Flexibilidade de Evolução
- Receitas podem ser iteradas: v1 → v2 → v3
- Usuário cria nova receita v2 com novos parâmetros
- Lotes antigos (v1) não são afetados
- Sem replicação de código, apenas snapshot

## Tratamento de Erros

### Tentativa de Editar Receita com Lotes Preparados

**Endpoint**: `PATCH /api/dilution-recipes/:id`

**Resposta (400)**:
```json
{
  "error": "Não é possível alterar esta receita pois há 1 lote(s) preparado(s). A modificação pode causar inconsistências nos registros históricos. Se necessário, desabilite a receita (isActive: false) ao invés de editar."
}
```

### Possível Divergência na Exibição

Não é erro, é informativo. Mostra:
- Quando foi feito
- Qual era o original
- O que mudou depois

## Testes Recomendados

### Teste 1: Snapshot Capturado Corretamente
```
1. Criar receita "Ultra" com 1:10
2. Preparar lote com 1000ml
3. Verificar DB: recipeNameSnapshot="Ultra", ratioProductSnapshot=1
```

### Teste 2: Divergência Detectada
```
1. Com lote preparado, tentar editar receita proporção
2. Esperar erro "Não é possível alterar"
3. Editar diretamente no DB (test mode)
4. Na UI, verificar badge "⚠️ Receita alterada"
```

### Teste 3: Desabilitar vs Editar
```
1. Lote com receita "Ultra"
2. Marcar isActive=false (desabilitar) - deve funcionar
3. Tentar editar parâmetros - deve falhar
```

## Roadmap Futuro

- [ ] Versionar receitas automaticamente ao invés de bloquear
- [ ] Relatório de divergências (quantos lotes têm receita alterada)
- [ ] Migração automática de lotes antigos para nova versão
- [ ] Webhook/notificação quando receita é alterada com lotes ativos

## Ficheiro de Referência

| Componente | Arquivo | Linhas | Função |
|-----------|---------|--------|--------|
| Migration | `prisma/migrations/20260108_add_recipe_snapshots/` | - | Add snapshot columns |
| Schema | `prisma/schema.prisma` | 831-857 | DilutionBatch model |
| Service | `lib/services/dilution-service.ts` | 67-79 | Capture snapshot |
| Service | `lib/services/dilution-service.ts` | 395-434 | Detect divergence |
| Service | `lib/services/dilution-service.ts` | 212-252 | Protect edits |
| UI | `app/estoque/diluicao/page.tsx` | 862-913 | Display warnings |
| API | `app/api/dilution-recipes/[id]/route.ts` | 17-40 | PATCH handler |

---

**Implementado em**: Session 19 (Phase 18 continuation)  
**Status**: ✅ Production Ready  
**Benefício**: Auditoria transparente, proteção contra inconsistências de dados
