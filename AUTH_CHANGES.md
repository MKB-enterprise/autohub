# Mudanças no Sistema de Autenticação

## Resumo das Alterações

O sistema de autenticação foi completamente reformulado para:

1. ✅ **Permitir visualização pública de horários** - Usuários não autenticados podem ver os horários disponíveis
2. ✅ **Login com telefone + SMS** - Autenticação via código de verificação por SMS (simulado em desenvolvimento)
3. ✅ **Login com Google** - Preparado para integração com Google OAuth
4. ✅ **Verificação de carro** - Ao tentar agendar, o sistema verifica se o usuário tem pelo menos um carro cadastrado
5. ✅ **Login legado mantido** - O login com email/senha ainda funciona para compatibilidade

## Arquivos Modificados

### Schema do Banco de Dados
- **prisma/schema.prisma** - Adicionados campos:
  - `googleId` - ID do usuário no Google
  - `phoneVerified` - Indica se o telefone foi verificado
  - `verificationCode` - Código de verificação SMS
  - `verificationExpiry` - Data de expiração do código

### Novas APIs
- **app/api/auth/send-code/route.ts** - Envia código SMS (simulado em dev)
- **app/api/auth/verify-code/route.ts** - Verifica código e autentica usuário
- **app/api/auth/google/route.ts** - Autenticação com Google (preparado para produção)

### Componentes Atualizados
- **app/page.tsx** - Nova home pública com visualização de horários
- **app/login/page.tsx** - Login com 3 métodos: Telefone, Google, Email
- **lib/AuthContext.tsx** - Adicionados métodos `loginWithPhone` e `loginWithGoogle`
- **components/LayoutWrapper.tsx** - Permite acesso público à home
- **components/QuickCarRegistration.tsx** - Modal rápido para cadastro de carro

## Como Testar

### 1. Migrar o Banco de Dados

```powershell
npm run db:push
```

OU criar uma migration:

```powershell
npx prisma migrate dev --name add_new_auth_methods
```

### 2. Iniciar o Servidor

```powershell
npm run dev
```

### 3. Fluxo de Teste - Login com Telefone

1. Acesse http://localhost:3000
2. Veja os horários disponíveis (sem login)
3. Clique em um horário
4. Escolha "Telefone" no login
5. Digite um número de telefone (ex: 11999999999)
6. Clique em "Enviar código SMS"
7. **Em desenvolvimento, o código aparecerá na tela em amarelo**
8. Digite o código e clique em "Verificar código"
9. Se não tiver carro cadastrado, será solicitado o cadastro
10. Após cadastrar o carro, será redirecionado para o agendamento

### 4. Fluxo de Teste - Login com Email/Senha

1. No login, escolha "Email"
2. Use as credenciais existentes
3. Funciona como antes

### 5. Fluxo de Teste - Google Login

- Atualmente retorna mensagem informando que está em desenvolvimento
- Para produção, será necessário configurar Google OAuth

## Configurações Necessárias para Produção

### SMS (Twilio, AWS SNS, etc)

Em **app/api/auth/send-code/route.ts**, substitua:

```typescript
// DESENVOLVIMENTO
console.log(`📱 Código de verificação para ${normalizedPhone}: ${verificationCode}`)

// PRODUÇÃO - Exemplo com Twilio
await twilioClient.messages.create({
  body: `Seu código de verificação é: ${verificationCode}`,
  to: normalizedPhone,
  from: process.env.TWILIO_PHONE_NUMBER
})
```

### Google OAuth

1. Instalar dependências:
```powershell
npm install @react-oauth/google
```

2. Criar credenciais no Google Cloud Console

3. Adicionar ao .env:
```
GOOGLE_CLIENT_ID=seu_client_id
GOOGLE_CLIENT_SECRET=seu_client_secret
```

4. Implementar em **app/login/page.tsx**:
```typescript
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google'
```

## Recursos em Desenvolvimento

### ✅ Implementado
- Visualização pública de horários
- Login por telefone (simulado)
- Verificação de carro antes de agendar
- Modal de cadastro rápido de carro
- Estrutura para Google OAuth

### 🚧 Para Implementar
- Integração real com serviço de SMS
- Implementação completa do Google OAuth
- Carregamento dinâmico de horários da API na home
- Limite de tentativas para código SMS
- Rate limiting nas APIs de autenticação

## Segurança

- Códigos SMS expiram em 10 minutos
- JWT continua com expiração de 7 dias
- Telefone é normalizado (apenas números)
- GoogleId é único no banco

## Notas Importantes

1. **Telefone Temporário para Google**: Usuários que fazem login com Google recebem um telefone temporário no formato `google_[id]`. Você pode pedir para atualizarem depois.

2. **Migração de Usuários Existentes**: Usuários com email/senha continuam funcionando normalmente. Os novos campos são opcionais.

3. **Ambiente de Desenvolvimento**: O código SMS é retornado na resposta da API apenas em desenvolvimento (`NODE_ENV !== 'production'`).

4. **Primeiro Carro**: Quando um usuário faz login pela primeira vez e não tem carro, ele é redirecionado para `/carros?firstCar=true` para cadastrar.

## Próximos Passos Sugeridos

1. Testar todo o fluxo em desenvolvimento
2. Configurar serviço de SMS para produção
3. Implementar Google OAuth completo
4. Adicionar testes automatizados
5. Implementar rate limiting
6. Adicionar analytics para tracking de conversão
