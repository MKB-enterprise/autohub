# 🔓 O que Acontece se NÃO Fazer Logout e Ir Pro Outro Tenant?

## Cenário: Logado em `premium-car` → Vai pro `garageauto` SEM logout

### ⚠️ **O Fluxo Real do Sistema**

```
🔵 ESTADO INICIAL (logado em premium-car)
│
├─ auth_token cookie = JWT com customerId="user123"
├─ TenantContext.slug = "premium-car"
├─ User data em cache = { name: "João", businessId: "premium-car-id" }
└─ API calls incluem businessId="premium-car-id"

          ↓↓↓ Usuário muda URL SEM LOGOUT ↓↓↓

🔵 URL MUDA PARA /t/garageauto/dashboard
│
├─ auth_token cookie PERMANECE = JWT com customerId="user123"
├─ TenantContext.slug MUDA PARA = "garageauto"
├─ User data em cache = { name: "João", businessId: "premium-car-id" } ← AINDA ANTIGO!
└─ API calls agora enviam businessId="premium-car-id"

          ↓↓↓ Problemas Começam ↓↓↓

❌ CONFLITO DETECTADO
```

---

## 🚨 O que Vai Acontecer?

### **1️⃣ NO FRONTEND (navegador local)**

#### ✅ TenantContext carrega branding correto da garageauto:
```javascript
// Em TenantContext.tsx
const slug = getTenantSlugFromUrl() // "garageauto" ✅
const response = await fetch('/api/tenant/branding?slug=garageauto')
// Retorna branding correto da garageauto
```

#### ❌ MAS AuthContext ainda tem user antigo:
```javascript
// Em AuthContext.tsx
const { user, business } = state
// user = { id: "user123", businessId: "premium-car-id" } ❌
// Isso pode ou NÃO ser problema, depende:
```

---

## 🎯 **2️⃣ NA HORA DE CHAMAR API** (É aqui que explode!)

### **Exemplo: Fetch de Agendamentos**

```typescript
// Código no frontend (página de agenda)
const response = await fetch('/api/appointments', {
  headers: {
    'Content-Type': 'application/json'
    // SEM passar tenant slug ou business ID
  }
})
```

### **No servidor (/api/appointments/route.ts)**

```typescript
export async function GET(request: NextRequest) {
  // 1️⃣ Verifica token
  const auth = await requireAdmin()
  // auth.businessId = "premium-car-id" ← ANTIGO TOKEN!
  
  // 2️⃣ Resolve tenant da URL
  const { context } = await resolveTenantFromRequest(request)
  // context.tenantId = "garageauto-id" ← NOVA EMPRESA!
  
  // 3️⃣ ❌ MISMATCH: Token é de premium-car, request é garageauto
  const where = { businessId: auth.businessId } // "premium-car-id"
  
  // 4️⃣ Query no banco
  const appointments = await prisma.appointment.findMany({
    where: { businessId: "premium-car-id" }
  })
  // Retorna agendamentos da EMPRESA ERRADA!
}
```

---

## 📊 **Matriz de Cenários**

### **Cenário 1: Mesma Pessoa em 2 Empresas**
```
User João:
├─ premium-car: email = joao@email.com (é ADMIN)
└─ garageauto: email = joao@email.com (é CUSTOMER)

❌ Token antigo diz: customerId="user123" (admin de premium-car)
❌ Vai tentar acessar garageauto com dados de premium-car
❌ Dashboard de garageauto carrega branding correto mas dados ERRADOS
```

### **Cenário 2: Pessoas Diferentes**
```
premium-car: João (customerId="john123")
garageauto: Maria (customerId="maria456")

❌ Token de João permanece: customerId="john123"
❌ Frontend tenta carregar dados de João em garageauto
❌ API retorna erro ou dados de João (se ele existe em garageauto)
```

### **Cenário 3: Usar API com Header Correto** (SE IMPLEMENTADO)
```
Melhor prática (que NÃO está implementado agora):

fetch('/api/appointments', {
  headers: {
    'X-Tenant-Slug': 'garageauto',  ← Força tenant correto
    'Authorization': 'Bearer token'
  }
})

// Servidor valida: tenant da URL ≠ tenant do token
// Retorna: 401 Unauthorized
```

