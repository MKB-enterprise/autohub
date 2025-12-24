#!/bin/bash

# 🧪 Script de Teste das Novas APIs
# Executar este script para testar todas as funcionalidades implementadas

BASE_URL="http://localhost:3000"
BUSINESS_TOKEN=""
CUSTOMER_TOKEN=""
BUSINESS_ID=""

echo "=========================================="
echo "🧪 TESTES DO SISTEMA MULTI-TENANT"
echo "=========================================="
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para testar endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local token=$4
    local description=$5

    echo -e "${YELLOW}▶️  Testando: $description${NC}"
    echo "   $method $endpoint"

    if [ -z "$token" ]; then
        response=$(curl -s -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    else
        response=$(curl -s -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $token" \
            -d "$data")
    fi

    echo "   Response: $response"
    echo ""
    echo "$response"
}

echo "=========================================="
echo "1️⃣  TESTE: Registrar Estética"
echo "=========================================="
echo ""

register_response=$(curl -s -X POST "$BASE_URL/api/auth/business/register" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Estética Teste",
        "email": "admin@test.com",
        "phone": "11999999999",
        "password": "teste123456"
    }')

echo "Response:"
echo "$register_response" | jq . 2>/dev/null || echo "$register_response"
echo ""

# Extrair token
BUSINESS_TOKEN=$(echo "$register_response" | grep -o '"token":"[^"]*' | grep -o '[^"]*$' | head -1)
BUSINESS_ID=$(echo "$register_response" | grep -o '"id":"[^"]*' | grep -o '[^"]*$' | head -1)

if [ -z "$BUSINESS_TOKEN" ]; then
    echo -e "${RED}❌ Erro ao registrar estética${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Estética registrada com sucesso!${NC}"
echo "Token: $BUSINESS_TOKEN"
echo "Business ID: $BUSINESS_ID"
echo ""

echo "=========================================="
echo "2️⃣  TESTE: Obter Configurações"
echo "=========================================="
echo ""

curl -s -X GET "$BASE_URL/api/settings/business" \
    -H "Authorization: Bearer $BUSINESS_TOKEN" \
    -H "Content-Type: application/json" | jq . 2>/dev/null

echo ""

echo "=========================================="
echo "3️⃣  TESTE: Atualizar Configurações"
echo "=========================================="
echo ""

curl -s -X PATCH "$BASE_URL/api/settings/business" \
    -H "Authorization: Bearer $BUSINESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "openingTimeWeekday": "08:00",
        "closingTimeWeekday": "20:00",
        "slotIntervalMinutes": 30,
        "maxCarsPerSlot": 5,
        "notificationsEnabled": true,
        "notificationChannel": "email",
        "packagesEnabled": true
    }' | jq . 2>/dev/null

echo ""

echo "=========================================="
echo "4️⃣  TESTE: Listar Templates de Notificação"
echo "=========================================="
echo ""

curl -s -X GET "$BASE_URL/api/settings/notifications" \
    -H "Authorization: Bearer $BUSINESS_TOKEN" \
    -H "Content-Type: application/json" | jq . 2>/dev/null

echo ""

echo "=========================================="
echo "5️⃣  TESTE: Atualizar Template de Notificação"
echo "=========================================="
echo ""

curl -s -X PUT "$BASE_URL/api/settings/notifications" \
    -H "Authorization: Bearer $BUSINESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "type": "APPOINTMENT_24H_REMINDER",
        "title": "Lembrete: Seu agendamento é amanhã!",
        "body": "Olá {customerName}, não esqueça do seu agendamento amanhã às {appointmentTime}",
        "isActive": true
    }' | jq . 2>/dev/null

echo ""

echo "=========================================="
echo "6️⃣  TESTE: Criar Pacote de Serviços"
echo "=========================================="
echo ""

echo "⚠️  Nota: Você precisa ter serviços criados primeiro!"
echo "   Substitua SERVICE_IDS pelos IDs reais dos serviços"
echo ""

# curl -s -X POST "$BASE_URL/api/settings/packages" \
#     -H "Authorization: Bearer $BUSINESS_TOKEN" \
#     -H "Content-Type: application/json" \
#     -d '{
#         "name": "Combo Completo",
#         "description": "Lavagem + Polimento + Proteção",
#         "discountPercent": 20,
#         "serviceIds": ["SERVICE_ID_1", "SERVICE_ID_2", "SERVICE_ID_3"]
#     }' | jq . 2>/dev/null

echo ""

echo "=========================================="
echo "7️⃣  TESTE: Login de Estética"
echo "=========================================="
echo ""

login_response=$(curl -s -X POST "$BASE_URL/api/auth/business/login" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "admin@test.com",
        "password": "teste123456"
    }')

echo "Response:"
echo "$login_response" | jq . 2>/dev/null || echo "$login_response"
echo ""

NEW_TOKEN=$(echo "$login_response" | grep -o '"token":"[^"]*' | grep -o '[^"]*$' | head -1)

if [ ! -z "$NEW_TOKEN" ]; then
    echo -e "${GREEN}✅ Login bem-sucedido!${NC}"
    BUSINESS_TOKEN=$NEW_TOKEN
else
    echo -e "${RED}❌ Erro ao fazer login${NC}"
fi

echo ""

echo "=========================================="
echo "✅ TESTES CONCLUÍDOS!"
echo "=========================================="
echo ""
echo "📊 Próximos passos:"
echo "   1. Criar serviços (/api/services)"
echo "   2. Criar pacotes (/api/settings/packages)"
echo "   3. Registrar cliente (/api/auth/register)"
echo "   4. Criar agendamento (/api/appointments)"
echo "   5. Testar cancelamento (/api/appointments/:id/cancel)"
echo ""
echo "📚 Para mais informações:"
echo "   - MULTI_TENANT_GUIDE.md"
echo "   - MIGRATION_GUIDE.md"
echo "   - API_ENDPOINTS.md"
echo ""
