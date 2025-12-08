# Guia de Setup AWS - Sistema de Reservas

## Pré-requisitos

1. Conta AWS ativa
2. AWS CLI instalado e configurado
3. Docker instalado
4. Node.js instalado

## Passo 1: Configurar AWS CLI

```bash
# Instalar AWS CLI (se ainda não tiver)
# Windows: https://aws.amazon.com/cli/

# Configurar credenciais
aws configure
# AWS Access Key ID: [sua-key]
# AWS Secret Access Key: [sua-secret]
# Default region: us-east-1
# Default output format: json
```

## Passo 2: Criar Recursos AWS

### 2.1 Criar DynamoDB Tables (Opcional - se não usar RDS)

```bash
# Tabela de Usuários
aws dynamodb create-table \
    --table-name usuarios-prod \
    --attribute-definitions \
        AttributeName=id,AttributeType=S \
        AttributeName=email,AttributeType=S \
    --key-schema \
        AttributeName=id,KeyType=HASH \
    --global-secondary-indexes \
        "[{\"IndexName\":\"email-index\",\"KeySchema\":[{\"AttributeName\":\"email\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"ALL\"},\"ProvisionedThroughput\":{\"ReadCapacityUnits\":5,\"WriteCapacityUnits\":5}}]" \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1

# Tabela de Reservas
aws dynamodb create-table \
    --table-name reservas-prod \
    --attribute-definitions \
        AttributeName=id,AttributeType=S \
        AttributeName=user_id,AttributeType=S \
        AttributeName=room_id,AttributeType=S \
        AttributeName=start_time,AttributeType=S \
    --key-schema \
        AttributeName=id,KeyType=HASH \
    --global-secondary-indexes \
        "[{\"IndexName\":\"user-index\",\"KeySchema\":[{\"AttributeName\":\"user_id\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"ALL\"},\"ProvisionedThroughput\":{\"ReadCapacityUnits\":5,\"WriteCapacityUnits\":5}},{\"IndexName\":\"room-time-index\",\"KeySchema\":[{\"AttributeName\":\"room_id\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"start_time\",\"KeyType\":\"RANGE\"}],\"Projection\":{\"ProjectionType\":\"ALL\"},\"ProvisionedThroughput\":{\"ReadCapacityUnits\":5,\"WriteCapacityUnits\":5}}]" \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1
```

### 2.2 Criar RDS Aurora (Recomendado para manter compatibilidade)

```bash
# Criar subnet group
aws rds create-db-subnet-group \
    --db-subnet-group-name reservas-subnet-group \
    --db-subnet-group-description "Subnet group for reservas DB" \
    --subnet-ids subnet-xxxxx subnet-yyyyy

# Criar cluster Aurora MySQL
aws rds create-db-cluster \
    --db-cluster-identifier reservas-cluster \
    --engine aurora-mysql \
    --engine-version 8.0.mysql_aurora.3.04.0 \
    --master-username admin \
    --master-user-password SuaSenhaSegura123! \
    --database-name reservas_db \
    --db-subnet-group-name reservas-subnet-group \
    --vpc-security-group-ids sg-xxxxx

# Criar instância no cluster
aws rds create-db-instance \
    --db-instance-identifier reservas-instance-1 \
    --db-instance-class db.t3.small \
    --engine aurora-mysql \
    --db-cluster-identifier reservas-cluster
```

### 2.3 Criar ElastiCache Redis

```bash
# Criar subnet group
aws elasticache create-cache-subnet-group \
    --cache-subnet-group-name reservas-redis-subnet \
    --cache-subnet-group-description "Redis subnet for reservas" \
    --subnet-ids subnet-xxxxx subnet-yyyyy

# Criar cluster Redis
aws elasticache create-cache-cluster \
    --cache-cluster-id reservas-redis \
    --cache-node-type cache.t3.micro \
    --engine redis \
    --num-cache-nodes 1 \
    --cache-subnet-group-name reservas-redis-subnet \
    --security-group-ids sg-xxxxx
```

## Passo 3: Criar ECR Repositories

```bash
# Criar repositórios para as imagens Docker
aws ecr create-repository --repository-name usuarios-service --region us-east-1
aws ecr create-repository --repository-name reservas-service --region us-east-1
aws ecr create-repository --repository-name frontend-nginx --region us-east-1
```

## Passo 4: Build e Push das Imagens

```bash
# Obter login do ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin SEU_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build e Push - Serviço de Usuários
cd backend/servico-usuarios
docker build -t usuarios-service:latest .
docker tag usuarios-service:latest SEU_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/usuarios-service:latest
docker push SEU_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/usuarios-service:latest

# Build e Push - Serviço de Reservas
cd ../servico-reservas
docker build -t reservas-service:latest .
docker tag reservas-service:latest SEU_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/reservas-service:latest
docker push SEU_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/reservas-service:latest

# Build e Push - Frontend
cd ../../frontend
docker build -t frontend-nginx:latest .
docker tag frontend-nginx:latest SEU_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/frontend-nginx:latest
docker push SEU_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/frontend-nginx:latest
```

## Passo 5: Criar ECS Cluster

