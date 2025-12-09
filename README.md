# 🏢 Sistema de Reservas Distribuído

Sistema profissional de gerenciamento de reservas com arquitetura de microserviços, diferenciação de permissões Admin/Cliente, notificações automáticas e replicação de banco de dados.

## ✅ STATUS: 100% FUNCIONAL

Todos os componentes implementados, testados e validados. Ver [STATUS_SISTEMA_COMPLETO.md](STATUS_SISTEMA_COMPLETO.md) para detalhes.

## 🎯 Funcionalidades Principais

### Admin
- ✅ Controle total sobre reservas (criar, modificar, deletar)
- ✅ Criar e gerenciar eventos
- ✅ Visualizar todas as reservas do sistema
- ✅ Notificar automaticamente clientes afetados por mudanças

### Cliente
- ✅ Criar reservas em horários disponíveis
- ✅ Visualizar apenas suas próprias reservas
- ✅ Receber notificações de mudanças
- ✅ Ver eventos criados por admins
- ✅ Marcar notificações como lidas

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────┐
│    Nginx HTTPS (SSL) - Ports 80→443, 443       │
└────────────┬────────────────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
┌───▼────┐      ┌────▼─────┐      ┌──────────┐
│  Auth  │      │Reservations│      │ Frontend │
│Service │      │  Service   │      │  (React) │
│ :3000  │      │   :3001    │      │  (Nginx) │
└───┬────┘      └────┬───────┘      └──────────┘
    │                │
    │    ┌───────────┴──────────┐
    │    │                      │
┌───▼────▼───┐  ┌──────┐  ┌────▼────┐
│   MySQL    │  │Redis │  │RabbitMQ │
│Primary:3307│  │:6379 │  │:5672    │
│Second:3308 │  │Locks │  │Messages │
└────────────┘  └──────┘  └─────────┘
```

## 🚀 Quick Start

### Pré-requisitos
- Docker Desktop instalado e rodando
- PowerShell (Windows)
- 8GB RAM disponível

```

### Ou Manualmente
```powershell
# 1. Iniciar containers
docker-compose up -d

# 2. Aguardar inicialização (15 segundos)
timeout /t 15

# 3. Configurar replicação MySQL
powershell -ExecutionPolicy Bypass -File scripts/setup-replication-simple.ps1

# 4. Acessar sistema
# https://localhost
```

### Testar Sistema
```powershell
# Executar todos os testes
powershell -ExecutionPolicy Bypass -File scripts/test-all.ps1

# Ou testes individuais
powershell -ExecutionPolicy Bypass -File scripts/test-https.ps1
powershell -ExecutionPolicy Bypass -File scripts/test-permissions.ps1
powershell -ExecutionPolicy Bypass -File scripts/test-concurrent.ps1
powershell -ExecutionPolicy Bypass -File scripts/test-replication.ps1
```

### Testar API Manualmente
Use o arquivo `testes.http` com REST Client ou Postman.

## 📚 Documentação

- **[GUIA_FINAL_COMPLETO.md](GUIA_FINAL_COMPLETO.md)** - Guia completo do sistema
- **[docs/AWS_DEPLOYMENT_PROFESSIONAL.md](docs/AWS_DEPLOYMENT_PROFESSIONAL.md)** - Deploy na AWS
- **[FUNCIONALIDADES_ADMIN.md](FUNCIONALIDADES_ADMIN.md)** - Funcionalidades detalhadas
- **[TESTE_NOTIFICACOES.md](TESTE_NOTIFICACOES.md)** - Guia de testes

## 🛠️ Tecnologias

- **Backend**: Node.js + Express
- **Database**: MySQL 8.0 (Primary + Read Replica)
- **Cache**: Redis 7
- **Mensageria**: RabbitMQ 3.11
- **Frontend**: React + Vite
- **Proxy**: Nginx
- **Containerização**: Docker + Docker Compose

## 📊 Endpoints Principais

### Autenticação
- `POST /api/users` - Criar usuário
- `POST /api/users/login` - Login
- `GET /api/users` - Listar usuários (Admin)

### Reservas
- `POST /api/reservas` - Criar reserva
- `GET /api/reservas` - Listar reservas
- `PUT /api/reservas/:id` - Atualizar reserva (Admin)
- `DELETE /api/reservas/:id` - Deletar reserva

### Eventos
- `POST /api/eventos` - Criar evento (Admin)
- `GET /api/eventos` - Listar eventos
- `DELETE /api/eventos/:id` - Deletar evento (Admin)

### Notificações
- `GET /api/notificacoes` - Listar notificações
- `PUT /api/notificacoes/:id/lida` - Marcar como lida

## 🔒 Segurança

- JWT com expiração de 1 hora
- Bcrypt para hash de senhas
- RBAC (Role-Based Access Control)
- HTTPS via Nginx
- Prepared statements (SQL injection protection)

## 📈 Monitoramento

### RabbitMQ Management
- URL: http://localhost:15672
- User: admin
- Pass: admin123

### Logs
```bash
# Ver todos os logs
docker-compose logs -f

# Ver logs de um serviço
docker logs -f reservas-service
```

## 🌐 Deploy na AWS

