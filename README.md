# 🚀 Sistema de Reserva de Salas - AWS Free Tier

## ✨ Deploy Automático Distribuído

**Sua aplicação rodando 100% na nuvem AWS com arquitetura de microserviços!**

### 🏗️ Arquitetura Distribuída (Free Tier)
- **5 Containers ECS Fargate**: Frontend, APIs, Redis, RabbitMQ
- **RDS MySQL**: Banco de dados gerenciado (db.t3.micro)
- **ECR**: Repositórios de imagens Docker
- **CloudWatch**: Logs centralizados
- **💰 Custo**: $0 (Free Tier por 12 meses)

## 🚀 Deploy em 1 Comando

### Windows (PowerShell):
```powershell
.\deploy-completo.ps1
```

### Linux/Mac (Bash):
```bash
./deploy-completo.sh
```

**Pronto! Em 15 minutos sua aplicação estará rodando na AWS de forma distribuída.**

## 📋 Pré-requisitos

1. **AWS CLI configurado**:
```bash
aws configure
```

2. **Docker Desktop rodando**

3. **Conta AWS** (Free Tier suficiente)

## 🎯 O que será criado automaticamente

### Infraestrutura AWS:
```
Internet → Frontend (ECS) → APIs (ECS) → RDS MySQL
                    ↓
            Redis (ECS) + RabbitMQ (ECS)
```

### 5 Containers ECS Fargate:
- **Frontend**: React + Nginx (porta 80/443)
- **API Usuários**: Node.js (porta 3000)
- **API Reservas**: Node.js (porta 3001)
- **Redis**: Cache distribuído (porta 6379)
- **RabbitMQ**: Mensageria (porta 5672/15672)

### Recursos AWS:
- **RDS MySQL**: db.t3.micro, 20GB (Free Tier)
- **ECR**: 5 repositórios de imagens
- **CloudWatch**: Logs de todos os serviços
- **IAM**: Roles para ECS

## 📱 Scripts Disponíveis

### Deploy Completo:
```bash
# Windows
.\deploy-completo.ps1

# Linux/Mac  
./deploy-completo.sh
```

### Verificar Status:
```bash
# Windows
.\check-aws-status.ps1

# Linux/Mac
./check-aws-status.sh
```

### Limpar Recursos:
```bash
# Windows
.\cleanup-aws.ps1

# Linux/Mac
./cleanup-aws.sh
```

## 🔧 Deploy Manual (Passo a Passo)

Se preferir executar manualmente:
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/sistema-reservas/frontend:latest
```

### 2. Criar Infraestrutura de Dados

#### RDS MySQL (Multi-AZ)
```bash
aws rds create-db-instance \
  --db-instance-identifier sistema-reservas-db \
  --db-instance-class db.t3.micro \
  --engine mysql \
  --engine-version 8.0 \
  --master-username admin \
  --master-user-password <senha-segura> \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-xxxxxxxxx \
  --db-subnet-group-name default \
  --multi-az \
  --backup-retention-period 7 \
  --storage-encrypted
```

#### ElastiCache Redis
```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id sistema-reservas-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1 \
  --security-group-ids sg-xxxxxxxxx
```

#### Amazon MQ (RabbitMQ)
```bash
aws mq create-broker \
  --broker-name sistema-reservas-mq \
  --engine-type RabbitMQ \
  --engine-version 3.9.16 \
  --host-instance-type mq.t3.micro \
  --users Username=admin,Password=<senha-segura> \
  --deployment-mode SINGLE_INSTANCE \
  --security-groups sg-xxxxxxxxx \
  --subnet-ids subnet-xxxxxxxxx
