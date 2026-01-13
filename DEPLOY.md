# 🚀 Guia de Deploy - AutoHub

Este documento contém todas as informações necessárias para realizar o deploy da aplicação em ambiente de produção.

---

## 📋 Pré-requisitos

### Infraestrutura Necessária

- **Node.js**: 18.x ou superior
- **PostgreSQL**: 14.x ou superior
- **Memória RAM**: Mínimo 2GB (recomendado 4GB)
- **Armazenamento**: Mínimo 10GB
- **Conexão Internet**: Para integrations (WhatsApp, IA)

### Ferramentas

- Docker e Docker Compose (para deploy containerizado)
- Git (para versionamento)
- Cliente PostgreSQL (`psql` ou similar)

---

## 🔐 Variáveis de Ambiente

### Obrigatórias

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# Database
DATABASE_URL="postgresql://usuario:senha@host:5432/database"

# Segurança
JWT_SECRET="<string-aleatoria-de-pelo-menos-32-caracteres>"

# Timezone
NEXT_PUBLIC_TIMEZONE="America/Sao_Paulo"
```

### Recomendadas para Produção

```env
# Node Environment
NODE_ENV="production"

# Base URL (necessário para webhooks)
PUBLIC_BASE_URL="https://seudominio.com"

# Cron Protection
CRON_SECRET="<outro-secret-forte>"
```

### Opcionais (Funcionalidades Avançadas)

```env
# IA (Anthropic Claude)
AI_PROVIDER="anthropic"
ANTHROPIC_API_KEY="sk-ant-xxxxx"
AI_MODEL="claude-3-5-sonnet-20241022"

# WhatsApp Cloud API
WHATSAPP_VERIFY_TOKEN="seu_token_verificacao"
META_WA_ACCESS_TOKEN="<token_da_meta>"
META_WA_PHONE_NUMBER_ID="<phone_number_id>"
META_WA_APP_SECRET="<app_secret>"

# Templates WhatsApp
WA_TEMPLATE_APPOINTMENT_CONFIRMATION="appointment_confirmation_utility"
WA_TEMPLATE_APPOINTMENT_REMINDER="appointment_reminder_utility"
WA_TEMPLATE_REOPEN_CONVERSATION="reopen_conversation_utility"
```

---

## 🛠️ Setup Inicial

### 1. Clone e Instalação

```bash
git clone <repositorio-url>
cd autohub
npm ci  # Use 'ci' ao invés de 'install' para respeitar package-lock.json
```

### 2. Configurar Banco de Dados

#### Opção A: PostgreSQL Local/Remoto

```bash
# Criar database
createdb autohub_production

# Definir DATABASE_URL no .env
DATABASE_URL="postgresql://user:password@localhost:5432/autohub_production"

# Executar migrações
npm run db:migrate:deploy
```

#### Opção B: Docker Compose (Recomendado para Desenvolvimento/Staging)

```bash
# Subir banco de dados
docker-compose up -d db

# Aguardar DB inicializar (15-30s)
sleep 20

# Executar migrações
npm run db:migrate:deploy
```

### 3. Seed Inicial (Opcional, apenas em dev/staging)

```bash
npm run db:seed
```

**⚠️ ATENÇÃO**: Não execute seed em produção! Dados de exemplo sobrescreverão configurações.

### 4. Gerar Prisma Client

```bash
npx prisma generate
```

### 5. Build da Aplicação

```bash
npm run build
```

---

## 🐳 Deploy via Docker (Recomendado)

### Build da Imagem

```bash
npm run docker:build
# ou
docker build -t autohub:latest .
```

### Deploy com Docker Compose

```bash
# Subir todos os serviços (app + db)
npm run docker:up

# Verificar logs
npm run docker:logs

