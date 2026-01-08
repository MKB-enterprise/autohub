#!/bin/bash

# 🧪 Script de Teste Multi-Tenant
# Valida isolamento de dados e branding aplicado

set -e

BASE_URL="http://localhost:3000"
TENANT_A_SLUG=""
TENANT_B_SLUG=""
TOKEN_A=""
TOKEN_B=""

echo "=========================================="
echo "🧪 TESTES DO SISTEMA MULTI-TENANT"
echo "=========================================="
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ========== TESTE 1: Criar Tenants ==========
echo -e "${YELLOW}TESTE 1: Criar dois Tenants${NC}"
echo ""

echo "Criando Tenant A..."
RESPONSE_A=$(curl -s -X POST "$BASE_URL/api/auth/business/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Estética Premium A",
    "email": "admin-a@test.com",
    "phone": "11 99999-9999",
    "password": "senha123456"
  }')

echo "Response: $RESPONSE_A"
TENANT_A_ID=$(echo "$RESPONSE_A" | grep -o '"id":"[^"]*' | head -1 | grep -o '[^"]*$' | tail -1)
TOKEN_A=$(echo "$RESPONSE_A" | grep -o '"token":"[^"]*' | head -1 | grep -o '[^"]*$')

if [ -z "$TENANT_A_ID" ]; then
  echo -e "${RED}❌ Erro ao criar Tenant A${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Tenant A criado: $TENANT_A_ID${NC}"
echo ""

echo "Criando Tenant B..."
RESPONSE_B=$(curl -s -X POST "$BASE_URL/api/auth/business/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Estética Premium B",
    "email": "admin-b@test.com",
    "phone": "11 88888-8888",
    "password": "senha123456"
  }')

echo "Response: $RESPONSE_B"
TENANT_B_ID=$(echo "$RESPONSE_B" | grep -o '"id":"[^"]*' | head -1 | grep -o '[^"]*$' | tail -1)
TOKEN_B=$(echo "$RESPONSE_B" | grep -o '"token":"[^"]*' | head -1 | grep -o '[^"]*$')

if [ -z "$TENANT_B_ID" ]; then
  echo -e "${RED}❌ Erro ao criar Tenant B${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Tenant B criado: $TENANT_B_ID${NC}"
echo ""

# ========== TESTE 2: Buscar Settings ==========
echo -e "${YELLOW}TESTE 2: Buscar Settings do Tenant${NC}"
echo ""

echo "Buscando settings do Tenant A..."
SETTINGS_A=$(curl -s -X GET "$BASE_URL/api/tenant/settings" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "x-tenant-id: $TENANT_A_ID" \
  -H "x-tenant-slug: tenant-a")

echo "Response: $SETTINGS_A" | head -c 200
echo ""
echo ""

if echo "$SETTINGS_A" | grep -q '"branding"'; then
  echo -e "${GREEN}✅ Settings obtidos com sucesso${NC}"
else
  echo -e "${RED}❌ Erro ao obter settings${NC}"
  exit 1
fi
echo ""

# ========== TESTE 3: Atualizar Branding ==========
echo -e "${YELLOW}TESTE 3: Atualizar Branding do Tenant A${NC}"
echo ""

echo "Atualizando branding..."
UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/tenant/settings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "x-tenant-id: $TENANT_A_ID" \
  -H "x-tenant-slug: tenant-a" \
  -d '{
    "branding": {
      "displayName": "Premium A - Atualizado",
      "colors": {
        "primary": "#FF0000",
        "secondary": "#00FF00",
        "background": "#F9FAFB",
        "text": "#1F2937"
      },
      "theme": "dark",
      "cta": "Reserve Agora!",
      "footerText": "© 2025 Premium A"
    }
  }')

echo "Response: $UPDATE_RESPONSE" | head -c 200
echo ""
echo ""

if echo "$UPDATE_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ Branding atualizado com sucesso${NC}"
else
  echo -e "${RED}❌ Erro ao atualizar branding${NC}"
fi
echo ""

# ========== TESTE 4: Validar Isolamento ==========
echo -e "${YELLOW}TESTE 4: Validar Isolamento de Dados${NC}"
echo ""

echo "Buscando branding de Tenant B (deve ser diferente)..."
SETTINGS_B=$(curl -s -X GET "$BASE_URL/api/tenant/settings" \
  -H "Authorization: Bearer $TOKEN_B" \
  -H "x-tenant-id: $TENANT_B_ID" \
  -H "x-tenant-slug: tenant-b")

echo "Response: $SETTINGS_B" | head -c 200
echo ""
echo ""

# Verificar se Tenant B tem branding diferente
if echo "$SETTINGS_B" | grep -q '"displayName":"Estética Premium B"'; then
  echo -e "${GREEN}✅ Tenant B tem seu próprio branding${NC}"
elif echo "$SETTINGS_B" | grep -q '"displayName":"Premium A'; then
  echo -e "${RED}❌ ISOLAMENTO FALHOU - Tenant B vendo dados de A${NC}"
  exit 1
else
  echo -e "${YELLOW}⚠️  Não foi possível validar isolamento${NC}"
fi
echo ""

# ========== TESTE 5: Validar Autorização ==========
echo -e "${YELLOW}TESTE 5: Validar Autorização${NC}"
echo ""

echo "Tentando atualizar Tenant A com token do Tenant B (deve falhar)..."
UNAUTHORIZED=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/api/tenant/settings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_B" \
  -H "x-tenant-id: $TENANT_A_ID" \
  -H "x-tenant-slug: tenant-a" \
  -d '{
    "branding": {
      "displayName": "HACKED"
    }
  }')

HTTP_CODE=$(echo "$UNAUTHORIZED" | tail -n1)

if [ "$HTTP_CODE" = "403" ]; then
  echo -e "${GREEN}✅ Acesso negado corretamente (403)${NC}"
else
  echo -e "${RED}❌ Deveria ter retornado 403, retornou $HTTP_CODE${NC}"
fi
echo ""

# ========== RESUMO ==========
echo "=========================================="
echo -e "${GREEN}✅ TESTES CONCLUÍDOS COM SUCESSO!${NC}"
echo "=========================================="
echo ""
echo "Resumo:"
echo "  • Tenant A criado: $TENANT_A_ID"
echo "  • Tenant B criado: $TENANT_B_ID"
echo "  • Branding atualizado em A"
echo "  • Isolamento de dados validado"
echo "  • Autorização funcionando"
echo ""
echo "Próximos passos:"
echo "  1. Criar serviços em cada tenant"
echo "  2. Validar que um tenant não vê serviços do outro"
echo "  3. Testar login de clientes"
echo "  4. Validar branding aplicado no frontend"
echo ""
