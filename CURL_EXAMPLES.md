#!/bin/bash

# 📝 Exemplos de Requisições Multi-Tenant
# Use este arquivo para testar os endpoints

BASE_URL="http://localhost:3000"

# ============================================
# 1. REGISTRAR NOVO TENANT (BUSINESS)
# ============================================

echo "📝 Registrar novo tenant:"
echo ""
echo 'curl -X POST '$BASE_URL'/api/auth/business/register \'
echo '  -H "Content-Type: application/json" \'
echo '  -d '"'"'{
    "name": "Estética Premium",
    "email": "admin@premium.com.br",
    "phone": "11 99999-9999",
    "password": "senha-segura-123"
  }'"'"''
echo ""
echo "Response:"
echo '{
  "business": {
    "id": "clz1a2b3c4d5e6f7g8h9",
    "name": "Estética Premium",
    "email": "admin@premium.com.br"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}'
echo ""
echo "Guardar: TOKEN e Business ID"
echo ""

# ============================================
# 2. OBTER CONFIGURAÇÕES DO TENANT
# ============================================

echo "📝 Obter configurações do tenant:"
echo ""
echo 'curl -X GET '$BASE_URL'/api/tenant/settings \'
echo '  -H "Authorization: Bearer YOUR_TOKEN_HERE" \'
echo '  -H "x-tenant-id: BUSINESS_ID_HERE" \'
echo '  -H "x-tenant-slug: estética-premium"'
echo ""
echo "Response:"
echo '{
  "success": true,
  "data": {
    "branding": {
      "displayName": "Estética Premium",
      "logo": null,
      "favicon": null,
      "colors": {
        "primary": "#3B82F6",
        "secondary": "#1E40AF",
        "background": "#F9FAFB",
        "text": "#1F2937"
      },
      "theme": "light",
      "cta": "Agende agora",
      "footerText": null
    },
    "hours": {
      "timezone": "America/Sao_Paulo",
      "openingHours": {
        "MONDAY": { "isOpen": true, "opens": "08:00", "closes": "18:00" },
        "TUESDAY": { "isOpen": true, "opens": "08:00", "closes": "18:00" },
        ...
      },
      "slotDurationMinutes": 30,
      "minimumAdvanceBookingHours": 0,
      "cancellationPolicyHours": 24
    },
    "capacity": {
      "capacityPerSlot": 2,
      "enableOverbooking": false,
      "maxBookingsPerDay": null
    },
    "cards": {
      "cards": [
        {
          "id": "agenda",
          "title": "Agenda",
          "subtitle": "Visualize seus agendamentos",
          "icon": "calendar",
          "link": "/agenda",
          "visibleTo": ["OWNER", "STAFF"],
          "isActive": true,
          "order": 1
        },
        ...
      ]
    },
    "contact": {
      "whatsapp": null,
      "phone": null,
      "address": { "street": null, "city": null, "state": null, "zipcode": null },
      "social": { "instagram": null, "facebook": null, "linkedin": null }
    },
    "notification": {
      "enabled": true,
      "channel": "email",
      "sendReminders": true,
      "reminderHours": [24, 1],
      "templates": {},
      "lgpdConsent": null
    }
  }
}'
echo ""

# ============================================
# 3. ATUALIZAR BRANDING
# ============================================

echo "📝 Atualizar branding do tenant:"
echo ""
echo 'curl -X PUT '$BASE_URL'/api/tenant/settings \'
echo '  -H "Content-Type: application/json" \'
echo '  -H "Authorization: Bearer YOUR_TOKEN_HERE" \'
echo '  -H "x-tenant-id: BUSINESS_ID_HERE" \'
echo '  -d '"'"'{
    "branding": {
      "displayName": "Premium - Redesenhada",
      "colors": {
        "primary": "#FF0000",
        "secondary": "#00FF00",
        "background": "#F9FAFB",
        "text": "#1F2937"
      },
      "theme": "dark",
      "cta": "Reserve Agora!",
      "footerText": "© 2025 Estética Premium"
    }
  }'"'"''
echo ""
echo "Response:"
echo '{
  "success": true,
  "message": "Configurações atualizadas com sucesso",
  "data": { ... }
}'
echo ""

# ============================================
# 4. ATUALIZAR HORÁRIOS
# ============================================

echo "📝 Atualizar horários de funcionamento:"
echo ""
echo 'curl -X PUT '$BASE_URL'/api/tenant/settings \'
echo '  -H "Content-Type: application/json" \'
echo '  -H "Authorization: Bearer YOUR_TOKEN_HERE" \'
echo '  -H "x-tenant-id: BUSINESS_ID_HERE" \'
echo '  -d '"'"'{
    "hours": {
      "timezone": "America/Sao_Paulo",
      "openingHours": {
        "MONDAY": { "isOpen": true, "opens": "09:00", "closes": "19:00" },
        "TUESDAY": { "isOpen": true, "opens": "09:00", "closes": "19:00" },
        "WEDNESDAY": { "isOpen": true, "opens": "09:00", "closes": "19:00" },
        "THURSDAY": { "isOpen": true, "opens": "09:00", "closes": "19:00" },
        "FRIDAY": { "isOpen": true, "opens": "09:00", "closes": "19:00" },
        "SATURDAY": { "isOpen": true, "opens": "09:00", "closes": "13:00" },
        "SUNDAY": { "isOpen": false }
      },
      "slotDurationMinutes": 60,
      "minimumAdvanceBookingHours": 24,
      "cancellationPolicyHours": 48
    }
  }'"'"''