# Parar serviços
npm run docker:down
```

### Configuração Docker Compose para Produção

Edite `docker-compose.yml` e garanta que:

1. **Volumes persistentes** estão configurados para o PostgreSQL
2. **Secrets** são passados via arquivo `.env` (não hardcoded)
3. **Healthchecks** estão ativados
4. **Restart policy** está definida (`restart: unless-stopped`)

---

## 🌐 Deploy em Plataformas Específicas

### Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

**Configurações necessárias na Vercel:**
- Adicionar variáveis de ambiente no dashboard
- Conectar PostgreSQL (Supabase, Neon, ou Railway)
- Configurar domínio customizado

### Railway

1. Conectar repositório GitHub
2. Adicionar serviço PostgreSQL
3. Configurar variáveis de ambiente
4. Deploy automático no push para `main`

### AWS (EC2 + RDS)

1. Provisionar instância EC2 (t3.medium ou superior)
2. Criar RDS PostgreSQL
3. Configurar Security Groups
4. SSH na instância e seguir passos de "Setup Inicial"
5. Usar PM2 ou systemd para gerenciar processo Node

```bash
# Com PM2
npm install -g pm2
pm2 start npm --name "autohub" -- start
pm2 save
pm2 startup
```

---

## 🔄 Processo de Migrações

### Desenvolvimento

```bash
npm run db:migrate
```

### Produção

```bash
# SEMPRE revisar migrations antes de aplicar
npx prisma migrate status

# Aplicar migrations pendentes
npm run db:migrate:deploy
```

**⚠️ IMPORTANTE**: 
- Faça backup do banco antes de migrations em produção
- Teste migrations em staging primeiro
- Migrations devem ser executadas ANTES de atualizar código da aplicação

---

## ✅ Checklist de Deploy

- [ ] Variáveis de ambiente configuradas e validadas
- [ ] Banco de dados provisionado e acessível
- [ ] Migrations aplicadas com sucesso
- [ ] Build completo sem erros
- [ ] Healthcheck respondendo (GET /api/health)
- [ ] JWT_SECRET único e seguro (mínimo 32 chars)
- [ ] PUBLIC_BASE_URL configurado corretamente
- [ ] Logs estão sendo coletados
- [ ] Backup do banco configurado
- [ ] Domínio/DNS configurado (se aplicável)
- [ ] HTTPS/SSL ativado
- [ ] Monitoring configurado (opcional: New Relic, Datadog)

---

## 🔍 Verificação Pós-Deploy

### 1. Healthcheck

```bash
curl https://seudominio.com/api/health
```

Resposta esperada:
```json
{
  "status": "healthy",
  "database": { "status": "connected", "responseTimeMs": 50 },
  "timestamp": "2026-01-13T..."
}
```

### 2. Teste de Login

1. Acesse `https://seudominio.com/t/<slug-do-business>`
2. Tente fazer login com credenciais de seed (ou criadas)
3. Verifique que dashboard carrega corretamente

### 3. Smoke Tests

```bash
# Teste criação de cliente (ajustar para sua API)
curl -X POST https://seudominio.com/api/customers \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Slug: <slug>" \
  -d '{"name": "Test", "phone": "11999999999"}'
```

---

## 🔙 Rollback

### Docker

```bash
# Reverter para imagem anterior
docker tag autohub:latest autohub:rollback
docker pull autohub:previous-version
docker tag autohub:previous-version autohub:latest
docker-compose up -d
```

### Vercel

```bash
# Listar deployments
vercel list

# Promover deployment anterior
vercel promote <deployment-url>
```

### Database (Migrations)

⚠️ **NÃO há rollback automático de migrations**. Opções:

1. Restaurar backup do banco
2. Escrever migration reversa manual
3. Aplicar hotfix com migration corretiva

---

## 📞 Suporte

Em caso de problemas durante deploy:

1. Verificar logs: `npm run docker:logs` ou logs da plataforma
2. Consultar [RUNBOOK.md](./RUNBOOK.md) para troubleshooting
3. Verificar [GitHub Issues](link-do-repo/issues)

---

## 🔄 Atualizações Futuras

Para atualizar a aplicação:

```bash
# 1. Pull do código
git pull origin main

# 2. Instalar dependências (se houver novas)
npm ci

# 3. Executar migrations
npm run db:migrate:deploy

# 4. Rebuild
npm run build

# 5. Restart
pm2 restart autohub
# ou
npm run docker:up
```

**Recomendação**: Use CI/CD (GitHub Actions) para automatizar este processo.
