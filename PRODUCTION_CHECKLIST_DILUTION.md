# ✅ Checklist de Produção - Sistema de Diluição

## 📋 Antes de Colocar em Produção

### 1. Infraestrutura e Banco de Dados

- [ ] **Backup do banco de dados atual**
  ```bash
  pg_dump autohub > backup_pre_dilution_$(date +%Y%m%d).sql
  ```

- [ ] **Testar migration em ambiente de staging**
  ```bash
  # Em staging primeiro!
  npx prisma migrate deploy
  ```

- [ ] **Verificar criação de todas as tabelas**
  ```sql
  SELECT table_name FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name LIKE '%dilution%' OR table_name LIKE '%product_cat%';
  ```

- [ ] **Confirmar índices criados**
  ```sql
  SELECT indexname FROM pg_indexes 
  WHERE tablename IN (
    'dilution_recipes', 'dilution_batches', 
    'service_product_usage_templates',
    'service_execution_product_usage'
  );
  ```

- [ ] **Testar funções SQL**
  ```sql
  SELECT get_product_stock_ml('test_product_id');
  SELECT calculate_concentrate_ml(1000, 1, 10);
  ```

### 2. Testes de API

- [ ] **Testar todos os endpoints principais**
  - [ ] GET/POST /api/product-categories
  - [ ] GET/POST /api/products-dilution
  - [ ] GET/POST /api/dilution-recipes
  - [ ] GET/POST /api/dilution-batches
  - [ ] GET /api/stock
  - [ ] GET/POST /api/service-usage-templates
  - [ ] GET/POST /api/appointments/[id]/complete

- [ ] **Validar headers obrigatórios**
  - [ ] x-business-id funciona
  - [ ] x-user-id é opcional mas registrado

- [ ] **Testar validações de erro**
  - [ ] Estoque insuficiente bloqueia
  - [ ] Campos obrigatórios validados
  - [ ] Duplicações rejeitadas
  - [ ] IDs inválidos retornam 404

### 3. Lógica de Negócio

- [ ] **Testar cálculos de diluição**
  ```javascript
  // 1:10 de 1000ml deve dar ~91ml concentrado
  // 1:20 de 500ml deve dar ~24ml concentrado
  ```

- [ ] **Validar consumo automático**
  - [ ] Appointment COMPLETED dispara hook
  - [ ] Templates são encontrados corretamente
  - [ ] Estoque é baixado na quantidade certa
  - [ ] ServiceExecutionProductUsage criado
  - [ ] InventoryMovement registrado
  - [ ] inventoryWrittenOff marcado como true

- [ ] **Testar preparação de lotes**
  - [ ] Cálculo correto de concentrado/água
  - [ ] Baixa de estoque registrada
  - [ ] Batch criado com dados corretos

### 4. Dados Iniciais

- [ ] **Criar categorias padrão**
  - [ ] Shampoo
  - [ ] APC (Limpador Multiuso)
  - [ ] Limpa Rodas
  - [ ] Desengraxante
  - [ ] Cera
  - [ ] Selante
  - [ ] Pretinho
  - [ ] Outras conforme necessidade

- [ ] **Cadastrar produtos reais**
  - [ ] Nome, marca, embalagem corretos
  - [ ] Custos reais
  - [ ] Estoque mínimo adequado
  - [ ] Flag is_concentrated correto

- [ ] **Registrar estoque inicial**
  - [ ] Contar estoque físico atual
  - [ ] Registrar via API ou SQL
  - [ ] Validar quantidades

- [ ] **Criar receitas de diluição**
  - [ ] Proporções reais usadas na empresa
  - [ ] Testar cálculos com equipe
  - [ ] Documentar uso de cada receita

- [ ] **Configurar templates de consumo**
  - [ ] Um template por serviço + tipo de veículo
  - [ ] Quantidades baseadas na prática real
  - [ ] Validar com funcionários experientes

### 5. Integração

- [ ] **Integrar hook no endpoint de conclusão**
  ```typescript
  import { updateAppointmentWithHook } from '@/lib/hooks/appointment-completion-hook';
  
  // Substituir update direto pelo wrapper
  await updateAppointmentWithHook(id, data, businessId, userId);
  ```

- [ ] **Testar fluxo completo E2E**
  1. [ ] Criar appointment
  2. [ ] Marcar como COMPLETED
  3. [ ] Verificar consumo automático
  4. [ ] Validar estoque baixado
  5. [ ] Conferir registros criados

- [ ] **Validar multi-tenant**
  - [ ] Tenant A não vê dados do Tenant B
  - [ ] Todas queries filtram por businessId
  - [ ] Isolamento total entre tenants

### 6. Performance

- [ ] **Verificar query performance**
  ```sql
  EXPLAIN ANALYZE 
  SELECT * FROM v_product_stock_ml WHERE business_id = 'xxx';
  ```

- [ ] **Índices utilizados corretamente**
  ```sql
  -- Deve usar índice, não sequential scan
  EXPLAIN SELECT * FROM dilution_recipes WHERE business_id = 'xxx' AND product_id = 'yyy';
  ```

