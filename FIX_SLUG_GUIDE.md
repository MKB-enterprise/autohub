# 🔧 SOLUÇÃO: Adicionar Slug ao Business (Passo a Passo)

## ❌ Problema Identificado

Seu Business **"AutoGarage Demo"** existe no banco, mas o campo `slug` está **NULL**.

```json
{
  "id": "cmjta7oev0000hfqoskspxp3b",
  "name": "AutoGarage Demo",
  "slug": null,   ❌ AQUI ESTÁ O PROBLEMA!
  "isActive": true
}
```

Sem slug, o sistema não consegue identificar qual tenant usar.

---

## ✅ Solução: Usar Prisma Studio (Aberto em localhost:5555)

### Passo 1: Acessar Prisma Studio

Abra o navegador em:
```
http://localhost:5555
```

### Passo 2: Navegar para a tabela "businesses"

Clique em **"Business"** na esquerda

### Passo 3: Editar o registro

Procure por **"AutoGarage Demo"** e clique no botão de editar (lápis ✏️)

### Passo 4: Adicionar slug

No campo **"slug"**, digite:
```
default
```

### Passo 5: Salvar

Clique em **"Save"** ou **"Atualizar"**

---

## 🔄 Resultado

Após salvar, o Business terá:
```json
{
  "id": "cmjta7oev0000hfqoskspxp3b",
  "name": "AutoGarage Demo",
  "slug": "default",   ✅ AGORA TEM SLUG!
  "isActive": true
}
```

---

## 🧪 Teste Novamente

Após adicionar o slug, execute:

```bash
curl http://localhost:3000/api/debug/tenant
```

Você verá:
```json
{
  "diagnostics": {
    "extraction": {
      "resolvedSlug": "default"  ✅ ENCONTRADO!
    },
    "resolution": {
      "status": "SUCCESS"  ✅ RESOLVIDO!
    }
  }
}
```

---

## ✨ Agora você pode acessar:

```
✅ http://localhost:3000/t/default/configuracoes
✅ http://localhost:3000/t/default/dashboard
```

---

## 📋 Sumário

| Item | Status |
|------|--------|
| Business "AutoGarage Demo" existe | ✅ Sim |
| Tem campo slug | ❌ Não (NULL) |
| **AÇÃO NECESSÁRIA** | 📌 Editar no Prisma Studio e adicionar `slug: "default"` |
| Depois | ✅ Tudo funcionará |

