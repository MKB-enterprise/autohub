# 🔴 Debug: "Tenant não encontrado"

## Diagnóstico

Você recebeu o erro **"Tenant não encontrado"** quando o middleware tentou resolver o tenant.

Isso significa que o sistema **não conseguiu identificar qual empresa** você está tentando acessar.

---

## ✅ Passo 1: Verificar o banco de dados

Primeiro, certifique-se que você tem pelo menos um Business criado:

```bash
# Abra o Prisma Studio
npx prisma studio

# Vá para a tabela "businesses" e verifique:
# ✅ Existe algum registro?
# ✅ Qual é o valor do campo "slug"?
# ✅ O campo "isActive" é true?
```

**Se não há nenhum business:**
```bash
# Execute o seed
npx prisma db seed

# Isto criará um business de teste com slug: "default"
```

---

## ✅ Passo 2: Entender como acessar o sistema

O sistema espera o tenant de **3 formas diferentes**:

### Opção A: Subdomínio (Produção)
```
https://empresa.autohub.com
```
Extrai `empresa` como slug.

### Opção B: Path (Desenvolvimento Local) ⭐ RECOMENDADO
```
http://localhost:3000/t/default
```
Extrai `default` como slug do path `/t/default`.

### Opção C: Header (APIs/Testes)
```bash
curl -H "X-Tenant-Slug: default" http://localhost:3000/api/tenant/settings
```

---

## ✅ Passo 3: Verificar qual slug usar

Após rodar `npx prisma studio`, veja qual slug seu business tem:

```typescript
// Exemplo de resposta:
[
  {
    id: "biz-123",
    name: "Detalhado AutoHub",
    slug: "default",  // ← USE ESTE VALOR
    isActive: true
  }
]
```

---

## ✅ Passo 4: Acessar com o slug correto

Se o slug do seu business é `default`, acesse assim:

### ❌ ERRADO - Sem especificar tenant:
```
http://localhost:3000/configuracoes
```
⚠️ Erro: "Tenant não encontrado"

### ✅ CORRETO - Com path /t/:
```
http://localhost:3000/t/default/configuracoes
```
✅ Funciona!

---

## ✅ Passo 5: Rotas públicas (não precisam de tenant)

Estas rotas **NÃO** precisam de tenant:

```
✅ /login
✅ /register
✅ /api/auth/login
✅ /api/auth/register
✅ /api/auth/business/login
✅ /api/auth/business/register
```

Acesse assim:
```
http://localhost:3000/login
http://localhost:3000/register
```

---

## ✅ Passo 6: Fluxo correto de uso

### 1️⃣ Fazer login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@default.com",
    "password": "senha123",
    "tenantSlug": "default"
  }'
```

### 2️⃣ Acessar página protegida COM tenant no path
```
http://localhost:3000/t/default/configuracoes
```

### 3️⃣ Ou usar header em APIs
```bash
curl http://localhost:3000/api/tenant/settings \
  -H "X-Tenant-Slug: default" \
  -H "Authorization: Bearer <token>"
```

---

## 🔍 Troubleshooting Avançado

### Problema: "Mas não quero colocar /t/slug em todas URLs"

**Solução para Desenvolvimento Local:**

1. Edite seu `/etc/hosts` (Mac/Linux) ou `C:\Windows\System32\drivers\etc\hosts` (Windows):

```
127.0.0.1 localhost
127.0.0.1 default.localhost:3000
```

2. Acesse normalmente:
```
http://default.localhost:3000/configuracoes
```

### Problema: "Ainda não funciona"

Verifique o **Console do Node.js** para logs:

```typescript
// O tenant-resolver.ts faz logs como:
[TenantResolver] Extraído slug do subdomínio: "empresa"
[TenantResolver] Erro ao resolver tenant: ...
```

Procure por esses logs para entender onde está falhando.

### Problema: "Preciso de um Business criado com slug específico"

Use o Prisma Studio:

```bash
npx prisma studio
```

E crie manualmente um novo Business:

```json
{
  "name": "Meu Negócio",
  "slug": "meu-negocio",
  "email": "admin@meu-negocio.com",
  "isActive": true
}
```

Depois acesse:
```
http://localhost:3000/t/meu-negocio/configuracoes
```

---

## 📋 Checklist de Debug

- [ ] Rodar `npx prisma studio` e confirmar que existe Business com `isActive: true`
- [ ] Copiar o valor do campo `slug` desse Business
- [ ] Acessar `http://localhost:3000/t/SEU-SLUG/configuracoes` (substituir SEU-SLUG)
- [ ] Se funcionar ✅, o problema era de routing/acesso
- [ ] Se não funcionar ainda, verificar console do Node.js para logs de erro

---

## 🆘 Se nada funcionar

1. Limpe cache:
```bash
# Parar servidor
# Deletar node_modules/.cache
# Reiniciar npm run dev
```

2. Verifique banco:
```bash
npx prisma db push
npx prisma db seed
npx prisma studio
```

3. Veja logs no middleware:
```typescript
// Adicione isto em lib/tenant-resolver.ts linha ~150
console.log('[Middleware] Tentando resolver tenant para:', request.url)
console.log('[Middleware] Headers:', Object.fromEntries(request.headers))

const tenantContext = await resolveTenantFromRequest(request)
console.log('[Middleware] Resultado:', tenantContext)
```

4. Reinicie tudo:
```bash
npm run dev
```

---

## ✨ Resultado esperado

Quando funcionar, você verá:

```
✅ http://localhost:3000/t/default/configuracoes
   → Carrega página de configurações
   → Mostra branding do tenant "default"
   → Abas de Branding, Horários, Capacidade, etc funcionam
```