- [ ] **Cache de estoque (opcional)**
  - [ ] Considerar cache Redis para consultas frequentes
  - [ ] Invalidar cache ao criar movimento

### 7. Segurança

- [ ] **Validação de permissões**
  - [ ] Apenas usuários autenticados acessam endpoints
  - [ ] Business ID validado em todas requisições
  - [ ] Não permite acesso cross-tenant

- [ ] **SQL Injection prevenido**
  - [ ] Usar Prisma (prepared statements)
  - [ ] Nunca concatenar strings em queries

- [ ] **Validação de inputs**
  - [ ] Tipos de dados validados
  - [ ] Ranges numéricos verificados
  - [ ] Strings sanitizadas

### 8. Monitoramento

- [ ] **Configurar logs**
  ```typescript
  // Logar eventos importantes
  console.log('[DILUTION] Batch criado:', batchId);
  console.log('[CONSUMPTION] Appointment concluído:', appointmentId);
  console.error('[ERROR] Estoque insuficiente:', error);
  ```

- [ ] **Alertas de estoque baixo**
  - [ ] Email quando produto < mínimo
  - [ ] Dashboard com indicadores
  - [ ] Notificação semanal de status

- [ ] **Métricas de consumo**
  - [ ] Consumo médio por serviço
  - [ ] Produtos mais usados
  - [ ] Frequência de preparação de lotes

### 9. Documentação e Treinamento

- [ ] **Documentação acessível**
  - [ ] README atualizado
  - [ ] Guias disponíveis para equipe
  - [ ] Exemplos práticos documentados

- [ ] **Treinar equipe**
  - [ ] Gerente/Admin: cadastro de produtos
  - [ ] Supervisor: templates e receitas
  - [ ] Atendente: apenas visualização
  - [ ] Operacional: preparação de lotes

- [ ] **Criar SOPs (Standard Operating Procedures)**
  - [ ] Como cadastrar novo produto
  - [ ] Como preparar lote de diluição
  - [ ] Como ajustar consumo manualmente
  - [ ] O que fazer se estoque insuficiente

### 10. Contingência

- [ ] **Plano de rollback**
  ```bash
  # Se algo der errado, reverter migration
  npx prisma migrate reset
  # Restaurar backup
  psql autohub < backup_pre_dilution.sql
  ```

- [ ] **Dados de teste preparados**
  - [ ] Script de seed com dados exemplo
  - [ ] Ambiente de teste sempre disponível

- [ ] **Suporte técnico**
  - [ ] Contato de desenvolvedor disponível
  - [ ] Documentação de troubleshooting
  - [ ] Canal de comunicação rápido

---

## 🚀 Checklist de Deploy

### Pré-Deploy
- [ ] Código em branch separado testado
- [ ] Code review realizado
- [ ] Testes automatizados passando
- [ ] Backup do banco realizado
- [ ] Comunicação para stakeholders

### Deploy
1. [ ] Parar aplicação (ou usar zero-downtime)
2. [ ] Aplicar migration: `npx prisma migrate deploy`
3. [ ] Gerar Prisma Client: `npx prisma generate`
4. [ ] Rebuild aplicação
5. [ ] Reiniciar aplicação
6. [ ] Verificar logs de inicialização

### Pós-Deploy
- [ ] Smoke tests básicos
- [ ] Testar endpoints principais
- [ ] Verificar logs por 15 minutos
- [ ] Confirmar com usuários-chave
- [ ] Monitorar performance
- [ ] Coletar feedback inicial

---

## 📊 Indicadores de Sucesso

### Primeira Semana
- [ ] Sem erros críticos
- [ ] Todos produtos cadastrados
- [ ] Templates configurados para serviços principais
- [ ] Primeiros appointments concluídos com sucesso
- [ ] Estoque sendo rastreado corretamente

### Primeiro Mês
- [ ] Estoque sempre atualizado
- [ ] Alertas de reposição funcionando
- [ ] Equipe usando sistema sem dificuldades
- [ ] Relatórios de consumo gerados
- [ ] Custos por serviço calculados

### Longo Prazo
- [ ] Redução de desperdício de produtos
- [ ] Precisão no controle de estoque > 95%
- [ ] Otimização de compras
- [ ] Dados para decisões estratégicas
- [ ] ROI positivo do sistema

---

## 🐛 Troubleshooting Rápido

| Problema | Solução |
|----------|---------|
| Migration falha | Verificar conexão DB, permissões, conflitos de schema |
| Hook não dispara | Verificar import, status COMPLETED, inventoryWrittenOff flag |
| Estoque negativo | Ajustar via ADJUST movement, investigar causa |
| Cálculos errados | Validar ratios, verificar arredondamentos |
| Performance lenta | Verificar índices, considerar cache |

---

## 📞 Contatos de Suporte

**Técnico:** [Desenvolvedor]
**Funcional:** [Gerente de Produto]
**Urgências:** [Canal de emergência]

---

**Status:** Pronto para deploy
**Próxima revisão:** Após 1ª semana de uso
**Responsável:** [Nome]
**Data:** Janeiro 2026