```

### 3. Configurar ECS Cluster

#### Criar Cluster
```bash
aws ecs create-cluster --cluster-name sistema-reservas-cluster
```

#### Task Definitions

**usuarios-service-task.json**:
```json
{
  "family": "usuarios-service",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::<account-id>:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "usuarios-service",
      "image": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/sistema-reservas/usuarios-service:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_PORT", "value": "3000"},
        {"name": "DB_HOST", "value": "<rds-endpoint>"},
        {"name": "DB_USER", "value": "admin"},
        {"name": "DB_PASSWORD", "value": "<senha-db>"},
        {"name": "DB_NAME", "value": "sistema_reservas"},
        {"name": "JWT_SECRET", "value": "<jwt-secret>"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/usuarios-service",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

**reservas-service-task.json**:
```json
{
  "family": "reservas-service",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::<account-id>:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "reservas-service",
      "image": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/sistema-reservas/reservas-service:latest",
      "portMappings": [
        {
          "containerPort": 3001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_PORT", "value": "3001"},
        {"name": "DB_HOST", "value": "<rds-endpoint>"},
        {"name": "DB_USER", "value": "admin"},
        {"name": "DB_PASSWORD", "value": "<senha-db>"},
        {"name": "DB_NAME", "value": "sistema_reservas"},
        {"name": "JWT_SECRET", "value": "<jwt-secret>"},
        {"name": "REDIS_HOST", "value": "<redis-endpoint>"},
        {"name": "RABBITMQ_HOST", "value": "<mq-endpoint>"},
        {"name": "RABBITMQ_USER", "value": "admin"},
        {"name": "RABBITMQ_PASS", "value": "<senha-mq>"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/reservas-service",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

#### Registrar Task Definitions
```bash
aws ecs register-task-definition --cli-input-json file://usuarios-service-task.json
aws ecs register-task-definition --cli-input-json file://reservas-service-task.json
```

### 4. Criar Services ECS

```bash
# Service usuarios-service
aws ecs create-service \
  --cluster sistema-reservas-cluster \
  --service-name usuarios-service \
  --task-definition usuarios-service \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxxxxxx,subnet-yyyyyyyyy],securityGroups=[sg-xxxxxxxxx],assignPublicIp=ENABLED}"

# Service reservas-service  
aws ecs create-service \
  --cluster sistema-reservas-cluster \
  --service-name reservas-service \
  --task-definition reservas-service \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxxxxxx,subnet-yyyyyyyyy],securityGroups=[sg-xxxxxxxxx],assignPublicIp=ENABLED}"
```

### 5. Configurar Application Load Balancer

```bash
# Criar ALB
aws elbv2 create-load-balancer \
  --name sistema-reservas-alb \
  --subnets subnet-xxxxxxxxx subnet-yyyyyyyyy \
  --security-groups sg-xxxxxxxxx

# Criar Target Groups
aws elbv2 create-target-group \
  --name usuarios-service-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id vpc-xxxxxxxxx \
  --target-type ip \
  --health-check-path /health

aws elbv2 create-target-group \
  --name reservas-service-tg \
  --protocol HTTP \
  --port 3001 \
  --vpc-id vpc-xxxxxxxxx \
  --target-type ip \
  --health-check-path /health

# Criar Listeners com regras de roteamento
aws elbv2 create-listener \
  --load-balancer-arn <alb-arn> \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=<certificate-arn> \
  --default-actions Type=forward,TargetGroupArn=<frontend-tg-arn>
```

### 6. Deploy Frontend (S3 + CloudFront)

```bash
# Build do frontend
cd frontend
npm run build

# Upload para S3
aws s3 sync dist/ s3://sistema-reservas-frontend-bucket --delete

# Criar distribuição CloudFront
aws cloudfront create-distribution --distribution-config file://cloudfront-config.json
```

### 7. Configurar DNS (Route 53)

```bash
# Criar hosted zone
aws route53 create-hosted-zone --name sistema-reservas.com --caller-reference $(date +%s)

# Criar records apontando para ALB e CloudFront
aws route53 change-resource-record-sets --hosted-zone-id <zone-id> --change-batch file://dns-records.json
```

## 🔧 Configurações de Ambiente

### Variáveis de Ambiente AWS
```bash
export AWS_REGION=us-east-1
export DB_ENDPOINT=<rds-endpoint>
export REDIS_ENDPOINT=<redis-endpoint>  
export MQ_ENDPOINT=<mq-endpoint>
export JWT_SECRET=<jwt-secret-seguro>
```

## 📊 Monitoramento

### CloudWatch Logs
- `/ecs/usuarios-service`
- `/ecs/reservas-service`

### CloudWatch Metrics
- ECS Service CPU/Memory
- RDS Connections/Performance
- ALB Request Count/Latency
- ElastiCache Hit Rate

## 🔒 Segurança

### Security Groups
- **ALB-SG**: 80,443 from 0.0.0.0/0
- **ECS-SG**: 3000,3001 from ALB-SG
- **RDS-SG**: 3306 from ECS-SG
- **Redis-SG**: 6379 from ECS-SG
- **MQ-SG**: 5672 from ECS-SG

### IAM Roles
- **ecsTaskExecutionRole**: ECR, CloudWatch Logs
- **ecsTaskRole**: RDS, ElastiCache, MQ access

## 🚀 Comandos de Deploy Rápido

```bash
# Script completo de deploy
./deploy-aws.sh
```

## 📈 Escalabilidade

### Auto Scaling
```bash
# Configurar auto scaling para ECS services
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/sistema-reservas-cluster/usuarios-service \
  --min-capacity 2 \
  --max-capacity 10
