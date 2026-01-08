# 📸 Guia Visual: Fixar Slug no Prisma Studio

## Step 1: Abra Prisma Studio

O Prisma Studio já foi aberto automaticamente em:
```
http://localhost:5555
```

Você deve ver algo assim:

```
┌──────────────────────────────────────────┐
│  Prisma Studio (lado esquerdo)           │
├──────────────────────────────────────────┤
│ Business                                 │
│ User                                     │
│ TenantSettings                           │
│ Customer                                 │
│ Service                                  │
│ ...                                      │
└──────────────────────────────────────────┘
```

---

## Step 2: Clique em "Business"

Clique no item **Business** na barra esquerda.

Você verá a tabela:

```
┌────────────────────────────────────────────────────┐
│  Business Records (sua tabela)                     │
├────────────────────────────────────────────────────┤
│  [ ]  id                     name               slug
│  [ ]  cmjta7oev000...      AutoGarage Demo      (null)
└────────────────────────────────────────────────────┘
```

---

## Step 3: Clique no Registro para Editar

Clique em qualquer lugar na linha do "AutoGarage Demo" ou clique no botão de **editar (✏️)**.

Abrirá um formulário:

```
┌─────────────────────────────────────────┐
│  Edit Business                          │
├─────────────────────────────────────────┤
│                                         │
│  id:        cmjta7oev0000hfqoskspxp3b  │
│  name:      AutoGarage Demo            │
│  slug:      [  ]  ← AQUI ESTÁ VAZIO    │
│  email:     ...                         │
│  isActive:  ☑️ true                     │
│  ...                                    │
│                                         │
│  [Save]  [Cancel]                      │
└─────────────────────────────────────────┘
```

---

## Step 4: Digite "default" no Campo slug

Clique no campo **slug** (que está vazio ou diz "null").

Digite:
```
default
```

Resultado:
```
┌─────────────────────────────────────────┐
│  Edit Business                          │
├─────────────────────────────────────────┤
│                                         │
│  id:        cmjta7oev0000hfqoskspxp3b  │
│  name:      AutoGarage Demo            │
│  slug:      [default] ✅ PREENCHIDO!   │
│  email:     ...                         │
│  isActive:  ☑️ true                     │
│  ...                                    │
│                                         │
│  [Save]  [Cancel]                      │
└─────────────────────────────────────────┘
```

---

## Step 5: Clique em Save

Clique no botão **[Save]** para salvar.

Você verá uma mensagem de sucesso:
```
✅ Record updated
```

---

## ✅ Pronto!

Agora seu business tem:
- name: AutoGarage Demo
- slug: **default**
- isActive: true

---

## 🧪 Teste Imediatamente

Sem fechar o Prisma Studio, abra outra aba e execute:

```bash
curl http://localhost:3000/api/debug/tenant | jq '.database.samples'
```

Você verá:
```json
[
  {
    "id": "cmjta7oev0000hfqoskspxp3b",
    "name": "AutoGarage Demo",
    "slug": "default",  ✅ AGORA TEM SLUG!
    "isActive": true
  }
]
```

---

## 🚀 Agora Acesse a Aplicação

Finalmente, acesse:

```
http://localhost:3000/t/default/configuracoes
```

Você verá:
- ✅ Painel de Configurações
- ✅ Abas: Branding, Horários, Capacidade, Cards, Contato, Notificações
- ✅ Consegue editar e salvar
- ✅ Branding sendo aplicado dinamicamente

---

## ❌ Se algo não funcionar

1. Verifique se salvou corretamente no Prisma Studio
2. Reinicie o servidor (`npm run dev`)
3. Tente novamente

