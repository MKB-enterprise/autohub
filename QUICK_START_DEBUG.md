# 🚀 SOLUÇÃO RÁPIDA: "Tenant não encontrado"

## Problema Identificado

Quando você acessa a aplicação sem especificar qual tenant (empresa), o middleware não consegue resolver qual é a sua empresa.

---

## ✅ Solução em 3 passos

### Passo 1: Verificar Banco de Dados

```bash
# Abra o Prisma Studio
npx prisma studio

# Procure pela tabela "businesses"
# Você precisa de pelo menos 1 registro com:
# - slug: algum valor (ex: "default")
# - isActive: true

# Se estiver vazio, rode:
npx prisma db seed
```

### Passo 2: Diagnosticar (AGORA COM ROTA DE DEBUG)

```bash
# Acesse a rota de debug (nova):
curl http://localhost:3000/api/debug/tenant | jq

# OU acesse no navegador:
http://localhost:3000/api/debug/tenant

# Você verá algo como:
{
  "diagnostics": {
    "extraction": {
      "resolvedSlug": "default",
      "status": "SUCCESS"
    },
    "business": {
      "id": "biz-123",
      "name": "Meu Negócio",
      "slug": "default",
      "isActive": true
    }
  }
}
```

### Passo 3: Acessar com o Slug Correto

Uma vez que você sabe o slug (ex: "default"), acesse assim:

```
✅ http://localhost:3000/t/default/configuracoes
```

**NÃO faça assim:**
```
❌ http://localhost:3000/configuracoes
```

---

## 📝 3 Formas de Especificar Tenant

### Forma 1: Path (Recomendado para Dev)
```
http://localhost:3000/t/default/configuracoes
```

### Forma 2: Subdomínio (Produção)
Edite `/etc/hosts`:
```
127.0.0.1 default.localhost:3000
```

Depois acesse:
```
http://default.localhost:3000/configuracoes
```

### Forma 3: Header (Para APIs)
```bash
curl http://localhost:3000/api/tenant/settings \
  -H "X-Tenant-Slug: default" \
  -H "Authorization: Bearer TOKEN"
```

---

## 🆘 Checklist Rápido

```
[ ] 1. npx prisma studio → verificar que existe business com isActive=true
[ ] 2. Copiar o valor do "slug" (ex: "default")
[ ] 3. Acessar http://localhost:3000/t/default/configuracoes
[ ] 4. Se não funcionar, executar: curl http://localhost:3000/api/debug/tenant
[ ] 5. Ler as recomendações que aparecem na resposta
```

---

## 🆕 Novo: Rota de Debug

Criei uma nova rota para ajudar no diagnóstico:

### GET /api/debug/tenant
Mostra informações de como seu request foi processado:

```bash
curl http://localhost:3000/api/debug/tenant | jq
```

Resposta inclui:
- 🔍 Slug detectado (do path, subdomínio, ou header)
- 🗄️ Business encontrado no BD?
- ✅ Status (SUCCESS, NOT_FOUND, INACTIVE, etc)
- 💡 Recomendações automáticas

### POST /api/debug/tenant
Testa resolução de um slug específico:

```bash
curl -X POST http://localhost:3000/api/debug/tenant \
  -H "Content-Type: application/json" \
  -d '{"slug":"default"}'
```

Resposta mostra:
- ✅ Business existe?
- ✅ Está ativo?
- 🔗 URL para acessar

---

## 📚 Arquivos Criados

| Arquivo | Propósito |
|---------|-----------|
| `DEBUG_TENANT_ERROR.md` | Guia completo de troubleshooting |
| `app/api/debug/tenant/route.ts` | Rota de debug GET/POST |
| `debug-tenant.sh` | Script bash para testar |
| `QUICK_START_DEBUG.md` | Este arquivo |

---

## 💡 Exemplo Completo do Fluxo

```bash
# 1. Diagnosticar
curl http://localhost:3000/api/debug/tenant | jq '.diagnostics.extraction.resolvedSlug'
# Resposta: "default"

# 2. Acessar página protegida COM slug
curl -H "Cookie: token=SEU_TOKEN" http://localhost:3000/t/default/configuracoes

# 3. Ou acessar API com header
curl http://localhost:3000/api/tenant/settings \
  -H "X-Tenant-Slug: default" \
  -H "Authorization: Bearer SEU_TOKEN"
```

---

## ✨ Resultado Final

Quando tudo estiver funcionando:

```
✅ http://localhost:3000/t/default/configuracoes
   ✓ Carrega página de admin
   ✓ Mostra abas (Branding, Horários, Capacidade, etc)
   ✓ Consegue salvar configurações
   ✓ Branding é aplicado dinamicamente
```

---

## 🔗 Próximos Passos

1. ✅ Usar rota `/api/debug/tenant` para diagnosticar
2. ✅ Acessar `http://localhost:3000/t/SEU-SLUG/...` com o slug correto
3. ✅ Se funcionou, você tem multi-tenant funcionando!
4. ⏳ Próximo: Adaptar endpoints existentes (services, customers, appointments) para filtrar por tenant