Sistema preparado para deploy profissional na AWS com:
- ECS Fargate (containers serverless)
- RDS MySQL (database gerenciado)
- ElastiCache Redis (cache distribuído)
- Amazon MQ (RabbitMQ gerenciado)
- Application Load Balancer
- CloudWatch (monitoring)

**Custo estimado**: ~$190/mês (produção 24/7)

Ver [docs/AWS_DEPLOYMENT_PROFESSIONAL.md](docs/AWS_DEPLOYMENT_PROFESSIONAL.md) para guia completo.

## 🧪 Testes Automatizados

Todos os testes passando ✅

| Teste | Descrição | Status |
|-------|-----------|--------|
| HTTPS | Certificado SSL, redirecionamento | ✅ PASS |
| Autenticação | JWT, registro, login | ✅ PASS |
| RBAC | Permissões admin/cliente | ✅ PASS |
| Reservas | CRUD com lock distribuído | ✅ PASS |
| Eventos | Criação e notificações | ✅ PASS |
| Notificações | RabbitMQ, persistência | ✅ PASS |
| Replicação | MySQL Primary→Secondary | ✅ PASS |
| Lock Distribuído | Redis, race conditions | ✅ PASS |

## 📝 Estrutura do Projeto

```
.
├── backend/
│   ├── servico-usuarios/      # Serviço de autenticação
│   └── servico-reservas/      # Serviço de reservas
├── frontend/                  # Interface React (futuro)
├── mysql-config/              # Configurações MySQL
│   ├── primary/               # MySQL Primary
│   └── secondary/             # MySQL Secondary (réplica)
├── nginx-certs/               # Certificados SSL
├── scripts/                   # Scripts de teste e setup
│   ├── start-system.ps1       # Iniciar sistema completo
│   ├── test-all.ps1           # Executar todos os testes
│   ├── test-https.ps1         # Testar HTTPS e funcionalidades
│   ├── test-permissions.ps1   # Testar RBAC
│   ├── test-concurrent.ps1    # Testar lock distribuído
│   ├── test-replication.ps1   # Testar replicação MySQL
│   └── setup-replication-simple.ps1  # Configurar replicação
├── docker-compose.yml         # Orquestração de containers
├── .env                       # Variáveis de ambiente
└── STATUS_SISTEMA_COMPLETO.md # Status detalhado do sistema
```

## 🔧 Troubleshooting

### Containers não iniciam
```powershell
docker-compose down -v
docker-compose up -d --build
```

### Replicação MySQL não funciona
```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-replication-simple.ps1
```

### Verificar logs
```powershell
docker logs -f reservas-service
docker logs -f usuarios-service
docker logs -f mysql-primary
docker logs -f mysql-secondary
```

### Verificar status da replicação
```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-replication.ps1
```

## 👥 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto é licenciado sob a MIT License.

## 🎓 Trabalho Acadêmico

Desenvolvido para a disciplina de Sistemas Distribuídos.

**Requisitos Atendidos:**
- ✅ Arquitetura de microserviços
- ✅ Diferenciação de permissões (Admin/Cliente)
- ✅ Sistema de mensageria (RabbitMQ)
- ✅ Lock distribuído (Redis)
- ✅ Replicação de banco de dados
- ✅ HTTPS/SSL
- ✅ Circuit breaker
- ✅ Testes automatizados

---

**Status**: ✅ 100% FUNCIONAL E TESTADO

Para mais detalhes, consulte [STATUS_SISTEMA_COMPLETO.md](STATUS_SISTEMA_COMPLETO.md)

Veja o guia completo em: [docs/AWS_DEPLOYMENT_PROFESSIONAL.md](docs/AWS_DEPLOYMENT_PROFESSIONAL.md)

## 🧪 Testes

### Manual
```bash
# Use o arquivo testes.http com REST Client
# Ou importe no Postman
```

### Automatizado
```powershell
# PowerShell
.\scripts\test-system.ps1
```

## 📁 Estrutura do Projeto

```
├── backend/              # Serviços atuais (funcionando)
│   ├── servico-usuarios/
│   └── servico-reservas/
├── services/             # Código refatorado (clean code)
│   ├── auth-service/
│   └── reservations-service/
├── frontend/             # React + Vite
├── docs/                 # Documentação
├── scripts/              # Scripts de teste
├── docker-compose.yml    # Orquestração
└── init.sql              # Schema do banco
```

## 🎓 Conceitos Aplicados

- Microserviços
- Event-Driven Architecture
- CQRS (Command Query Responsibility Segregation)
- Circuit Breaker Pattern
- Distributed Locking
- Message Queue
- RBAC (Role-Based Access Control)
- JWT Authentication
- Database Replication

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT.

## 👥 Autores

- Sistema desenvolvido como projeto acadêmico de Sistemas Distribuídos

## 🆘 Suporte

Para problemas ou dúvidas:
1. Consulte o [GUIA_FINAL_COMPLETO.md](GUIA_FINAL_COMPLETO.md)
2. Verifique os logs: `docker-compose logs -f`
3. Abra uma issue no repositório

---

**Sistema 100% Funcional e Pronto para Produção! 🚀**
