# Política de Edição/Deleção de Receitas com Lotes

## 🎯 O Problema Original
Usuário fez pergunta válida: "Se o sistema bloqueia edição e não deixa deletar, como consigo resolver?"

## ✅ Solução Implementada

### 📋 Regra Simples
- **EDITAR parâmetros**: ❌ BLOQUEADO se houver lotes preparados
- **DELETAR receita**: ✅ PERMITIDO mesmo com lotes

### Por quê?

#### ❌ Não Deixar Editar (Proteção de Dados)
```
Problema: Se você edita a proporção de uma receita que já tem lotes,
os lotes antigos ficam "aparentemente errados"

Solução: Bloqueia edição, force criar nova versão
- v1: Ultra 1:10 (com 3 lotes preparados)
- v2: Ultra 1:20 (nova receita, novos lotes)
```

#### ✅ Deixar Deletar (Limpeza Livre)
```
Razão: Lotes já têm snapshot capturado!

Quando você deleta a receita Ultra 1:10:
- ✓ Lotes antigos MANTÊM snapshot (nome, proporções, volume)
- ✓ Histórico é 100% preservado
- ✓ Você consegue limpare a lista de receitas
- ✓ Sem perder dados

Exemplo:
  Lote preparado: Ultra 1:10, snapshot={name: "Ultra", ratio: 1}
  Delete receita: Ultra desaparece
  Lote continua mostrando: "Ultra (receita deletada) ⚠️"
  Snapshot mostra: Era 1:10, agora é unknown
```

---

## 📊 Fluxo Recomendado

### Cenário 1: Receita com Lotes - Você QUER EDITAR
```
❌ Tentar editar → ERRO: "Há lotes preparados, não pode editar"

✅ Solução:
1. Desabilitar receita antiga (isActive = false)
2. Criar nova receita com novos parâmetros (v2)
3. Usar nova receita para novos lotes
4. Lotes antigos continuam com snapshot original

Exemplo:
- Receita "Ultra 1:10" → desabilitar
- Receita "Ultra 1:20" → nova, para novos lotes
- Lotes antigos preservam "1:10"
```

### Cenário 2: Receita com Lotes - Você QUER DELETAR
```
✅ Clique em Excluir → Aparece aviso:

"Esta receita tem 3 lote(s) preparado(s).

Os dados históricos serão preservados no snapshot dos lotes.

Deseja deletar mesmo assim?"

[Cancelar] [Deletar]

✅ Clique em Deletar → Receita é removida
   Lotes continuam mostrando snapshot original
```

### Cenário 3: Receita SEM Lotes - Você QUER DELETAR
```
✅ Clique em Excluir → Pergunta simples:

"Deseja excluir esta receita?"

[Cancelar] [Deletar]

✅ Clique em Deletar → Remover direto sem receita
```

---

## 🔐 Proteção de Dados

### O que é protegido?
- **Receitas antigas**: Snapshot captura tudo no momento do preparo
- **Lotes históricos**: Mantêm valores originais mesmo se receita mudar/delete
- **Auditoria**: Divergências são detectadas e mostradas com ⚠️

### O que NÃO é protegido?
- Se você editar receita diretamente no banco de dados (bypass da API)
  - Sistema detecta e mostra badge "Receita alterada"

---

## 🧪 Como Testar

### Teste 1: Edição Bloqueada
```
1. Criar receita "Ultra 1:10"
2. Preparar 1 lote
3. Ir em Receitas → clicar Editar
4. Tentar mudar proporção para "1:20"
5. Deve falhar: "Não é possível alterar, há 1 lote(s)"
```

### Teste 2: Deleção Permitida com Aviso
```
1. Com receita "Ultra" tendo 1 lote preparado
2. Clicar "Excluir" na receita
3. Aparecer aviso: "Esta receita tem 1 lote(s)..."
4. Clicar "Deletar" → receita é removida
5. Verificar lote: continua mostrando snapshot original
```

### Teste 3: Deleção Simples (sem lotes)
```
1. Criar receita "Teste" sem preparar lotes
2. Clicar "Excluir"
3. Aparecer: "Deseja excluir?"
4. Clicar "Deletar" → removido direto
```

---

## 📝 Documentação do Código

### Arquivo: `lib/services/dilution-service.ts`

#### `updateDilutionRecipe()`
```typescript
// Bloqueia edição se houver lotes preparados
if (isModifyingRecipeParams) {
  const activeBatches = await prisma.dilutionBatch.count({
    where: { recipeId }
  });
  
  if (activeBatches > 0) {
    throw new Error(
      `Não é possível alterar... há ${activeBatches} lote(s) preparado(s)`
    );
  }
}
```

#### `deleteDilutionRecipe()`
```typescript
// Permite deletar mesmo com lotes
// Lotes preservam snapshot, então dados estão seguros
return prisma.dilutionRecipe.delete({
  where: { id: recipeId }
});
```

### Arquivo: `app/estoque/diluicao/page.tsx`

#### `RecipesView.remove()`
```typescript
const hasBatches = recipe?._count?.batches > 0

const msg = hasBatches 
  ? `Esta receita tem ${recipe._count.batches} lote(s)...
     Dados históricos serão preservados.`
  : 'Deseja excluir?'

if (!confirm(msg)) return
// deleta
```

---

## ✨ Resumo

| Ação | Com Lotes | Sem Lotes | Dados Preservados? |
|------|-----------|-----------|-------------------|
| **EDITAR** | ❌ Bloqueado | ✅ Permitido | N/A |
| **DELETAR** | ✅ Permitido | ✅ Permitido | ✅ Via Snapshot |
| **DESABILITAR** | ✅ Permitido | ✅ Permitido | ✅ Sempre |

---

## 🎓 Boas Práticas

1. **Não editar receita em uso**: Crie versão nova (v1 → v2)
2. **Sempre desabilitar antes de deletar**: Deixa registrado que existiu
3. **Verificar snapshot do lote**: Mostra valores originais se receita mudou
4. **Usar templates**: Define consumo padrão, desacopla da receita

---

**Status**: ✅ Implementado em Session 19  
**Data**: 8 de janeiro de 2026