```

### Multi-Region (Opcional)
- Replicar infraestrutura em us-west-2
- Configurar Route 53 health checks
- Cross-region RDS read replicas

## 💰 Estimativa de Custos (Mensal)

- **ECS Fargate**: ~$30 (2 tasks x 2 services)
- **RDS t3.micro Multi-AZ**: ~$25
- **ElastiCache t3.micro**: ~$15
- **Amazon MQ t3.micro**: ~$20
- **ALB**: ~$20
- **CloudFront**: ~$5
- **Total**: ~$115/mês

## 🔄 CI/CD (Opcional)

### GitHub Actions / CodePipeline
1. Build automático das imagens
2. Push para ECR
3. Update ECS services
4. Deploy frontend para S3
5. Invalidação CloudFront

---

**Sistema pronto para produção distribuída na AWS!** 🚀

### 1. Preparação:
```bash
./prepare-aws-deploy.sh
```

### 2. Deploy:
```bash
./deploy-aws.sh
```

### 3. Verificar:
```bash
./check-aws-status.sh
```

## 💰 Custos AWS Free Tier

### ✅ Recursos Gratuitos (12 meses):
- **ECS Fargate**: 750 horas/mês
- **RDS MySQL**: 750 horas/mês (db.t3.micro)
- **ECR**: 500MB/mês
- **CloudWatch**: 5GB logs/mês
- **Data Transfer**: 1GB/mês

### 📊 Uso Real do Sistema:
- **5 containers ECS**: ~150h/mês cada = 750h total ✅
- **RDS MySQL**: ~720h/mês ✅
- **Imagens Docker**: ~200MB ✅
- **Logs**: ~1GB/mês ✅

**💡 Resultado: $0/mês por ~5 meses (dentro do Free Tier)**

## 🔍 Monitoramento

### Ver Logs em Tempo Real:
```bash
aws logs tail /ecs/usuarios-service --follow
aws logs tail /ecs/reservas-service --follow
aws logs tail /ecs/frontend-nginx --follow
```

### Reiniciar Serviços:
```bash
aws ecs update-service --cluster sistema-reservas-cluster --service usuarios-service --force-new-deployment
```

### Escalar Serviços:
```bash
aws ecs update-service --cluster sistema-reservas-cluster --service usuarios-service --desired-count 2
```

## 🌐 Acesso à Aplicação

Após o deploy, você receberá os IPs públicos:

- **Frontend**: `https://[IP_FRONTEND]`
- **API Usuários**: `http://[IP_USUARIOS]:3000`
- **API Reservas**: `http://[IP_RESERVAS]:3001`
- **RabbitMQ Management**: `http://[IP_RABBITMQ]:15672`
  - Usuário: `admin`
  - Senha: `rabbitmq2024`

## 🚨 Importante

### ✅ Vantagens:
- **Arquitetura distribuída real**
- **Microserviços independentes**
- **Banco de dados gerenciado**
- **Logs centralizados**
- **Escalabilidade automática**
- **Zero custo (Free Tier)**

### ⚠️ Limitações Free Tier:
- **750 horas/mês** por serviço ECS
- **20GB** storage RDS
- **1GB** data transfer/mês
- **Sem Load Balancer** (não é Free Tier)

### 💡 Dicas:
- **Monitore uso**: AWS Console → Billing & Cost Management
- **Pare quando não usar**: Execute `./cleanup-aws.sh`
- **Logs limitados**: 5GB/mês no CloudWatch

## 🎉 Resultado Final

Após executar o deploy você terá:

✅ **Sistema 100% na nuvem AWS**  
✅ **Arquitetura de microserviços profissional**  
✅ **Banco de dados MySQL gerenciado**  
✅ **Cache Redis distribuído**  
✅ **Sistema de mensageria RabbitMQ**  
✅ **Logs centralizados no CloudWatch**  
✅ **Containers independentes e escaláveis**  
✅ **Custo $0 por meses (Free Tier)**  

**🚀 Sua aplicação rodando em produção na AWS de forma distribuída!**

---

## 📚 Documentação Adicional

- [DEPLOY_AWS_GUIA.md](DEPLOY_AWS_GUIA.md) - Guia detalhado passo a passo
- [Logs do Sistema](https://console.aws.amazon.com/cloudwatch/home#logsV2:log-groups) - CloudWatch Logs
- [AWS Free Tier](https://aws.amazon.com/free/) - Detalhes dos recursos gratuitos