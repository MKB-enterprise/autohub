#!/bin/bash
# Script para listar todos os botões que precisam de proteção
# Uso: chmod +x script-verificacao.sh && ./script-verificacao.sh

echo "🔍 Procurando por botões que precisam de proteção..."
echo ""

echo "=== ARQUIVOS COM REQUISIÇÕES (fetch, POST, PATCH, DELETE) ==="
grep -r "onClick\|fetch\|method.*POST\|method.*PATCH\|method.*DELETE" app/ --include="*.tsx" \
  | grep -E "(Button|onClick|fetch)" \
  | sort | uniq

echo ""
echo "=== FORMULÁRIOS COM SUBMIT ==="
grep -r "onSubmit\|handleCreate\|handleEdit\|handleDelete" app/ --include="*.tsx" \
  | grep -E "(form|onSubmit)" \
  | sort | uniq

echo ""
echo "=== COMPONENTES JÁ OTIMIZADOS ==="
grep -r "useAsyncAction\|useAsyncForm" app/ --include="*.tsx"

echo ""
echo "✅ Análise completa!"