```bash
# Criar cluster ECS
aws ecs create-cluster --cluster-name reservas-cluster --region us-east-1

# Criar Task Execution Role (se não existir)
aws iam create-role \
    --role-name ecsTaskExecutionRole \
    --assume-role-policy-document file://ecs-trust-policy.json

aws iam attach-role-policy \
    --role-name ecsTaskExecutionRole \
    --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
```

## Passo 6: Criar Task Definitions

Criar arquivo `task-definition-usuarios.json`:

```json
{
  "family": "usuarios-service",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::SEU_ACCOUNT_ID:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "usuarios-service",
      "image": "SEU_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/usuarios-service:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_PORT", "value": "3000"},
        {"name": "DB_HOST", "value": "seu-rds-endpoint.rds.amazonaws.com"},
        {"name": "DB_USER", "value": "admin"},
        {"name": "DB_PASSWORD", "value": "SuaSenhaSegura123!"},
        {"name": "DB_NAME", "value": "reservas_db"},
        {"name": "DB_PORT", "value": "3306"},
        {"name": "JWT_SECRET", "value": "seu-jwt-secret-super-seguro"}
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

Registrar task definition:

```bash
aws ecs register-task-definition --cli-input-json file://task-definition-usuarios.json
aws ecs register-task-definition --cli-input-json file://task-definition-reservas.json
```

## Passo 7: Criar Application Load Balancer

```bash
# Criar ALB
aws elbv2 create-load-balancer \
    --name reservas-alb \
    --subnets subnet-xxxxx subnet-yyyyy \
    --security-groups sg-xxxxx \
    --scheme internet-facing \
    --type application

# Criar Target Groups
aws elbv2 create-target-group \
    --name usuarios-tg \
    --protocol HTTP \
    --port 3000 \
    --vpc-id vpc-xxxxx \
    --target-type ip \
    --health-check-path /health

aws elbv2 create-target-group \
    --name reservas-tg \
    --protocol HTTP \
    --port 3001 \
    --vpc-id vpc-xxxxx \
    --target-type ip \
    --health-check-path /health

# Criar Listeners
aws elbv2 create-listener \
    --load-balancer-arn arn:aws:elasticloadbalancing:... \
    --protocol HTTP \
    --port 80 \
    --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:...
```

## Passo 8: Criar ECS Services

```bash
# Service de Usuários
aws ecs create-service \
    --cluster reservas-cluster \
    --service-name usuarios-service \
    --task-definition usuarios-service \
    --desired-count 2 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxx,subnet-yyyyy],securityGroups=[sg-xxxxx],assignPublicIp=ENABLED}" \
    --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=usuarios-service,containerPort=3000"

# Service de Reservas
aws ecs create-service \
    --cluster reservas-cluster \
    --service-name reservas-service \
    --task-definition reservas-service \
    --desired-count 2 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxx,subnet-yyyyy],securityGroups=[sg-xxxxx],assignPublicIp=ENABLED}" \
    --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=reservas-service,containerPort=3001"
```

## Passo 9: Deploy Frontend no S3 + CloudFront

```bash
# Criar bucket S3
aws s3 mb s3://reservas-frontend-prod

# Build do frontend
cd frontend
npm run build

# Upload para S3
aws s3 sync dist/ s3://reservas-frontend-prod --delete

# Configurar bucket para hosting
aws s3 website s3://reservas-frontend-prod --index-document index.html --error-document index.html

# Criar distribuição CloudFront
aws cloudfront create-distribution --origin-domain-name reservas-frontend-prod.s3.amazonaws.com
```

## Passo 10: Configurar DNS e SSL

```bash
# Solicitar certificado SSL
aws acm request-certificate \
    --domain-name reservas.seudominio.com \
    --validation-method DNS \
    --region us-east-1

# Após validação, associar ao ALB
aws elbv2 create-listener \
    --load-balancer-arn arn:aws:elasticloadbalancing:... \
    --protocol HTTPS \
    --port 443 \
    --certificates CertificateArn=arn:aws:acm:... \
    --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:...
```

## Monitoramento

```bash
# Ver logs do ECS
aws logs tail /ecs/usuarios-service --follow

# Ver status dos services
aws ecs describe-services --cluster reservas-cluster --services usuarios-service reservas-service

# Ver métricas
aws cloudwatch get-metric-statistics \
    --namespace AWS/ECS \
    --metric-name CPUUtilization \
    --dimensions Name=ServiceName,Value=usuarios-service \
    --start-time 2024-01-01T00:00:00Z \
    --end-time 2024-01-01T23:59:59Z \
    --period 3600 \
    --statistics Average
```

## Custos Estimados

- **ECS Fargate (4 tasks)**: ~$60/mês
- **RDS Aurora (db.t3.small)**: ~$50/mês
- **ElastiCache (cache.t3.micro)**: ~$15/mês
- **ALB**: ~$20/mês
- **S3 + CloudFront**: ~$5/mês
- **Data Transfer**: ~$10/mês

**Total estimado: ~$160/mês**

## Alternativa Mais Econômica

Use **AWS Lightsail** para começar:
- Container Service (2 nodes): $40/mês
- Database (MySQL): $15/mês
- **Total: ~$55/mês**

```bash
# Criar container service no Lightsail
aws lightsail create-container-service \
    --service-name reservas-app \
    --power small \
    --scale 2
```
