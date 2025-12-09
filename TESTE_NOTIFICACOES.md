# 🧪 Guia Rápido - Testar Sistema de Notificações

## 🚀 Passo a Passo

### 1️⃣ Rebuild do Sistema
```powershell
# Parar containers e limpar volumes
docker-compose down -v

# Rebuild e iniciar
docker-compose up --build
```

### 2️⃣ Aguardar Inicialização
Aguarde até ver as mensagens:
```
✅ [Reservas] Conectado ao MySQL
✅ [RabbitMQ] Conectado com sucesso!
✅ [RabbitMQ] Aguardando mensagens na fila 'notifications'...
```

### 3️⃣ Criar Usuário Cliente
```http
POST http://localhost/api/users
Content-Type: application/json

{
  "name": "João Cliente",
  "email": "joao@exemplo.com",
  "password": "senha123"
}
```

### 4️⃣ Login Cliente
```http
POST http://localhost/api/users/login
Content-Type: application/json

{
  "email": "joao@exemplo.com",
  "password": "senha123"
}
```
**Salve o token retornado!**

### 5️⃣ Cliente Cria Reserva
```http
POST http://localhost/api/reservas
Authorization: Bearer {TOKEN_DO_CLIENTE}
Content-Type: application/json

{
  "room_id": "sala_103",
  "start_time": "2025-12-15T14:00:00",
  "end_time": "2025-12-15T15:00:00"
}
```
**Salve o ID da reserva retornado!**

### 6️⃣ Criar Usuário Admin
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

### 7️⃣ Login Admin
```http
POST http://localhost/api/users/login
Content-Type: application/json

{
  "email": "admin@exemplo.com",
  "password": "admin123"
}
```
**Salve o token do admin!**

### 8️⃣ Admin Modifica Reserva do Cliente
```http
PUT http://localhost/api/reservas/{ID_DA_RESERVA}
Authorization: Bearer {TOKEN_DO_ADMIN}
Content-Type: application/json

{
  "room_id": "sala_201",
  "start_time": "2025-12-15T16:00:00",
  "end_time": "2025-12-15T17:00:00"
}
```

### 9️⃣ Cliente Verifica Notificações
```http
GET http://localhost/api/notificacoes
Authorization: Bearer {TOKEN_DO_CLIENTE}
```

**Resultado Esperado:**
```json
[
  {
    "id": "uuid-aqui",
    "user_id": "id-do-joao",
    "message": "Sua reserva foi modificada por um administrador. Nova sala: sala_201, Novo horário: 15/12/2025 16:00:00 - 15/12/2025 17:00:00",
    "type": "reservation_modified",
    "related_id": "id-da-reserva",
    "is_read": false,
    "created_at": "2025-12-09T..."
  }
]
```

### 🔟 Testar Criação de Evento
```http
POST http://localhost/api/eventos
Authorization: Bearer {TOKEN_DO_ADMIN}
Content-Type: application/json

{
  "name": "Reunião Geral",
  "description": "Reunião mensal de todos os departamentos",
  "room_id": "sala_auditorio",
  "start_time": "2025-12-20T09:00:00",
  "end_time": "2025-12-20T12:00:00"
}
```

### 1️⃣1️⃣ Cliente Verifica Nova Notificação
```http
GET http://localhost/api/notificacoes
Authorization: Bearer {TOKEN_DO_CLIENTE}
```

**Resultado Esperado:**
```json
[
  {
    "message": "Novo evento criado: \"Reunião Geral\" na sala sala_auditorio em 20/12/2025 09:00:00",
    "type": "event_created",
    ...
  },
  {
    "message": "Sua reserva foi modificada...",
    "type": "reservation_modified",
    ...
  }
]
```

## 🐰 Monitorar RabbitMQ

1. Acesse: http://localhost:15672
2. Login: `admin` / `admin123`
3. Vá em **Queues** → `notifications`
4. Veja mensagens sendo processadas em tempo real

## 📊 Logs para Acompanhar

No terminal do Docker, você verá:

```
[Reservas] Admin {id} atualizando reserva {id}
[Reservas] Reserva {id} atualizada com sucesso.
[RabbitMQ] Notificação enviada: {...}
[Reservas] Notificação de modificação enviada ao usuário {id}
[RabbitMQ] Mensagem recebida: {...}
[Notificação] Salva no banco para usuário {id}
```

## ✅ Checklist de Testes

- [ ] Cliente consegue criar reserva
- [ ] Admin consegue ver todas as reservas
- [ ] Admin consegue modificar reserva de cliente
- [ ] Cliente recebe notificação de modificação
- [ ] Admin consegue deletar reserva de cliente
- [ ] Cliente recebe notificação de deleção
- [ ] Admin consegue criar evento
- [ ] Cliente recebe notificação de novo evento
- [ ] Cliente consegue listar suas notificações
- [ ] Cliente consegue marcar notificação como lida
- [ ] Cliente NÃO consegue ver notificações de outros
- [ ] Cliente NÃO consegue modificar reservas de outros

## 🔧 Troubleshooting

### RabbitMQ não conecta
```powershell
# Verificar se o container está rodando
docker ps | findstr rabbitmq

# Ver logs do RabbitMQ
docker logs rabbitmq
```

### Notificações não aparecem
```powershell
# Ver logs do serviço de reservas
docker logs reservas-service

# Verificar fila no RabbitMQ Management
# http://localhost:15672 → Queues → notifications
```

### Banco não tem as tabelas novas
```powershell
# Recriar volumes do zero
docker-compose down -v
docker-compose up --build
```

## 🎯 Casos de Uso Reais

### Cenário 1: Admin Cancela Evento
1. Admin cria evento para sala X
2. Todos os clientes são notificados
3. Admin percebe conflito e deleta evento
4. (Opcional) Implementar notificação de cancelamento

### Cenário 2: Manutenção de Sala
1. Admin vê todas as reservas da sala Y
2. Admin modifica todas para sala Z
3. Todos os clientes afetados são notificados automaticamente

### Cenário 3: Cliente Verifica Mudanças
1. Cliente faz login no app
2. Vê badge de notificações não lidas
3. Clica e vê que sua reserva foi remarcada
4. Marca como lida

## 📱 Próximos Passos (Frontend)

Para implementar no frontend:

```javascript
// Buscar notificações não lidas
async function getUnreadNotifications() {
  const response = await fetch('/api/notificacoes', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const notifications = await response.json();
  return notifications.filter(n => !n.is_read);
}

// Marcar como lida
async function markAsRead(notificationId) {
  await fetch(`/api/notificacoes/${notificationId}/lida`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
}

// Polling a cada 30 segundos
setInterval(async () => {
  const unread = await getUnreadNotifications();
  updateNotificationBadge(unread.length);
}, 30000);
```

## 🎉 Sucesso!

Se todos os testes passaram, você tem:
- ✅ Sistema de permissões funcionando
- ✅ Mensageria assíncrona com RabbitMQ
- ✅ Notificações automáticas
- ✅ Admin com controle total
- ✅ Clientes protegidos e informados
