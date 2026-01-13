# 🧪 Teste do Fix Multi-Tenant Auth

## Problema Original
Ao fazer logout de uma empresa (ex: `premium-car`) e depois acessar outra empresa (`garageauto`), o dashboard buгava porque:
1. Token antigo permanecia no cookie
2. Cookie `tenant_slug` não era removido
3. Cache de branding do tenant anterior não era limpo

## Solução Implementada

### 1️⃣ **Logout Melhorado** (`/api/auth/logout`)
- Agora remove tanto `auth_token` quanto `tenant_slug`
- Cookie removido corretamente com `path: '/'`

### 2️⃣ **Cache de Branding Limpo** (TenantContext)
- Nova função `clearBrandingCache()` que limpa:
  - `globalBrandingCache` (dados de branding)
  - `loadingPromises` (requisições em andamento)
- Chamada automaticamente no logout via `AuthContext`

### 3️⃣ **Flow Correto de Logout** (AuthContext)
```
logout() → clearBrandingCache() → fetch('/api/auth/logout') → redirect('/login')
```

## ✅ Passo a Passo para Testar

### Teste 1: Logout Básico
```bash
1. Abrir navegador em: http://localhost:3000/t/premium-car/login
2. Fazer login com uma conta
3. Verificar se entrou no dashboard
4. Clicar em "Sair" (Logout)
5. Verificar se foi redirecionado para /login
6. Abrir DevTools > Application > Cookies
   - ❌ `auth_token` deve estar vazio/removido
   - ❌ `tenant_slug` deve estar vazio/removido
```

### Teste 2: Troca de Empresa (O Caso Problemático)
```bash
1. Abrir navegador em: http://localhost:3000/t/premium-car/login
2. Fazer login e entrar no dashboard
3. Sair (Logout)
4. Esperar redirect para /login
5. Mudar URL para: http://localhost:3000/t/garageauto/login
6. Fazer login com conta da garageauto
7. ✅ Dashboard deve carregar CORRETAMENTE (sem bugs)
8. Verificar dados corretos da empresa garageauto
```

### Teste 3: Verificação de Cache
```bash
1. Abrir DevTools > Console
2. Observar logs durante login em primeira empresa
3. Fazer logout
4. Logs devem indicar: "clearBrandingCache() called"
5. Fazer login em segunda empresa
6. Logs devem RECARREGAR dados (não usar cache antigo)
```

### Teste 4: Cookies Limpos
```bash
1. DevTools > Application > Cookies
2. Após logout, AMBOS os cookies devem estar vazios:
   - auth_token = "" (ou não existir)
   - tenant_slug = "" (ou não existir)
3. Ao fazer login novo, devem ser recriados
```

## 🔍 Validação de Logs

Procure por estes logs para confirmar o fix:

```javascript
// Ao fazer logout:
[AUTH CONTEXT] logout called

// Ao fazer login em novo tenant:
[TENANT] Loading branding for: garageauto
[TENANT] Branding loaded successfully

// NÃO deve aparecer dados da empresa anterior
```

## 📋 Checklist de Validação

- [ ] Logout remove `auth_token` do cookie
- [ ] Logout remove `tenant_slug` do cookie
- [ ] Ao trocar empresa após logout, dashboard carrega corretamente
- [ ] Dados da empresa anterior NÃO aparecem
- [ ] Branding da nova empresa carrega corretamente
- [ ] Não há console errors relacionados a auth
- [ ] Redirecionamentos funcionam corretamente

## 🚨 Se Ainda Tiver Problemas

Se mesmo após este fix continuar com issues, pode ser:

1. **Cache do Browser**: Limpar cache em DevTools
2. **Service Worker**: Se usar PWA, invalidar
3. **LocalStorage**: Pode ter dados residuais (verificar no console)
4. **NextJS Cache**: Rebuild do projeto

```bash
npm run build
npm run dev
```

## 📝 Arquivos Modificados

- ✅ `/app/api/auth/logout/route.ts` - Remove ambos os cookies
- ✅ `/lib/TenantContext.tsx` - Função `clearBrandingCache()`
- ✅ `/lib/AuthContext.tsx` - Chama `clearBrandingCache()` no logout
