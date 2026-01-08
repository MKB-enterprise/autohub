# 🔍 Guia de Diagnóstico de Disponibilidade

## Problema Atual
Erro ao criar agendamentos no ambiente remoto (Vercel):
- **400 Bad Request** na rota `/api/appointments`
- Mensagem: "Horário sem disponibilidade (capacidade máxima atingida)"

## 🎯 Possíveis Causas

### 1. `maxCarsPerSlot` configurado incorretamente
**Sintoma**: Se estiver em 0 ou 1, bloqueará agendamentos
**Como verificar no Vercel**:
1. Abra o **Dashboard do Vercel**
2. Vá em **Deployments** → seu último deploy
3. Clique em **View Function Logs** 
4. Procure por: `maxCarsPerSlot configurado: X`

**Solução**: Execute no banco de produção:
```sql
-- Verificar configuração atual
SELECT "maxCarsPerSlot", "openingTimeWeekday", "closingTimeWeekday", "timezone" 
FROM "business_settings";

-- Se estiver 0, corrigir para 2 ou 3
UPDATE "business_settings" 
SET "maxCarsPerSlot" = 3 
WHERE "maxCarsPerSlot" = 0;
```

### 2. Agendamentos antigos não finalizados
**Sintoma**: Agendamentos passados com status PENDING/CONFIRMED contam como conflito
**Como verificar**:
```sql
-- Buscar agendamentos antigos pendentes
SELECT id, "startDatetime", status, "customerId"
FROM appointments 
WHERE "startDatetime" < NOW() - INTERVAL '1 day'
  AND status IN ('PENDING', 'CONFIRMED')
ORDER BY "startDatetime" DESC;
```

**Solução**:
```sql
-- Marcar como completados
UPDATE appointments 
SET status = 'COMPLETED'
WHERE "startDatetime" < NOW() - INTERVAL '1 day'
  AND status IN ('PENDING', 'CONFIRMED');
```

### 3. Problema de timezone
**Sintoma**: Horários convertidos incorretamente
**Verificar**: Os logs mostrarão a comparação de horários

### 4. Serviços não encontrados
**Sintoma**: Serviços inativos ou de outro businessId
**Log**: `Serviços encontrados: X/Y`

## 📊 Logs Adicionados (versão atual)

### Na rota `/api/appointments` (POST):
```
=== CRIAR AGENDAMENTO ===
Body recebido: {...}
User autenticado: {...}
📅 Data de início parseada: ...
🔍 Validando disponibilidade do slot...
```

### Na função `validateAppointmentSlot`:
```
=== VALIDAÇÃO DE SLOT ===
Horário solicitado: ...
Fim do serviço (com pausa almoço se aplicável): ...
Duração total (minutos): ...
Agendamentos existentes no dia: ...
maxCarsPerSlot configurado: ...
BusinessId usado: ...
⚠️  PROBLEMA: maxCarsPerSlot está configurado como 0! (se aplicável)
Comparando com agendamento ... : CONFLITO/OK
Total de conflitos: ...
Condição: X >= Y = true/false
❌ BLOQUEADO: ... (se bloqueado)
```

## 🚀 Como Diagnosticar no Vercel

1. **Acesse os logs em tempo real**:
   - Vercel Dashboard → Seu projeto → **Logs**
   - Ou use: `vercel logs --follow`

2. **Tente criar um agendamento** e observe os logs

3. **Procure por**:
   - ⚠️ `PROBLEMA: maxCarsPerSlot está configurado como 0!`
   - ❌ `BLOQUEADO: X conflito(s), limite é Y`
   - `Agendamentos existentes no dia: X`

4. **Anote os valores** e compare com o esperado

## 🛠️ Script de Diagnóstico Local

Se quiser testar localmente primeiro:

```bash
npx tsx scripts/diagnose-availability.ts
```

Este script mostrará:
- ✅ Configurações de todos os negócios
- ✅ Agendamentos ativos
- ⚠️ Agendamentos antigos não finalizados
- 📊 Resumo por dia

## 📝 Checklist Rápido

- [ ] `maxCarsPerSlot` é maior que 0? (ideal: 2-3)
- [ ] Timezone está correto? (`America/Sao_Paulo`)
- [ ] Horários de funcionamento corretos?
- [ ] Não há agendamentos antigos PENDING bloqueando?
- [ ] Os serviços existem e estão ativos?
- [ ] O `businessId` está sendo passado corretamente?

## 🔄 Após Correção

Depois de corrigir no banco:
1. Não precisa redeployar
2. Teste imediatamente
3. Os logs vão mostrar os novos valores

## 💡 Dica Final

O log mais importante é:
```
Condição: X >= Y = true/false
```

Onde:
- **X** = número de conflitos encontrados
- **Y** = `maxCarsPerSlot` configurado

Se `X >= Y` for `true`, o slot é bloqueado.
Se Y = 0, **TODOS** os slots serão bloqueados!
