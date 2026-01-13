# 🎯 Quick Reference - Login Refactoring

## 📍 Localização do Arquivo
```
app/t/[slug]/login/page.tsx
```

---

## 🔄 O que Mudou?

### Antes
```tsx
// Genérico, sem branding
<h1>🚗 Login Cliente</h1>
<p>{tenant?.name}</p>
<div className="bg-gray-950">...</div>
<button className="border-gray-700">📱 Telefone</button>
```

### Depois
```tsx
// Ambientizado com cores dinâmicas
<Image src={logoUrl} /> {/* Hero com logo */}
<div style={{ backgroundColor }}>  {/* Fundo customizado */}
  <div style={{ backgroundColor: primaryColor }} /> {/* Accent line */}
  <button style={{ backgroundColor: primaryColor }}> {/* Botão primário */}
  <button style={{ backgroundColor: secondaryColor }}> {/* Botão secundário */}
</div>
```

---

## 🎨 Variáveis de Branding

| Variável | Uso | Default |
|----------|-----|---------|
| `logoUrl` | Imagem no hero | `null` |
| `displayName` | Nome da estética | `tenant.name` |
| `primaryColor` | Botões, accents, linhas | `#3B82F6` |
| `secondaryColor` | Botões alternativos | `#1E40AF` |
| `backgroundColor` | Fundo da página | `#0F172A` |
| `textColor` | Textos em geral | `#FFFFFF` |

---

## 📱 Estrutura de Componentes

```
┌─ Página (min-h-screen, flex col)
│  style={{ backgroundColor }}
│
├─ Hero Section (w-full max-w-md)
│  └─ Card com glassmorphism
│     ├─ Image (logo)
│     └─ Div (nome + "Bem-vindo")
│
└─ Main Card (w-full max-w-md)
   ├─ Accent Line (backgroundColor: primaryColor)
   ├─ Header (Agendar / Acesse sua conta)
   ├─ Alert (se houver erro)
   ├─ Method Selector (Telefone / Google)
   │  └─ 2 Botões com cores dinâmicas
   ├─ Form Content (input + buttons)
   └─ Footer (Continuar navegando)
```

---

## 🎬 Estados Dinâmicos

### Estado 1: Inicial (Aguardando input)
```tsx
loginMethod === 'phone'
↓
Mostra form de telefone
- Input vazio
- Botão SMS enabled
- Cores: primary
```

### Estado 2: Código Enviado
```tsx
codeSent === true
↓
Mostra form de verificação
- Input de código vazio
- Input de nome (se needsName)
- Dev code box
- Botão Verificar
```

### Estado 3: Google Selecionado
```tsx
loginMethod === 'google'
↓
Mostra info de Google login
- Botão: secundário color
- Info box: background secundário
```

---

## 🎯 Fluxo de Renderização

```tsx
// 1. Validar carregamento
if (tenantLoading) return <Loading />
if (!tenant) return <NotFound />

// 2. Extrair branding
const { settings } = useTenant()
const branding = settings?.branding
const primaryColor = branding?.colors?.primary || '#3B82F6'

// 3. Renderizar com cores
return (
  <div style={{ backgroundColor }}>
    {logoUrl && <HeroSection />}
    <Card>
      <LoginForm 
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
      />
    </Card>
  </div>
)
```

---

## 🎨 Como Customizar (Admin)

### Acesso
```
/t/[seu-slug]/configuracoes → Aba "Branding"
```

### Campos Disponíveis
```
├─ Display Name: "Premium Auto Detailing"
├─ Logo URL: "https://..."
├─ Primary Color: "#FF6B35"
├─ Secondary Color: "#F7931E"
├─ Background: "#0F172A"
├─ Text Color: "#FFFFFF"
└─ Theme: dark
```

### Salvamento
```
Clique em "Salvar"
↓
Settings atualizado em BD
↓
Próxima visita: /t/[slug]/login já mostra cores novas!
```

---

## 🔧 Técnica: Cores Dinâmicas

### Como Funciona

```tsx
// Passo 1: Get branding
const branding = settings?.branding

// Passo 2: Extract colors
const primaryColor = branding?.colors?.primary || '#3B82F6'

// Passo 3: Apply via inline style
<button style={{ backgroundColor: primaryColor }} />

// Passo 4: Derived colors
backgroundColor={`${primaryColor}15`} // 15 = 5% opacity
borderColor={`${primaryColor}33`}      // 33 = 20% opacity
```

