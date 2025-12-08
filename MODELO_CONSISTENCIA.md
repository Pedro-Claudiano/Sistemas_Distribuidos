# 📊 Modelo de Consistência - Sistema de Reservas

## Visão Geral

O sistema de reservas implementa um **modelo de consistência híbrido**, combinando:
- **Consistência Forte** para operações críticas (reservas)
- **Consistência Eventual** para operações de leitura (listagens)

---

## 🎯 Modelo Adotado: Consistência Forte com Lock Distribuído

### Justificativa

Para um sistema de reservas de salas, é **crítico** garantir que:
1. Não existam reservas duplicadas para a mesma sala no mesmo horário
2. Todas as instâncias do serviço vejam o mesmo estado
3. Operações concorrentes sejam serializadas

Por isso, adotamos **Consistência Forte** para operações de escrita (criação de reservas).

---

## 🔒 Implementação da Consistência Forte

### 1. Lock Distribuído com Redis

**Arquivo**: `backend/servico-reservas/server.js`

```javascript
// Chave única para o recurso (sala + horário)
const lockKey = `lock:room:${room_id}:time:${start_time}`;
const lockValue = uuidv4();
const lockTTL = 10; // segundos

// Tenta adquirir o lock (SET if Not eXists)
const result = await redisClient.set(lockKey, lockValue, 'EX', lockTTL, 'NX');

if (result !== 'OK') {
  // Lock já existe, outra instância está processando
  return res.status(409).json({ error: 'Recurso em uso' });
}

// Lock adquirido, prossegue com a operação
// ... lógica de negócio ...

// Libera o lock
await redisClient.del(lockKey);
```

### Características:
- ✅ **Atomicidade**: SET NX é atômico no Redis
- ✅ **Exclusão Mútua**: Apenas uma instância pode ter o lock
- ✅ **TTL**: Lock expira automaticamente (previne deadlocks)
- ✅ **Idempotência**: Mesmo lock value garante que só quem pegou pode liberar

### 2. Constraint de Unicidade no Banco de Dados

**Arquivo**: `init.sql`

```sql
CREATE TABLE Reservas (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    room_id VARCHAR(255) NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_room_time (room_id, start_time),  -- 👈 Garante unicidade
    FOREIGN KEY (user_id) REFERENCES Usuarios(id)
);
```

### Características:
- ✅ **Garantia de Unicidade**: Banco rejeita duplicatas
- ✅ **Última Linha de Defesa**: Mesmo se o lock falhar
- ✅ **Consistência Transacional**: ACID do MySQL

---

## 📖 Consistência Eventual para Leituras

### Replicação MySQL (Primary/Secondary)

**Configuração**: `mysql-config/primary/` e `mysql-config/secondary/`

```
┌─────────────┐
│   Primary   │ ◄─── Escritas (INSERT, UPDATE, DELETE)
│   (Master)  │
└──────┬──────┘
       │ Replicação
       │ Assíncrona
       ▼
┌─────────────┐
│  Secondary  │ ◄─── Leituras (SELECT)
│   (Slave)   │
└─────────────┘
```

### Características:
- ✅ **Escritas no Primary**: Garantem consistência forte
- ✅ **Leituras no Secondary**: Podem ter lag (eventual consistency)
- ✅ **Escalabilidade**: Múltiplos secondaries para leituras
- ⚠️ **Lag de Replicação**: Tipicamente < 1 segundo

### Quando usar cada um:

| Operação | Banco | Consistência |
|----------|-------|--------------|
| Criar Reserva | Primary | Forte |
| Criar Usuário | Primary | Forte |
| Login | Primary | Forte |
| Listar Reservas | Secondary | Eventual |
| Buscar Usuário | Secondary | Eventual |

---

## 🔄 Garantias de Consistência

### Nível 1: Consistência Forte (Reservas)

**Garantias**:
1. ✅ Linearizabilidade: Operações aparecem instantaneamente para todos
2. ✅ Atomicidade: Operação completa ou falha completamente
3. ✅ Isolamento: Operações concorrentes são serializadas
4. ✅ Durabilidade: Dados persistidos não são perdidos

**Trade-offs**:
- ❌ Latência maior (lock + transação)
- ❌ Throughput menor (serialização)
- ✅ Correção garantida

### Nível 2: Consistência Eventual (Leituras)

**Garantias**:
1. ✅ Eventualmente consistente: Dados convergem após algum tempo
2. ✅ Alta disponibilidade: Leituras sempre funcionam
3. ✅ Baixa latência: Sem locks ou coordenação

**Trade-offs**:
- ⚠️ Pode ler dados desatualizados (lag < 1s)
- ✅ Alta performance
- ✅ Escalabilidade horizontal

---

## 🧪 Testes de Consistência

### Teste 1: Reserva Concorrente (Consistência Forte)

**Cenário**: Dois usuários tentam reservar a mesma sala simultaneamente

