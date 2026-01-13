# 📚 Runbook Operacional - AutoHub

Guia para operações, troubleshooting e resposta a incidentes.

---

## 🚨 Resposta a Incidentes

### Severidade

- **P0 (Crítico)**: Aplicação fora do ar, dados comprometidos
- **P1 (Alto)**: Funcionalidade principal indisponível
- **P2 (Médio)**: Funcionalidade secundária com problema
- **P3 (Baixo)**: Bug menor, sem impacto significativo

### Primeiro Passo: Diagnosticar

```bash
# 1. Verificar se aplicação está respondendo
curl https://seudominio.com/api/health

# 2. Verificar logs recentes (Docker)
docker-compose logs --tail=100 app

# 3. Verificar status do banco
docker-compose ps db
# ou para banco externo:
pg_isready -h <host> -p 5432
```

---

## 🔍 Troubleshooting por Problema

### Aplicação não responde (P0)

**Sintomas**: HTTP 502/503/504, timeout

**Diagnóstico**:
```bash
# Verificar se processo está rodando
pm2 list
# ou
docker ps | grep autohub

# Verificar memória
free -m
# ou
docker stats

# Verificar espaço em disco
df -h
```

**Solução**:
```bash
# Restart da aplicação
pm2 restart autohub
# ou
docker-compose restart app

# Se não resolver, verificar logs para erro fatal
docker-compose logs app | grep -i "error\|fatal"
```

---

### Database connection failed (P0)

**Sintomas**: Healthcheck retorna `database.status: "disconnected"`

**Diagnóstico**:
```bash
# Testar conexão manualmente
psql $DATABASE_URL -c "SELECT 1"

# Verificar se PostgreSQL está rodando
docker-compose ps db
systemctl status postgresql  # se instalado no host
```

**Solução**:
```bash
# Restart do banco (Docker)
docker-compose restart db

# Verificar credentials
echo $DATABASE_URL  # checar se está correto

# Verificar firewall/security groups (cloud)
```

---

### Lentidão generalizada (P1)

**Sintomas**: Requests lentos, timeouts intermitentes

**Diagnóstico**:
```bash
# Verificar carga da CPU/Memória
top
htop
docker stats

# Verificar queries lentas no PostgreSQL
psql $DATABASE_URL -c "
  SELECT pid, now() - query_start as duration, query 
  FROM pg_stat_activity 
  WHERE state = 'active' 
  ORDER BY duration DESC 
  LIMIT 10;
"

# Verificar conexões ativas
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
```

**Solução**:
```bash
# Escalar recursos (se cloud)
# - Aumentar RAM da instância
# - Aumentar CPU/vCPUs
# - Upgradar tier do banco

# Matar queries travadas (CUIDADO)
psql $DATABASE_URL -c "SELECT pg_terminate_backend(<pid>);"

# Restart como último recurso
docker-compose restart
```

---

### Erro 500 em rotas específicas (P1-P2)

**Sintomas**: Rota específica retorna 500, outras funcionam

**Diagnóstico**:
```bash
# Tail logs em tempo real
docker-compose logs -f app

# Reproduzir erro manualmente
curl -X POST https://seudominio.com/api/appointments \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Slug: test" \
  -d '{...}'
```

**Solução**:
- Analisar stack trace nos logs
- Verificar se é erro de validação (400) sendo retornado como 500
- Verificar se migration pendente: `npx prisma migrate status`
- Hotfix + deploy se necessário

---

### WhatsApp webhooks não funcionando (P2)

**Sintomas**: Mensagens não sendo enviadas/recebidas

**Diagnóstico**:
```bash
# Verificar logs de webhook
docker-compose logs app | grep -i "whatsapp\|webhook"

# Testar webhook manualmente (Meta Developer Console)
# Verificar se PUBLIC_BASE_URL está correto
echo $PUBLIC_BASE_URL

# Verificar se endpoint está acessível publicamente
curl https://seudominio.com/api/whatsapp/webhook
```

**Solução**:
```bash
# Verificar variáveis de ambiente
echo $META_WA_ACCESS_TOKEN
echo $WHATSAPP_VERIFY_TOKEN

# Re-registrar webhook no Meta Developer Console
# - URL: https://seudominio.com/api/whatsapp/webhook
# - Verify token: <WHATSAPP_VERIFY_TOKEN>
# - Subscription fields: messages, message_status
```

---

### Tenant não encontrado (P2)

**Sintomas**: GET /t/<slug> retorna 404

**Diagnóstico**:
```bash
# Verificar se business existe no banco
psql $DATABASE_URL -c "SELECT id, slug, name, is_active FROM businesses WHERE slug = '<slug>';"
```

**Solução**:
```bash
# Se business não existe, criar via seed ou manualmente
npm run db:seed  # apenas dev/staging

# Se slug está errado, corrigir no banco
psql $DATABASE_URL -c "UPDATE businesses SET slug = '<novo-slug>' WHERE id = '<business-id>';"

# Limpar cache (se houver)
# - Restart da aplicação pode ser necessário
```

---

