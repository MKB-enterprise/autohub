# Sistema de Agendamento - Estética Automotiva

Sistema completo de controle de agendamentos para estética automotiva, desenvolvido com Next.js 14, TypeScript, Prisma e PostgreSQL.

## 🚀 Stack Tecnológica

- **Frontend + Backend**: Next.js 14 (App Router)
- **Linguagem**: TypeScript
- **Banco de Dados**: PostgreSQL
- **ORM**: Prisma
- **Formulários**: React Hook Form
- **Estilização**: Tailwind CSS
- **Deploy**: Vercel (recomendado)
- **Banco de Dados**: Supabase ou Railway (recomendado)

## 📋 Funcionalidades

### ✅ Gerenciamento de Agendamentos
- Visualização diária da agenda com navegação entre dias
- Criação de novos agendamentos com verificação de disponibilidade em tempo real
- Múltiplos serviços por agendamento
- Controle de status: Agendado → Em Andamento → Concluído
- Cancelamento e registro de não comparecimento

### ✅ Gerenciamento de Clientes
- CRUD completo de clientes
- Histórico de agendamentos por cliente
- Busca por nome e telefone
- Múltiplos veículos por cliente

### ✅ Gerenciamento de Serviços
- CRUD de serviços oferecidos
- Controle de duração (minutos) e preço
- Ativação/desativação de serviços
- Cálculo automático de duração e valor total

### ✅ Sistema de Disponibilidade Inteligente
- Verificação automática de horários disponíveis
- Respeita horário de funcionamento configurável
- Controle de capacidade (quantidade de carros simultâneos)
- Sugestão de horários alternativos quando não há disponibilidade
- Prevenção de conflitos e sobreposições

### ✅ Configurações Personalizáveis
- Horário de abertura e fechamento
- Intervalo entre slots (ex: 15, 30 minutos)
- Capacidade máxima de atendimentos simultâneos
- Fuso horário configurável

## 📁 Estrutura do Projeto

```
agendamento-estetica-automotiva/
├── app/                          # Páginas e rotas do Next.js
│   ├── agenda/                   # Visualização da agenda diária
│   ├── agendamentos/novo/        # Formulário de novo agendamento
│   ├── clientes/                 # Listagem e detalhes de clientes
│   ├── servicos/                 # CRUD de serviços
│   ├── configuracoes/            # Configurações do sistema
│   ├── api/                      # Rotas da API
│   │   ├── appointments/         # Endpoints de agendamentos
│   │   ├── customers/            # Endpoints de clientes
│   │   ├── cars/                 # Endpoints de carros
│   │   ├── services/             # Endpoints de serviços
│   │   └── settings/             # Endpoints de configurações
│   ├── layout.tsx                # Layout principal
│   └── page.tsx                  # Página inicial (redirect para /agenda)
├── components/                   # Componentes reutilizáveis
│   └── ui/                       # Componentes de UI
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Select.tsx
│       ├── Textarea.tsx
│       ├── Card.tsx
│       ├── Modal.tsx
│       ├── Alert.tsx
│       ├── Badge.tsx
│       └── Loading.tsx
├── lib/                          # Bibliotecas e utilitários
│   ├── db.ts                     # Cliente Prisma
│   ├── availability.ts           # Lógica de disponibilidade
│   └── types.ts                  # Tipos TypeScript
├── prisma/
│   ├── schema.prisma             # Schema do banco de dados
│   └── init.sql                  # SQL inicial (opcional)
├── .env.example                  # Exemplo de variáveis de ambiente
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

## 🔧 Instalação e Configuração

### 1. Clonar o projeto

```bash
cd agendamento-estetica-automotiva
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto baseado no `.env.example`:

```env
# Database URL (PostgreSQL)
# Exemplo para Supabase:
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"

# Exemplo para Railway:
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/railway"

# Exemplo local:
DATABASE_URL="postgresql://postgres:password@localhost:5432/estetica_automotiva"

# Timezone da aplicação
NEXT_PUBLIC_TIMEZONE="America/Sao_Paulo"
```

