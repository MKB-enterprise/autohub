#!/bin/bash

# 🔍 Script de Debug - Tenant Resolution
# Use este script para diagnosticar e testar a resolução de tenant

set -e

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🔍 DEBUG: Tenant Resolution              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# Função para fazer requisições com tratamento de erro
test_endpoint() {
  local method=$1
  local endpoint=$2
  local body=$3
  local description=$4
  
  echo -e "${YELLOW}→ ${description}${NC}"
  
  if [ -n "$body" ]; then
    curl -s -X $method "http://localhost:3000${endpoint}" \
      -H "Content-Type: application/json" \
      -d "$body" | jq '.' 2>/dev/null || echo "Erro ao processar resposta"
  else
    curl -s -X $method "http://localhost:3000${endpoint}" | jq '.' 2>/dev/null || echo "Erro ao processar resposta"
  fi
  
  echo ""
}

# PASSO 1: Rodar debug info
echo -e "${BLUE}PASSO 1: Coletando informações de debug${NC}"
echo "Acessando: http://localhost:3000/api/debug/tenant"
echo ""

test_endpoint "GET" "/api/debug/tenant" "" "Informações de diagnóstico"

# PASSO 2: Verificar se há businesses no banco
echo -e "${BLUE}PASSO 2: Testando resolução de tenant${NC}"
echo ""

echo -e "${YELLOW}→ Testando slug 'default'${NC}"
test_endpoint "POST" "/api/debug/tenant" '{"slug":"default"}' ""

echo -e "${YELLOW}→ Testando slug 'empresa-teste'${NC}"
test_endpoint "POST" "/api/debug/tenant" '{"slug":"empresa-teste"}' ""

echo ""
echo -e "${BLUE}PASSO 3: Próximos passos${NC}"
echo ""
echo -e "${GREEN}✅ Se viu \"resolvedSlug: SUCCESS\", seu tenant funciona!${NC}"
echo ""
echo "Acesse agora:"
echo -e "  ${BLUE}http://localhost:3000/t/default/configuracoes${NC}"
echo ""
echo -e "${YELLOW}❌ Se viu erro, siga o guia em:${NC}"
echo -e "  ${BLUE}DEBUG_TENANT_ERROR.md${NC}"
echo ""