## 📊 Monitoramento e Métricas

### Healthcheck Endpoint

```bash
# Deve retornar 200 OK
curl -I https://seudominio.com/api/health

# JSON completo
curl https://seudominio.com/api/health | jq
```

Resposta esperada:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-13T12:00:00.000Z",
  "uptime": 3600,
  "database": {
    "status": "connected",
    "responseTimeMs": 25
  },
  "environment": "production"
}
```

### Logs Importantes

**Localização**:
- Docker: `docker-compose logs app`
- PM2: `pm2 logs autohub`
- Systemd: `journalctl -u autohub`

**Grep patterns úteis**:
```bash
# Erros
docker-compose logs app | grep -i "error"

# Warnings
docker-compose logs app | grep -i "warn"

# Auth failures
docker-compose logs app | grep -i "auth.*fail"

# Database queries lentas (se configurado)
docker-compose logs app | grep "slow query"
```

---

## 🔧 Operações Comuns

### Backup do Banco de Dados

```bash
# Backup completo
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql

# Backup apenas schema
pg_dump $DATABASE_URL --schema-only > schema-backup.sql

# Backup apenas dados
pg_dump $DATABASE_URL --data-only > data-backup.sql

# Backup comprimido
pg_dump $DATABASE_URL | gzip > backup-$(date +%Y%m%d-%H%M%S).sql.gz
```

### Restore do Banco de Dados

```bash
# Restore completo
psql $DATABASE_URL < backup-20260113-120000.sql

# Restore com drop/create (CUIDADO!)
psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
psql $DATABASE_URL < backup-20260113-120000.sql
```

### Executar Migration Manualmente

```bash
# Ver status
npx prisma migrate status

# Deploy migrations pendentes
npx prisma migrate deploy

# Criar nova migration (apenas dev)
npx prisma migrate dev --name nome_da_migration
```

### Resetar Senha de Usuário

```bash
# Via psql (hash bcrypt)
# 1. Gerar hash (fora do servidor)
node -e "console.log(require('bcryptjs').hashSync('nova-senha', 10))"

# 2. Atualizar no banco
psql $DATABASE_URL -c "
  UPDATE users 
  SET password = '<hash-gerado>' 
  WHERE email = 'usuario@example.com';
"

# Ou para customer
psql $DATABASE_URL -c "
  UPDATE customers 
  SET password = '<hash-gerado>' 
  WHERE email = 'cliente@example.com';
"
```

### Limpar Cache (se implementado)

```bash
# Restart da aplicação limpa cache em memória
docker-compose restart app

# Se usar Redis (futuro)
redis-cli FLUSHALL
```

---

## 🔐 Segurança

### Verificar Logs de Acesso Suspeito

```bash
# Múltiplas tentativas de login falhadas
docker-compose logs app | grep -i "login.*fail" | tail -50

# IPs com muitas requisições
docker-compose logs app | grep "ip=" | awk '{print $NF}' | sort | uniq -c | sort -rn | head -20
```

### Rotacionar Secrets

```bash
# 1. Gerar novo JWT_SECRET
openssl rand -base64 48

# 2. Atualizar .env
echo "JWT_SECRET=<novo-secret>" >> .env

# 3. Restart da aplicação
docker-compose restart app

# ⚠️ ATENÇÃO: Todos os tokens ativos serão invalidados!
# Usuários precisarão fazer login novamente
```

---

## 📈 Performance Tuning

### Otimizar PostgreSQL

```sql
-- Ver queries mais lentas (requer pg_stat_statements)
SELECT 
  query, 
  calls, 
  mean_exec_time, 
  max_exec_time 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Ver tamanho das tabelas
SELECT 
  tablename, 
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Vacuum (limpeza)
VACUUM ANALYZE;
```

### Otimizar Next.js

```bash
# Build com análise de bundle
npm run build -- --profile

# Verificar tamanho das páginas
ls -lh .next/static/chunks/pages/
```

---

## 📞 Escalação

### Quando escalar?

- **P0 não resolvido em 30min**: Escalar para tech lead
- **Data loss**: Escalar imediatamente
- **Ataque de segurança**: Escalar imediatamente

### Contatos (Ajustar conforme equipe)

- **On-Call**: [Número/Slack]
- **Tech Lead**: [Contato]
- **DevOps**: [Contato]
- **Cliente/Stakeholder**: [Contato]

---

## 📝 Checklist Pós-Incidente

Após resolver um incidente P0/P1:

- [ ] Documentar causa raiz
- [ ] Documentar solução aplicada
- [ ] Atualizar este runbook com novos padrões identificados
- [ ] Criar issue/task para prevenir recorrência
- [ ] Notificar stakeholders sobre resolução
- [ ] Revisar alertas/monitoring (adicionar se necessário)

---

## 🔗 Links Úteis

- [DEPLOY.md](./DEPLOY.md) - Guia de deployment
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitetura do sistema
- [README.md](./README.md) - Setup de desenvolvimento
- Prisma Docs: https://www.prisma.io/docs
- Next.js Docs: https://nextjs.org/docs