### 4. Configurar o banco de dados

#### Opção A: Usando Prisma Migrate (Recomendado para desenvolvimento)

```bash
# Gerar o Prisma Client
npx prisma generate

# Criar as tabelas no banco
npx prisma db push

# Ou usar migrations
npx prisma migrate dev --name init
```

#### Opção B: Executar SQL diretamente (Produção)

Se preferir, você pode executar o arquivo `prisma/init.sql` diretamente no seu banco PostgreSQL via Supabase, Railway ou outro cliente SQL.

### 5. (Opcional) Adicionar dados de exemplo

Você pode usar o Prisma Studio para adicionar dados manualmente:

```bash
npx prisma studio
```

Ou criar um arquivo `prisma/seed.ts` para popular o banco automaticamente.

### 6. Rodar o projeto

```bash
npm run dev
```

Acesse: `http://localhost:3000`

## 🗃️ Modelagem do Banco de Dados

### Tabelas Principais

**services** - Serviços oferecidos
- `id`, `name`, `description`, `duration_minutes`, `price`, `is_active`

**customers** - Clientes
- `id`, `name`, `phone`, `notes`

**cars** - Veículos dos clientes
- `id`, `customer_id` (FK), `plate`, `model`, `color`, `notes`

**appointments** - Agendamentos
- `id`, `customer_id` (FK), `car_id` (FK), `start_datetime`, `end_datetime`, `status`, `total_price`, `notes`

**appointment_services** - Relação N:N entre agendamentos e serviços
- `id`, `appointment_id` (FK), `service_id` (FK), `price`

**settings** - Configurações da agenda (único registro)
- `id`, `opening_time_weekday`, `closing_time_weekday`, `slot_interval_minutes`, `max_cars_per_slot`, `timezone`

### Status de Agendamento

- `SCHEDULED` - Agendado
- `IN_PROGRESS` - Em andamento
- `COMPLETED` - Concluído
- `CANCELED` - Cancelado
- `NO_SHOW` - Cliente não compareceu

## 🌐 Deploy

### Deploy na Vercel (Recomendado)

1. Faça push do código para um repositório Git (GitHub, GitLab, Bitbucket)

