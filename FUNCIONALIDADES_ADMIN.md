# Funcionalidades Admin e Sistema de Notificações

## 📋 Visão Geral

O sistema agora possui diferenciação completa entre contas **Admin** e **Cliente**, com sistema de mensageria para notificações automáticas.

## 🔐 Permissões por Tipo de Conta

### Cliente (role: "client")
- ✅ Criar reservas em horários vagos
- ✅ Ver apenas suas próprias reservas
- ✅ Deletar apenas suas próprias reservas
- ✅ Ver eventos criados por admins
- ✅ Receber notificações sobre mudanças em suas reservas
- ✅ Ver e marcar suas notificações como lidas

### Admin (role: "admin")
- ✅ **Todas as permissões de cliente, MAIS:**
- ✅ Ver **todas** as reservas do sistema
- ✅ Deletar **qualquer** reserva
- ✅ **Atualizar/remarcar** qualquer reserva
- ✅ **Criar eventos** e reservar salas para eventos
- ✅ Deletar eventos
- ✅ Listar todos os usuários do sistema

## 🔔 Sistema de Notificações

### Como Funciona
O sistema usa **RabbitMQ** para mensageria assíncrona. Quando um admin realiza ações que afetam clientes, notificações são enviadas automaticamente.

### Tipos de Notificações

1. **reservation_deleted**: Quando admin cancela uma reserva de cliente
2. **reservation_modified**: Quando admin altera horário/sala de uma reserva
3. **event_created**: Quando admin cria um novo evento (todos os clientes são notificados)

### Fluxo de Notificação
```
Admin deleta/modifica reserva
    ↓
Notificação enviada para fila RabbitMQ
    ↓
Consumer processa a mensagem
    ↓
Notificação salva no banco de dados
    ↓
Cliente pode consultar via API
```

## 🎯 Novos Endpoints

### Gerenciamento de Reservas (Admin)

#### Atualizar Reserva
```http
PUT /api/reservas/:id
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "room_id": "sala_201",
  "start_time": "2025-12-10T14:00:00",
  "end_time": "2025-12-10T15:00:00"
}
```
- **Permissão**: Apenas Admin
- **Efeito**: Atualiza a reserva e notifica o cliente afetado

### Gerenciamento de Eventos (Admin)

#### Criar Evento
```http
POST /api/eventos
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "name": "Reunião Geral",
  "description": "Reunião mensal",
  "room_id": "sala_auditorio",
  "start_time": "2025-12-15T09:00:00",
  "end_time": "2025-12-15T12:00:00"
}
```
- **Permissão**: Apenas Admin
- **Efeito**: Cria evento e notifica todos os clientes

#### Listar Eventos
```http
GET /api/eventos
Authorization: Bearer {token}
```
- **Permissão**: Todos os usuários autenticados

#### Deletar Evento
```http
DELETE /api/eventos/:id
Authorization: Bearer {admin_token}
```
- **Permissão**: Apenas Admin

### Notificações (Cliente)

#### Listar Notificações
```http
GET /api/notificacoes
Authorization: Bearer {token}
```
- **Permissão**: Usuário autenticado (vê apenas suas notificações)
- **Retorno**: Lista de notificações ordenadas por data

#### Marcar como Lida
```http
PUT /api/notificacoes/:id/lida
Authorization: Bearer {token}
```
- **Permissão**: Usuário autenticado (apenas suas notificações)

## 🗄️ Novas Tabelas no Banco

### Tabela: Eventos
```sql
CREATE TABLE Eventos (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    room_id VARCHAR(255) NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    created_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_event_room_time (room_id, start_time),
    FOREIGN KEY (created_by) REFERENCES Usuarios(id)
);
```

### Tabela: Notificacoes
```sql
CREATE TABLE Notificacoes (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('reservation_deleted', 'reservation_modified', 'event_created') NOT NULL,
    related_id VARCHAR(36),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Usuarios(id)
);
```

## 🚀 Como Testar

### 1. Criar Usuário Admin
```http
POST http://localhost/api/users
Content-Type: application/json

{
  "name": "Admin Master",
  "email": "admin@exemplo.com",
  "password": "admin123",
  "role": "admin"
}
```

### 2. Criar Usuário Cliente
```http
POST http://localhost/api/users
Content-Type: application/json

{
  "name": "Cliente Teste",
  "email": "cliente@exemplo.com",
  "password": "senha123"
}
```

### 3. Cliente Cria Reserva
```http
POST http://localhost/api/reservas
Authorization: Bearer {cliente_token}
Content-Type: application/json

{
  "room_id": "sala_103",
  "start_time": "2025-12-10T14:00:00",
  "end_time": "2025-12-10T15:00:00"
}
```

### 4. Admin Modifica a Reserva
```http
PUT http://localhost/api/reservas/{id_da_reserva}
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "room_id": "sala_201",
  "start_time": "2025-12-10T16:00:00"
}
```

### 5. Cliente Verifica Notificações
```http
GET http://localhost/api/notificacoes
Authorization: Bearer {cliente_token}
```

**Resultado esperado**: Cliente verá notificação informando que sua reserva foi modificada.

## 🐰 RabbitMQ Management

Acesse a interface de gerenciamento do RabbitMQ:
- **URL**: http://localhost:15672
- **Usuário**: admin
- **Senha**: admin123

Aqui você pode monitorar:
- Filas de mensagens
- Mensagens processadas
- Conexões ativas
- Taxa de processamento

## 📦 Dependências Adicionadas

### backend/servico-reservas/package.json
```json
{
  "dependencies": {
    "amqplib": "^0.10.3"
  }
}
```

## 🔧 Variáveis de Ambiente

Adicione ao seu `.env`:
```env
RABBITMQ_USER=admin
RABBITMQ_PASS=admin123
```

## 🏗️ Arquitetura

```
┌─────────────┐
│   Cliente   │
└──────┬──────┘
       │ Cria reserva
       ↓
┌─────────────────┐
│ Serviço Reservas│
└──────┬──────────┘
       │
       ↓
┌─────────────┐      ┌──────────────┐
│    MySQL    │      │    Redis     │
│  (Reservas) │      │   (Locks)    │
└─────────────┘      └──────────────┘

Admin modifica reserva
       ↓
┌─────────────────┐
│ Serviço Reservas│
└──────┬──────────┘
       │ Envia notificação
       ↓
┌─────────────────┐
│   RabbitMQ      │
│   (Fila)        │
└──────┬──────────┘
       │ Consumer processa
       ↓
┌─────────────────┐
│     MySQL       │
│ (Notificacoes)  │
└─────────────────┘
       ↑
       │ Cliente consulta
┌──────┴──────┐
│   Cliente   │
└─────────────┘
```

## ✅ Checklist de Funcionalidades

- [x] Diferenciação entre Admin e Cliente
- [x] Admin pode ver todas as reservas
- [x] Admin pode deletar qualquer reserva
- [x] Admin pode atualizar/remarcar reservas
- [x] Admin pode criar eventos
- [x] Sistema de mensageria com RabbitMQ
- [x] Notificações automáticas quando admin modifica reservas
- [x] Notificações quando admin deleta reservas
- [x] Notificações quando admin cria eventos
- [x] Cliente pode ver suas notificações
- [x] Cliente pode marcar notificações como lidas
- [x] Eventos reservam salas automaticamente

## 🎓 Próximos Passos

1. **Rebuild dos containers**: `docker-compose down -v && docker-compose up --build`
2. **Testar criação de admin e cliente**
3. **Testar fluxo de notificações**
4. **Verificar RabbitMQ Management UI**
5. **Implementar frontend para exibir notificações** (opcional)
