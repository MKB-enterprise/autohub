#!/bin/bash

# Script para fixar slug dos businesses
# Executa via curl a rota de manutenção

echo "🔧 Fixando slug dos businesses..."
echo ""

curl -X POST http://localhost:3000/api/maintenance/fix-slug \
  -H "Content-Type: application/json" \
  -s | jq '.'

echo ""
echo "✅ Concluído! Teste agora:"
echo "   curl http://localhost:3000/api/debug/tenant | jq"
