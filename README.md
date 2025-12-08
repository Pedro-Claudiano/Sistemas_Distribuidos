# Sistema de Reservas de Salas - Distribuído

Sistema completo de reservas de salas com arquitetura de microserviços, autenticação JWT, lock distribuído e pronto para deploy na AWS.

## 🚀 Funcionalidades

- ✅ **Autenticação JWT** com roles (admin/client)
- ✅ **Lock Distribuído** com Redis (previne reservas duplicadas)
- ✅ **Replicação MySQL** (Primary/Secondary)
- ✅ **Circuit Breaker** para resiliência
- ✅ **Logging estruturado** com Winston
- ✅ **Frontend React** com Material-UI
- ✅ **HTTPS** com Nginx
- ✅ **Health Checks** para monitoramento
- ✅ **Docker Compose** para desenvolvimento local
- ✅ **Pronto para AWS** (ECS, RDS, ElastiCache)

## 📋 Pré-requisitos

- Docker Desktop
- Node.js 18+
- Git
- AWS CLI (para deploy na AWS)

## 🏃 Quick Start - Teste Local

### 1. Clone o repositório
```bash
git clone https://github.com/Pedro-Claudiano/Sistemas_Distribuidos.git
cd Sistemas_Distribuidos
```

### 2. Configure as variáveis de ambiente
```bash
# Copie o arquivo de exemplo
copy .env.exemple .env

# O arquivo .env já vem configurado para desenvolvimento local
```

### 3. Execute o script de teste automatizado
```powershell
# Windows PowerShell
.\test-local.ps1
```

**OU** execute manualmente:

```bash
# Instale as dependências
npm install

# Suba os serviços
docker-compose up --build -d

# Aguarde ~30 segundos e crie as tabelas
node create-tables.js
```

### 4. Acesse o sistema
- **Frontend**: https://localhost
- **Demo**: https://localhost/demo
- **API Usuários**: https://localhost/api/users
- **API Reservas**: http://localhost:3001/reservas

## 🧪 Testando o Sistema

### Teste Manual no Navegador
1. Acesse https://localhost
2. Registre um novo usuário
3. Faça login
4. Crie uma reserva de sala
5. **Teste o Lock**: Abra duas abas e tente reservar a mesma sala no mesmo horário

### Teste com Thunder Client / REST Client
Use o arquivo `testes.http` no VS Code:
1. Instale a extensão "Thunder Client" ou "REST Client"
2. Abra o arquivo `testes.http`
3. Execute os requests sequencialmente

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────┐
│           Nginx (HTTPS)                     │
│           Frontend React                    │
└──────────────┬──────────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
┌──────▼──────┐  ┌─────▼──────┐
│  Serviço    │  │  Serviço   │
│  Usuários   │  │  Reservas  │
│  (Port 3000)│  │  (Port 3001)│
└──────┬──────┘  └─────┬──────┘
       │               │
       └───────┬───────┘
               │
    ┌──────────┼──────────┐
    │          │          │
┌───▼────┐ ┌──▼────┐ ┌──▼────┐
│ MySQL  │ │ Redis │ │ MySQL │
│Primary │ │ Lock  │ │Secondary│
└────────┘ └───────┘ └───────┘
```

## 📦 Estrutura do Projeto

```
├── backend/
│   ├── servico-usuarios/     # Autenticação e gestão de usuários
│   └── servico-reservas/     # Gestão de reservas com lock
├── frontend/                 # Interface React
├── config/nginx/             # Configuração Nginx
├── mysql-config/             # Configuração replicação MySQL
├── docker-compose.yml        # Orquestração local
├── init.sql                  # Schema do banco
├── test-local.ps1           # Script de teste local
├── deploy-aws.ps1           # Script de deploy AWS
├── AWS_SETUP.md             # Guia completo de deploy AWS
└── PLANO_AWS_DEPLOY.md      # Plano de migração AWS
```

## ☁️ Deploy na AWS

### Opção 1: Deploy Automatizado
```powershell
# Execute o script de deploy
.\deploy-aws.ps1 -AwsAccountId "123456789012" -AwsRegion "us-east-1"
```

### Opção 2: Deploy Manual
Siga o guia completo em **[AWS_SETUP.md](AWS_SETUP.md)**

### Recursos AWS Necessários
- **ECS Fargate**: Para rodar os containers
- **RDS Aurora MySQL**: Banco de dados gerenciado
- **ElastiCache Redis**: Cache e locks distribuídos
- **Application Load Balancer**: Balanceamento de carga
- **S3 + CloudFront**: Hospedagem do frontend
- **ECR**: Registro de imagens Docker

**Custo estimado**: ~$120-160/mês (ou ~$55/mês com AWS Lightsail)

## 🔧 Comandos Úteis

### Desenvolvimento Local
```bash
# Ver logs de todos os serviços
docker-compose logs -f