echo ""

# ============================================
# 5. ATUALIZAR CAPACIDADE
# ============================================

echo "📝 Atualizar capacidade/vagas:"
echo ""
echo 'curl -X PUT '$BASE_URL'/api/tenant/settings \'
echo '  -H "Content-Type: application/json" \'
echo '  -H "Authorization: Bearer YOUR_TOKEN_HERE" \'
echo '  -H "x-tenant-id: BUSINESS_ID_HERE" \'
echo '  -d '"'"'{
    "capacity": {
      "capacityPerSlot": 3,
      "enableOverbooking": false,
      "maxBookingsPerDay": 20
    }
  }'"'"''
echo ""

# ============================================
# 6. ATUALIZAR CONTATO
# ============================================

echo "📝 Atualizar informações de contato:"
echo ""
echo 'curl -X PUT '$BASE_URL'/api/tenant/settings \'
echo '  -H "Content-Type: application/json" \'
echo '  -H "Authorization: Bearer YOUR_TOKEN_HERE" \'
echo '  -H "x-tenant-id: BUSINESS_ID_HERE" \'
echo '  -d '"'"'{
    "contact": {
      "whatsapp": "+55 11 99999-9999",
      "phone": "+55 11 3333-3333",
      "address": {
        "street": "Rua das Flores, 123",
        "city": "São Paulo",
        "state": "SP",
        "zipcode": "01234-567"
      },
      "location": {
        "latitude": -23.5505,
        "longitude": -46.6333
      },
      "social": {
        "instagram": "@esteticapremium",
        "facebook": "EsteticaPremium",
        "linkedin": "estetica-premium"
      }
    }
  }'"'"''
echo ""

# ============================================
# 7. ATUALIZAR CARDS DO DASHBOARD
# ============================================

echo "📝 Atualizar cards do dashboard:"
echo ""
echo 'curl -X PUT '$BASE_URL'/api/tenant/settings \'
echo '  -H "Content-Type: application/json" \'
echo '  -H "Authorization: Bearer YOUR_TOKEN_HERE" \'
echo '  -H "x-tenant-id: BUSINESS_ID_HERE" \'
echo '  -d '"'"'{
    "cards": {
      "cards": [
        {
          "id": "agenda",
          "title": "Minha Agenda",
          "subtitle": "Visualize seus agendamentos",
          "icon": "calendar",
          "link": "/agenda",
          "visibleTo": ["OWNER", "STAFF"],
          "isActive": true,
          "order": 1
        },
        {
          "id": "clientes",
          "title": "Base de Clientes",
          "subtitle": "Gerenciar seus clientes",
          "icon": "users",
          "link": "/clientes",
          "visibleTo": ["OWNER", "STAFF"],
          "isActive": true,
          "order": 2
        },
        {
          "id": "servicos",
          "title": "Meus Serviços",
          "subtitle": "Configurar serviços oferecidos",
          "icon": "settings",
          "link": "/servicos",
          "visibleTo": ["OWNER", "STAFF"],
          "isActive": true,
          "order": 3
        },
        {
          "id": "relatorios",
          "title": "Relatórios",
          "subtitle": "Analytics e métricas",
          "icon": "chart",
          "link": "/relatorios",
          "visibleTo": ["OWNER"],
          "isActive": true,
          "order": 4
        }
      ]
    }
  }'"'"''
echo ""

# ============================================
# 8. TESTAR ISOLAMENTO (DEVE FALHAR)
# ============================================

echo "📝 Tentar atualizar outro tenant (deve falhar com 403):"
echo ""
echo 'curl -X PUT '$BASE_URL'/api/tenant/settings \'
echo '  -H "Content-Type: application/json" \'
echo '  -H "Authorization: Bearer TOKEN_DO_TENANT_B" \'
echo '  -H "x-tenant-id: BUSINESS_ID_DO_TENANT_A" \'
echo '  -d '"'"'{
    "branding": { "displayName": "HACKED" }
  }'"'"''
echo ""
echo "Response (esperado):"
echo '{
  "error": "Não autorizado",
  "status": 403
}'
echo ""

# ============================================
# DICAS DE USO
# ============================================

echo ""
echo "════════════════════════════════════════════════════════"
echo "💡 DICAS DE USO"
echo "════════════════════════════════════════════════════════"
echo ""
echo "1. Substituir placeholders:"
echo "   - YOUR_TOKEN_HERE → token retornado no register"
echo "   - BUSINESS_ID_HERE → id retornado no register"
echo ""
echo "2. Usar com jq para pretty print:"
echo "   curl ... | jq ."
echo ""
echo "3. Para testes rápidos, salvar token em variável:"
echo "   export TOKEN='token-aqui'"
echo "   export BUSINESS_ID='id-aqui'"
echo "   curl ... -H \"Authorization: Bearer \$TOKEN\" ..."
echo ""
echo "4. Testar subdomínio (desenvolvimento local):"
echo "   export HOST='empresa.localhost:3000'"
echo "   curl -H \"Host: \$HOST\" ..."
echo ""
echo "5. Testar path /t/slug:"
echo "   curl '$BASE_URL/t/empresa/api/tenant/settings' ..."
echo ""
echo "════════════════════════════════════════════════════════"