2. Acesse [vercel.com](https://vercel.com) e importe o projeto

3. Configure as variáveis de ambiente:
   - `DATABASE_URL`
   - `NEXT_PUBLIC_TIMEZONE`

4. Deploy automático! A Vercel vai:
   - Instalar as dependências
   - Executar `prisma generate` (via postinstall)
   - Fazer o build do Next.js
   - Publicar

### Configurar Banco de Dados

#### Opção 1: Supabase (Gratuito)

1. Crie uma conta em [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Vá em Settings → Database
4. Copie a Connection String (modo "Session")
5. Use no `DATABASE_URL`

#### Opção 2: Railway (Gratuito com limitações)

1. Crie uma conta em [railway.app](https://railway.app)
2. Crie um novo projeto e adicione PostgreSQL
3. Copie a Database URL
4. Use no `DATABASE_URL`

### Executar Migrations em Produção

Após configurar o banco, execute as migrations:

```bash
# Localmente, apontando para o banco de produção
npx prisma db push

# Ou via Vercel CLI
vercel env pull .env.production
npx prisma db push
```

## 📡 API Endpoints

### Agendamentos

- `GET /api/appointments?date=YYYY-MM-DD` - Listar agendamentos por data
- `POST /api/appointments` - Criar agendamento
- `GET /api/appointments/:id` - Buscar agendamento
- `PATCH /api/appointments/:id` - Atualizar agendamento/status
- `DELETE /api/appointments/:id` - Deletar agendamento
- `POST /api/appointments/availability` - Verificar disponibilidade

### Clientes

- `GET /api/customers?search=termo` - Listar/buscar clientes
- `POST /api/customers` - Criar cliente
- `GET /api/customers/:id` - Buscar cliente com histórico
- `PATCH /api/customers/:id` - Atualizar cliente
- `DELETE /api/customers/:id` - Deletar cliente

### Carros

- `GET /api/cars?customerId=id` - Listar carros
- `POST /api/cars` - Criar carro
- `GET /api/cars/:id` - Buscar carro
- `PATCH /api/cars/:id` - Atualizar carro
- `DELETE /api/cars/:id` - Deletar carro

### Serviços

- `GET /api/services?activeOnly=true` - Listar serviços
- `POST /api/services` - Criar serviço
- `GET /api/services/:id` - Buscar serviço
- `PATCH /api/services/:id` - Atualizar serviço
- `DELETE /api/services/:id` - Deletar/desativar serviço

### Configurações

- `GET /api/settings` - Buscar configurações
- `PATCH /api/settings` - Atualizar configurações

## 🎯 Regras de Negócio

### Disponibilidade de Horários

1. **Horário de Funcionamento**: Agendamentos só podem ser criados dentro do horário configurado (ex: 08:00 - 18:00)

2. **Intervalo de Slots**: Horários disponíveis são gerados conforme o intervalo configurado (ex: 15 em 15 minutos)

3. **Capacidade**: Respeita o número máximo de carros que podem ser atendidos simultaneamente

4. **Duração**: Calcula automaticamente a duração total somando todos os serviços selecionados

5. **Conflitos**: Não permite criar agendamentos que se sobrepõem além da capacidade

6. **Horário Passado**: Não permite agendar em datas/horários passados

### Status dos Agendamentos

- Novos agendamentos começam com status `SCHEDULED`
- Podem ser movidos para `IN_PROGRESS` quando o serviço iniciar
- Devem ser finalizados como `COMPLETED`
- Podem ser `CANCELED` a qualquer momento
- Se o cliente não comparecer, marcar como `NO_SHOW`

## 🛠️ Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev              # Iniciar servidor de desenvolvimento

# Build
npm run build            # Criar build de produção
npm run start            # Iniciar servidor de produção

# Prisma
npx prisma generate      # Gerar Prisma Client
npx prisma db push       # Aplicar schema ao banco
npx prisma migrate dev   # Criar migration
npx prisma studio        # Abrir interface visual do banco

# Lint
npm run lint             # Executar ESLint
```

## 📝 Notas e Considerações

### Assumido no Desenvolvimento

- Sistema considera apenas dias úteis (pode ser expandido para incluir sábados)
- Horário de funcionamento é único (pode ser expandido para horários diferentes por dia)
- Timezone configurável, mas assumido como America/Sao_Paulo por padrão
- Preços são copiados no momento do agendamento (histórico de valores)
- Serviços podem ser desativados mas não excluídos se tiverem agendamentos

### Melhorias Futuras Sugeridas

- [ ] Sistema de autenticação (usuários/admin)
- [ ] Notificações por WhatsApp/SMS
- [ ] Relatórios e dashboards
- [ ] Exportação de dados (PDF, Excel)
- [ ] Foto dos veículos
- [ ] Notas/avaliações dos clientes
- [ ] Sistema de lembretes automáticos
- [ ] Integração com calendário (Google Calendar)
- [ ] Modo escuro
- [ ] PWA (Progressive Web App)

## 📄 Licença

Este projeto foi desenvolvido como MVP e está disponível para uso e modificação.

## 🤝 Suporte

Para dúvidas ou problemas:
1. Verifique a documentação acima
2. Revise os logs do servidor (`npm run dev`)
3. Verifique as configurações do banco de dados
4. Confirme que todas as variáveis de ambiente estão corretas

---

**Desenvolvido com Next.js 14, TypeScript e Prisma** 🚀