# Ver logs de um serviço específico
docker-compose logs -f usuarios-service

# Reiniciar um serviço
docker-compose restart reservas-service

# Parar todos os serviços
docker-compose down

# Parar e remover volumes (limpa banco de dados)
docker-compose down -v

# Reconstruir e subir
docker-compose up --build -d
```

### Monitoramento
```bash
# Ver status dos containers
docker-compose ps

# Ver uso de recursos
docker stats

# Acessar MySQL
docker exec -it mysql-primary mysql -u admin -p

# Acessar Redis
docker exec -it redis_lock redis-cli
```

## 🔐 Segurança

- ✅ Senhas hasheadas com bcrypt
- ✅ JWT com expiração de 1 hora
- ✅ HTTPS com certificados SSL
- ✅ CORS configurado
- ✅ Validação de inputs
- ✅ SQL Injection protection (prepared statements)
- ✅ Rate limiting (recomendado adicionar)

## 📊 Monitoramento e Logs

### Logs Estruturados
O serviço de usuários usa Winston para logs estruturados:
- `info`: Operações normais
- `warn`: Avisos (tentativas de login falhas, etc)
- `error`: Erros críticos

### Health Checks
Todos os serviços expõem endpoint `/health`:
- **200 OK**: Serviço saudável
- **503 Service Unavailable**: Serviço com problemas

### Circuit Breaker
O serviço de usuários implementa Circuit Breaker para proteger o banco:
- 🟢 **Fechado**: Operação normal
- 🟡 **Meio-Aberto**: Testando recuperação
- 🔴 **Aberto**: Banco indisponível, retorna erro 503

## 🧩 Tecnologias Utilizadas

### Backend
- Node.js + Express
- MySQL2 (com connection pooling)
- Redis (ioredis)
- JWT (jsonwebtoken)
- Bcrypt
- Winston (logging)
- Opossum (circuit breaker)

### Frontend
- React 18
- Material-UI (MUI)
- React Router
- Vite

### Infraestrutura
- Docker + Docker Compose
- Nginx
- MySQL 8.0 (com replicação)
- Redis 7

## 📝 Variáveis de Ambiente

Veja `.env.exemple` para desenvolvimento local e `.env.aws.example` para produção AWS.

Principais variáveis:
- `JWT_SECRET`: Secret para assinar tokens JWT
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`: Credenciais MySQL
- `REDIS_HOST`: Endpoint do Redis
- `NODE_PORT`: Porta dos serviços

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto é open source e está disponível sob a licença MIT.

## 👥 Autores

- Pedro Claudiano
- [Contribuidores](https://github.com/Pedro-Claudiano/Sistemas_Distribuidos/graphs/contributors)

## 📞 Suporte

- 📧 Email: [seu-email]
- 🐛 Issues: [GitHub Issues](https://github.com/Pedro-Claudiano/Sistemas_Distribuidos/issues)
- 📖 Documentação: Veja os arquivos `.md` na raiz do projeto

---

**Pronto para produção!** 🚀