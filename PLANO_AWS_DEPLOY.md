# Plano de Finalização e Deploy na AWS

## Status Atual do Sistema ✅

O sistema de reserva de salas está **quase completo** com:

### Backend
- ✅ Serviço de Usuários (autenticação JWT, RBAC, Circuit Breaker)
- ✅ Serviço de Reservas (lock distribuído com Redis)
- ✅ MySQL com replicação (Primary/Secondary)
- ✅ Redis para locks distribuídos
- ✅ Docker Compose configurado
- ✅ HTTPS com Nginx

### Frontend
- ✅ Interface React com Material-UI
- ✅ Sistema de login/registro
- ✅ Painel de demonstração (/demo)

## Tarefas Pendentes para Finalizar

### 1. Migração para AWS DynamoDB
Os serviços já têm o SDK da AWS instalado (`@aws-sdk/client-dynamodb`), mas ainda usam MySQL local.

**Opções:**
- **A) Manter MySQL na AWS** (RDS Aurora com replicação)
- **B) Migrar para DynamoDB** (serverless, mais escalável)

### 2. Configuração de Variáveis de Ambiente AWS
Criar arquivo `.env.aws` com:
```env
# AWS Credentials
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=sua-chave
AWS_SECRET_ACCESS_KEY=sua-secret

# DynamoDB Tables (se usar DynamoDB)
DYNAMODB_USERS_TABLE=usuarios-table
DYNAMODB_RESERVATIONS_TABLE=reservas-table

# RDS MySQL (se usar RDS)
DB_HOST=seu-rds-endpoint.rds.amazonaws.com
DB_USER=admin
DB_PASSWORD=senha-segura
DB_NAME=reservas_db
DB_PORT=3306

# Redis (ElastiCache)
REDIS_HOST=seu-elasticache-endpoint.cache.amazonaws.com

# JWT
JWT_SECRET=seu-jwt-secret-super-seguro
```

## Arquitetura AWS Recomendada

### Opção 1: Containers (ECS/Fargate) - Mais Simples
```
┌─────────────────────────────────────────────┐
│           Application Load Balancer         │
│              (HTTPS com ACM)                │
└──────────────┬──────────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
┌──────▼──────┐  ┌─────▼──────┐
│  Frontend   │  │  Backend   │
│  (ECS/S3)   │  │  (ECS)     │
└─────────────┘  └──────┬─────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌─────▼─────┐ ┌──────▼──────┐
│ RDS Aurora   │ │ElastiCache│ │  DynamoDB   │
│  (MySQL)     │ │  (Redis)  │ │  (Opcional) │
└──────────────┘ └───────────┘ └─────────────┘
```

### Opção 2: Serverless (Lambda + API Gateway)
```
┌─────────────────────────────────────────────┐
│              CloudFront + S3                │
│              (Frontend)                     │
└─────────────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────┐
│           API Gateway (REST)                 │
└──────────────┬───────────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
┌──────▼──────┐  ┌─────▼──────┐
│  Lambda     │  │  Lambda    │
│  Usuarios   │  │  Reservas  │
└──────┬──────┘  └─────┬──────┘
       │               │
       └───────┬───────┘
               │
    ┌──────────┼──────────┐
    │          │          │
┌───▼────┐ ┌──▼────┐ ┌──▼────┐
│DynamoDB│ │ElastiCache│ │ RDS │
└────────┘ └───────┘ └─────┘
```

## Passos para Deploy na AWS

### Fase 1: Preparação (Local)
1. ✅ Resolver conflitos Git (FEITO)
2. ⏳ Testar sistema localmente
3. ⏳ Criar scripts de build para produção
4. ⏳ Configurar variáveis de ambiente AWS

### Fase 2: Infraestrutura AWS
1. Criar VPC e Subnets
2. Configurar Security Groups
3. Provisionar RDS Aurora (ou DynamoDB)
4. Provisionar ElastiCache Redis
5. Criar ECR (Elastic Container Registry) para imagens Docker

### Fase 3: Deploy Backend
1. Build das imagens Docker
2. Push para ECR
3. Criar Task Definitions no ECS
4. Configurar ECS Service com Auto Scaling
5. Configurar Application Load Balancer

### Fase 4: Deploy Frontend
1. Build do React (`npm run build`)
2. Upload para S3
3. Configurar CloudFront
4. Configurar certificado SSL (ACM)

### Fase 5: Testes e Monitoramento
1. Testar endpoints
2. Configurar CloudWatch Logs
3. Configurar alarmes
4. Testar escalabilidade

## Comandos Rápidos

### Testar Localmente
```bash
# Subir todos os serviços
docker-compose up --build -d

# Criar tabelas
node create-tables.js

# Ver logs
docker-compose logs -f
```

### Build para Produção
```bash
# Backend
cd backend/servico-usuarios
docker build -t usuarios-service:prod .

cd ../servico-reservas
docker build -t reservas-service:prod .

# Frontend
cd ../../frontend
npm run build
```

### Deploy AWS (com AWS CLI)
```bash
# Login no ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin SEU_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Tag e Push
docker tag usuarios-service:prod SEU_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/usuarios-service:latest
docker push SEU_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/usuarios-service:latest
```

## Próximos Passos Imediatos

1. **Commitar as mudanças resolvidas**
2. **Testar o sistema localmente**
3. **Decidir arquitetura AWS** (ECS vs Lambda)
4. **Criar conta/configurar AWS CLI**
5. **Provisionar recursos AWS**
6. **Deploy!**

## Custos Estimados AWS (Mensal)

### Opção Econômica (ECS + RDS)
- ECS Fargate (2 tasks): ~$30
- RDS Aurora Serverless: ~$50
- ElastiCache (t3.micro): ~$15
- ALB: ~$20
- S3 + CloudFront: ~$5
**Total: ~$120/mês**

### Opção Serverless (Lambda)
- Lambda (1M requests): ~$0.20
- API Gateway: ~$3.50
- DynamoDB (on-demand): ~$10
- ElastiCache: ~$15
- CloudFront: ~$5
**Total: ~$35/mês**

---

**Recomendação:** Começar com ECS (mais simples, similar ao Docker local) e depois otimizar para serverless se necessário.