---

## 🌍 **LOCAL vs PRODUÇÃO - Mesma Severidade!**

### **LOCAL (3000)**
```
Problema APARECE porque:
├─ Cookies global (path='/')
├─ Auth token reutilizado
└─ APIs retornam dados da empresa errada
```

### **PRODUÇÃO**
```
Problema TAMBÉM APARECE porque:
├─ Cookies global (path='/') - IDÊNTICO
├─ Auth token reutilizado - IDÊNTICO
└─ APIs retornam dados da empresa errada - IDÊNTICO

⚠️ Em produção pode ser PIOR:
   - Dados de customer de empresa A expostos pra empresa B
   - Segurança comprometida!
   - Possível data leak
```

---

## 🛡️ **Soluções Necessárias**

### **OPÇÃO 1: Logout Obrigatório** (Seu atual fix)
```
Premium-car logout → Limpa token → Vai para garageauto/login
Força novo login com credenciais corretas
✅ Seguro
❌ Ruim UX
```

### **OPÇÃO 2: Validação Rigorosa no Server** (RECOMENDADO + FIX 1)
```typescript
// Em cada API endpoint:
export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  const { context } = await resolveTenantFromRequest(request)
  
  // ⚠️ VALIDAR que token é da empresa certa
  if (context && auth.businessId !== context.tenantId) {
    return NextResponse.json(
      { error: 'Tenant mismatch: Token não pertence a este tenant' },
      { status: 403 }
    )
  }
}
```

### **OPÇÃO 3: Tenant-Aware Tokens** (MAIS SEGURO)
```typescript
// Ao fazer login, incluir slug no token:
const token = generateToken({
  customerId: user.id,
  businessId: user.businessId,
  tenantSlug: "garageauto"  // ← NOVO
})

// Ao fazer API call:
const { tenantSlug: tokenTenant } = verifyToken(token)
const { tenantSlug: urlTenant } = resolveTenantFromRequest(request)

if (tokenTenant !== urlTenant) {
  throw new Error('Token invalid for this tenant')
}
```

### **OPÇÃO 4: Separate Auth per Tenant** (MAIS COMPLEXO)
```
Cada tenant tem seu próprio cookie/token:
├─ cookie_premium-car = JWT de premium-car
└─ cookie_garageauto = JWT de garageauto

Ao trocar tenant, app carrega cookie correto
Sem conflitos de token global
```

---

## 📋 **Recomendação: 2-Step Fix**

### **STEP 1** ✅ (Já implementado)
```
Logout limpa ambos os cookies + TenantContext cache
```

### **STEP 2** (IMPLEMENTAR AGORA)
```typescript
// Em TODOS os endpoints sensíveis:

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  const { context } = await resolveTenantFromRequest(request)

  // ⚠️ VALIDAR TENANT
  if (!context || auth.businessId !== context.tenantId) {
    console.warn('[API] Tenant mismatch detected!', {
      tokenBusinessId: auth.businessId,
      requestTenant: context?.tenantId
    })
    return NextResponse.json(
      { error: 'Unauthorized: Invalid tenant' },
      { status: 403 }
    )
  }

  // Resto da lógica...
}
```

---

## ✨ **Verificação Rápida**

Se você NÃO fizer logout e ir pro outro tenant:

| Cenário | Resultado | Severidade |
|---------|-----------|-----------|
| Só navegar, sem chamar API | Dashboard carrega (branding certo) | ⚠️ |
| Chamar API sem validação | Dados da empresa ERRADA | 🔴 **CRÍTICO** |
| Com validação de tenant | 403 Unauthorized | ✅ Seguro |

---

## 🎯 **Conclusão**

**Local = Produção** em termos de problema. O fix do logout ajuda, MAS é INSUFICIENTE. Precisa também validar tenant em todo endpoint crítico.

Quer que eu implemente a validação no servidor agora?