### Hex Opacity Lookup
```
Alpha  | Hex
-------|-----
100%   | FF
90%    | E6
80%    | CC
70%    | B3
60%    | 99
50%    | 80
40%    | 66
30%    | 4D
20%    | 33
10%    | 1A
5%     | 0D (ou 15)
```

---

## ✅ Checklist de Testes

### Mobile
- [ ] Logo visível (não cortado)
- [ ] Cores aparecem corretamente
- [ ] Inputs legíveis
- [ ] Botões clicáveis
- [ ] Sem overflow

### Desktop
- [ ] Hero section elegante
- [ ] Card com shadow
- [ ] Hover effects funcionam
- [ ] Transições suaves
- [ ] Nada cortado

### Funcionalidade
- [ ] Login por telefone funciona
- [ ] Código verifica corretamente
- [ ] Erros mostram alerta
- [ ] Redirecionamento OK
- [ ] Logout reseta colors

### Customização
- [ ] Admin consegue mudar cores
- [ ] Logo upload funciona
- [ ] Changes refletem em login
- [ ] Fallbacks funcionam (sem logo)
- [ ] Tenant errado → 404

---

## 🚀 Troubleshooting

### Problema: Cores não aparecem
```
✓ Verificar se settings foi salvo em /configuracoes
✓ Limpar cache (Ctrl+Shift+Del)
✓ Teste em modo incógnito
✓ Verifique cores em hex (ex: #FF6B35)
```

### Problema: Logo não aparece
```
✓ Verificar URL (tester em navegador)
✓ CORS headers OK? (CDN de origem)
✓ Sem espaços no URL
✓ Se null → hero section não renderiza (OK!)
```

### Problema: Mobile cortado
```
✓ Verificar max-w-md (mobile max width)
✓ Padding p-4 está lá?
✓ Image: max-h-[120px] funciona?
✓ Testa em DevTools (F12)
```

### Problema: Botão desabilitado
```
✓ Estado: sendingCode = true?
✓ Estado: verifyingCode = true?
✓ Sem network? Check Network tab
✓ API retornando erro?
```

---

## 📊 Performance

### Otimizações Implementadas
```
✓ Image: priority (logo loads fast)
✓ Image: lazy loading (não lazyload logo)
✓ CSS: Transition 300ms (smooth)
✓ Colors: No re-renders (inline style)
✓ Tenant check: Early return se inválido
```

### Rendering
```
Initial: TenantProvider loads settings
↓
Hero renders se logoUrl existe
↓
Form renderiza com colors
↓
Total time: < 1s (com cache)
```

---

## 🎭 Visual Summary

### Tenant A (Red/Orange)
```
Background: #0F172A
Logo: [Logo A]
Primary: #FF6B35 (Orange-red)
Secondary: #F7931E (Orange)
Feel: Modern, energetic
```

### Tenant B (Blue/Navy)
```
Background: #0A0E27
Logo: [Logo B]
Primary: #0066CC (Royal blue)
Secondary: #003399 (Dark blue)
Feel: Professional, trust
```

### Tenant C (Green/Gold)
```
Background: #0F1419
Logo: [Logo C]
Primary: #2D8C4D (Green)
Secondary: #D4AF37 (Gold)
Feel: Exclusive, premium
```

---

## 📚 Related Files

- **Main File**: [app/t/[slug]/login/page.tsx](app/t/%5Bslug%5D/login/page.tsx)
- **Admin Config**: [app/t/[slug]/configuracoes/page.tsx](app/t/%5Bslug%5D/configuracoes/page.tsx)
- **Branding Types**: [lib/tenant-settings.ts](lib/tenant-settings.ts)
- **Tenant Hook**: [lib/TenantContext.tsx](lib/TenantContext.tsx)
- **Guide**: [LOGIN_REFACTOR_GUIDE.md](LOGIN_REFACTOR_GUIDE.md)
- **Examples**: [LOGIN_BRANDING_EXAMPLES.md](LOGIN_BRANDING_EXAMPLES.md)

---

**Quick Answer:** "O login agora reflete a identidade visual única de cada estética!"