```bash
# Terminal 1
curl -X POST http://localhost:3001/reservas \
  -H "Authorization: Bearer $TOKEN1" \
  -d '{"room_id":"sala_101","start_time":"2025-12-01T10:00:00"}'

# Terminal 2 (ao mesmo tempo)
curl -X POST http://localhost:3001/reservas \
  -H "Authorization: Bearer $TOKEN2" \
  -d '{"room_id":"sala_101","start_time":"2025-12-01T10:00:00"}'
```

**Resultado Esperado**:
- ✅ Uma requisição retorna 201 (sucesso)
- ✅ Outra requisição retorna 409 (conflito)
- ✅ Apenas uma reserva é criada no banco

### Teste 2: Lag de Replicação (Consistência Eventual)

**Cenário**: Criar usuário e imediatamente listar

```bash
# Criar usuário (escreve no Primary)
curl -X POST http://localhost/api/users \
  -d '{"name":"Test","email":"test@test.com","password":"123"}'

# Listar usuários imediatamente (lê do Secondary)
curl http://localhost/api/users \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Resultado Esperado**:
- ⚠️ Novo usuário pode não aparecer imediatamente (lag < 1s)
- ✅ Após 1-2 segundos, usuário aparece na lista
- ✅ Eventualmente consistente

---

## 📈 Métricas de Consistência

### Métricas Monitoradas:

1. **Lag de Replicação**
   ```sql
   SHOW SLAVE STATUS\G
   -- Seconds_Behind_Master: deve ser < 1
   ```

2. **Taxa de Conflitos de Lock**
   ```javascript
   // Contador de 409 (conflitos)
   conflictRate = conflicts / totalRequests
   // Deve ser < 5% em operação normal
   ```

3. **Tempo de Aquisição de Lock**
   ```javascript
   // Tempo entre tentar e conseguir o lock
   lockAcquisitionTime = lockAcquired - lockRequested
   // Deve ser < 100ms
   ```

---

## 🔧 Configuração de Consistência

### Variáveis de Ambiente

```env
# Timeout do lock (segundos)
LOCK_TTL=10

# Timeout de transação (segundos)
DB_TRANSACTION_TIMEOUT=5

# Lag máximo aceitável de replicação (segundos)
MAX_REPLICATION_LAG=2

# Modo de consistência para leituras
READ_CONSISTENCY=eventual  # ou 'strong' para ler do primary
```

### Ajuste Fino

Para **maior consistência** (menor performance):
```env
READ_CONSISTENCY=strong
LOCK_TTL=30
```

Para **maior performance** (menor consistência):
```env
READ_CONSISTENCY=eventual
LOCK_TTL=5
```

---

## 🚨 Cenários de Falha

### Cenário 1: Redis Indisponível

**Problema**: Lock distribuído não funciona

**Comportamento**:
- ❌ Serviço de reservas retorna 503 (Service Unavailable)
- ✅ Não aceita novas reservas (fail-safe)
- ✅ Leituras continuam funcionando

**Recuperação**:
- Redis volta online automaticamente
- Serviço detecta via health check
- Operações normais retomadas

### Cenário 2: Primary MySQL Indisponível

**Problema**: Não é possível escrever

**Comportamento**:
- ❌ Escritas falham (503)
- ✅ Leituras continuam (do Secondary)
- ⚠️ Sistema em modo read-only

**Recuperação**:
- Failover manual para Secondary
- Promover Secondary a Primary
- Reconfigurar aplicação

### Cenário 3: Lag de Replicação Alto

**Problema**: Secondary muito atrasado (> 5s)

**Comportamento**:
- ⚠️ Leituras retornam dados desatualizados
- ✅ Escritas continuam normais
- ⚠️ Usuários podem ver inconsistências temporárias

**Recuperação**:
- Monitorar `Seconds_Behind_Master`
- Se > 5s, redirecionar leituras para Primary
- Investigar causa (rede, carga, etc)

---

## 📚 Referências

### Teorema CAP

Nosso sistema escolhe:
- **C** (Consistency): Para escritas críticas
- **A** (Availability): Para leituras
- **P** (Partition Tolerance): Sempre necessário em sistemas distribuídos

### Modelo de Consistência

- **Escritas**: Linearizável (mais forte)
- **Leituras**: Eventual Consistency (mais fraca)
- **Híbrido**: Otimiza para o caso de uso

### Algoritmos Utilizados

1. **Lock Distribuído**: Redis SET NX (Redlock simplificado)
2. **Replicação**: MySQL Binlog Replication (assíncrona)
3. **Detecção de Conflitos**: Unique Constraint (banco de dados)

---

## 🎯 Conclusão

O sistema implementa um **modelo de consistência pragmático**:

✅ **Forte onde importa**: Reservas (negócio crítico)
✅ **Eventual onde possível**: Leituras (performance)
✅ **Fail-safe**: Prefere falhar a aceitar inconsistência
✅ **Monitorável**: Métricas para detectar problemas

Este modelo garante **correção** sem sacrificar **performance** desnecessariamente.
