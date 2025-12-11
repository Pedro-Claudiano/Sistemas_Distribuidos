#!/bin/bash

# Deploy AWS Free Tier - Sistema de Reserva de Salas
# Execute: chmod +x deploy-aws.sh && ./deploy-aws.sh

set -e

echo "🚀 Iniciando deploy AWS Free Tier..."

# Configurações Free Tier
REGION="us-east-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
CLUSTER_NAME="sistema-reservas-cluster"
DB_PASSWORD="SistemaReservas2024!"
JWT_SECRET="jwt-secret-super-seguro-2024"
RABBITMQ_PASSWORD="rabbitmq2024"

echo "📋 Account ID: $ACCOUNT_ID"
echo "🌍 Region: $REGION"
echo "💰 Configuração: AWS Free Tier"

# 1. Criar repositórios ECR (Free Tier: 500MB por mês)
echo "📦 Criando repositórios ECR..."
aws ecr create-repository --repository-name usuarios-service --region $REGION || true
aws ecr create-repository --repository-name reservas-service --region $REGION || true
aws ecr create-repository --repository-name frontend-nginx --region $REGION || true
aws ecr create-repository --repository-name redis-service --region $REGION || true
aws ecr create-repository --repository-name rabbitmq-service --region $REGION || true

# 2. Login no ECR
echo "🔐 Fazendo login no ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

# 3. Build e push das imagens (otimizadas para Free Tier)
echo "🏗️ Building imagens otimizadas..."

# Usuarios Service
echo "Building usuarios-service..."
docker build -t usuarios-service ./backend/servico-usuarios
docker tag usuarios-service:latest $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/usuarios-service:latest
docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/usuarios-service:latest

# Reservas Service
echo "Building reservas-service..."
docker build -t reservas-service ./backend/servico-reservas
docker tag reservas-service:latest $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/reservas-service:latest
docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/reservas-service:latest

# Frontend
echo "Building frontend-nginx..."
docker build -t frontend-nginx ./frontend
docker tag frontend-nginx:latest $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/frontend-nginx:latest
docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/frontend-nginx:latest

# Redis (usando imagem oficial)
echo "Preparando Redis..."
docker pull redis:7-alpine
docker tag redis:7-alpine $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/redis-service:latest
docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/redis-service:latest

# RabbitMQ (usando imagem oficial)
echo "Preparando RabbitMQ..."
docker pull rabbitmq:3-management-alpine
docker tag rabbitmq:3-management-alpine $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/rabbitmq-service:latest
docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/rabbitmq-service:latest

# 4. Usar VPC padrão (Free Tier)
echo "🌐 Usando VPC padrão..."
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text --region $REGION)
echo "VPC ID: $VPC_ID"

# 5. Criar RDS MySQL Free Tier (db.t3.micro, 20GB)
echo "🗄️ Criando RDS MySQL Free Tier..."
aws rds create-db-instance \
  --db-instance-identifier sistema-reservas-db \
  --db-instance-class db.t3.micro \
  --engine mysql \
  --engine-version 8.0 \
  --master-username admin \
  --master-user-password $DB_PASSWORD \
  --allocated-storage 20 \
  --storage-type gp2 \
  --no-multi-az \
  --backup-retention-period 0 \
  --no-storage-encrypted \
  --publicly-accessible \
  --region $REGION || echo "RDS já existe"

# 6. PULAR ElastiCache (não incluído no Free Tier)
echo "⚠️ Pulando ElastiCache (não incluído no Free Tier)"
echo "💡 Usando Redis local nos containers"

# 7. PULAR Amazon MQ (não incluído no Free Tier) 
echo "⚠️ Pulando Amazon MQ (não incluído no Free Tier)"
echo "💡 Usando RabbitMQ local nos containers"

# 8. Aguardar RDS ficar disponível
echo "⏳ Aguardando RDS ficar disponível..."
aws rds wait db-instance-available --db-instance-identifier sistema-reservas-db --region $REGION

# Obter endpoint do RDS
DB_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier sistema-reservas-db --query 'DBInstances[0].Endpoint.Address' --output text --region $REGION)

echo "📍 DB Endpoint: $DB_ENDPOINT"
echo "💡 Redis e RabbitMQ serão executados como containers no ECS"

# 9. Criar ECS Cluster
echo "🐳 Criando ECS Cluster..."
aws ecs create-cluster --cluster-name $CLUSTER_NAME --region $REGION || echo "Cluster já existe"

# 10. Criar CloudWatch Log Groups
echo "📊 Criando Log Groups..."
aws logs create-log-group --log-group-name /ecs/usuarios-service --region $REGION || true
aws logs create-log-group --log-group-name /ecs/reservas-service --region $REGION || true
aws logs create-log-group --log-group-name /ecs/frontend-nginx --region $REGION || true
aws logs create-log-group --log-group-name /ecs/redis-service --region $REGION || true
aws logs create-log-group --log-group-name /ecs/rabbitmq-service --region $REGION || true

# 11. Criar ou verificar IAM Role para ECS Task Execution
echo "🔐 Verificando IAM Role para ECS..."
aws iam get-role --role-name ecsTaskExecutionRole --region $REGION 2>/dev/null || {
    echo "Criando ecsTaskExecutionRole..."
    aws iam create-role --role-name ecsTaskExecutionRole \
        --assume-role-policy-document '{
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {
                        "Service": "ecs-tasks.amazonaws.com"
                    },
                    "Action": "sts:AssumeRole"
                }
            ]
        }' --region $REGION
    
    aws iam attach-role-policy --role-name ecsTaskExecutionRole \
        --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy --region $REGION
}

# 12. Criar Task Definitions
echo "📋 Criando Task Definitions..."

# Redis Task Definition
cat > redis-service-task.json << EOF
{
  "family": "redis-service",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::$ACCOUNT_ID:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "redis-service",
      "image": "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/redis-service:latest",
      "portMappings": [
        {
          "containerPort": 6379,
          "protocol": "tcp"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/redis-service",
          "awslogs-region": "$REGION",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
EOF

# RabbitMQ Task Definition
cat > rabbitmq-service-task.json << EOF
{
  "family": "rabbitmq-service",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::$ACCOUNT_ID:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "rabbitmq-service",
      "image": "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/rabbitmq-service:latest",
      "portMappings": [
        {
          "containerPort": 5672,
          "protocol": "tcp"
        },
        {
          "containerPort": 15672,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "RABBITMQ_DEFAULT_USER", "value": "admin"},
        {"name": "RABBITMQ_DEFAULT_PASS", "value": "$RABBITMQ_PASSWORD"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/rabbitmq-service",
          "awslogs-region": "$REGION",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
EOF

# Usuarios Service Task Definition
cat > usuarios-service-task.json << EOF
{
  "family": "usuarios-service",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::$ACCOUNT_ID:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "usuarios-service",
      "image": "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/usuarios-service:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_PORT", "value": "3000"},
        {"name": "DB_HOST", "value": "$DB_ENDPOINT"},
        {"name": "DB_USER", "value": "admin"},
        {"name": "DB_PASSWORD", "value": "$DB_PASSWORD"},
        {"name": "DB_NAME", "value": "sistema_reservas"},
        {"name": "DB_PORT", "value": "3306"},
        {"name": "JWT_SECRET", "value": "$JWT_SECRET"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/usuarios-service",
          "awslogs-region": "$REGION",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
EOF

# Reservas Service Task Definition
cat > reservas-service-task.json << EOF
{
  "family": "reservas-service",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::$ACCOUNT_ID:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "reservas-service",
      "image": "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/reservas-service:latest",
      "portMappings": [
        {
          "containerPort": 3001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_PORT", "value": "3001"},
        {"name": "DB_HOST", "value": "$DB_ENDPOINT"},
        {"name": "DB_USER", "value": "admin"},
        {"name": "DB_PASSWORD", "value": "$DB_PASSWORD"},
        {"name": "DB_NAME", "value": "sistema_reservas"},
        {"name": "DB_PORT", "value": "3306"},
        {"name": "JWT_SECRET", "value": "$JWT_SECRET"},
        {"name": "REDIS_HOST", "value": "localhost"},
        {"name": "RABBITMQ_HOST", "value": "localhost"},
        {"name": "RABBITMQ_USER", "value": "admin"},
        {"name": "RABBITMQ_PASS", "value": "$RABBITMQ_PASSWORD"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/reservas-service",
          "awslogs-region": "$REGION",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
EOF

# Frontend Task Definition
cat > frontend-nginx-task.json << EOF
{
  "family": "frontend-nginx",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::$ACCOUNT_ID:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "frontend-nginx",
      "image": "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/frontend-nginx:latest",
      "portMappings": [
        {
          "containerPort": 80,
          "protocol": "tcp"
        },
        {
          "containerPort": 443,
          "protocol": "tcp"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/frontend-nginx",
          "awslogs-region": "$REGION",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
EOF

# Registrar Task Definitions
echo "Registrando Task Definitions..."
aws ecs register-task-definition --cli-input-json file://redis-service-task.json --region $REGION
aws ecs register-task-definition --cli-input-json file://rabbitmq-service-task.json --region $REGION
aws ecs register-task-definition --cli-input-json file://usuarios-service-task.json --region $REGION
aws ecs register-task-definition --cli-input-json file://reservas-service-task.json --region $REGION
aws ecs register-task-definition --cli-input-json file://frontend-nginx-task.json --region $REGION

# 13. Obter subnets padrão
SUBNETS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query 'Subnets[0:2].SubnetId' --output text --region $REGION | tr '\t' ',')

echo "🌐 Subnets: $SUBNETS"

# 14. Criar Services ECS
echo "🚀 Criando ECS Services..."

# Primeiro criar Redis e RabbitMQ
echo "Criando Redis Service..."
aws ecs create-service \
  --cluster $CLUSTER_NAME \
  --service-name redis-service \
  --task-definition redis-service \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNETS],assignPublicIp=ENABLED}" \
  --region $REGION || echo "Service Redis já existe"

echo "Criando RabbitMQ Service..."
aws ecs create-service \
  --cluster $CLUSTER_NAME \
  --service-name rabbitmq-service \
  --task-definition rabbitmq-service \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNETS],assignPublicIp=ENABLED}" \
  --region $REGION || echo "Service RabbitMQ já existe"

# Aguardar serviços de infraestrutura ficarem estáveis
echo "⏳ Aguardando Redis e RabbitMQ ficarem estáveis..."
sleep 30

# Criar serviços de aplicação
echo "Criando Usuarios Service..."
aws ecs create-service \
  --cluster $CLUSTER_NAME \
  --service-name usuarios-service \
  --task-definition usuarios-service \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNETS],assignPublicIp=ENABLED}" \
  --region $REGION || echo "Service usuarios já existe"

echo "Criando Reservas Service..."
aws ecs create-service \
  --cluster $CLUSTER_NAME \
  --service-name reservas-service \
  --task-definition reservas-service \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNETS],assignPublicIp=ENABLED}" \
  --region $REGION || echo "Service reservas já existe"

echo "Criando Frontend Service..."
aws ecs create-service \
  --cluster $CLUSTER_NAME \
  --service-name frontend-nginx \
  --task-definition frontend-nginx \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNETS],assignPublicIp=ENABLED}" \
  --region $REGION || echo "Service frontend já existe"

# 15. Limpar arquivos temporários
echo "🧹 Limpando arquivos temporários..."
rm -f redis-service-task.json rabbitmq-service-task.json usuarios-service-task.json reservas-service-task.json frontend-nginx-task.json

echo "✅ Deploy AWS Free Tier concluído!"
echo ""
echo "📋 Resumo do Deploy:"
echo "🐳 ECS Cluster: $CLUSTER_NAME"
echo "🗄️ RDS MySQL: $DB_ENDPOINT"
echo "📦 ECR Repositories: usuarios-service, reservas-service, frontend-nginx, redis-service, rabbitmq-service"
echo "🚀 ECS Services: redis-service, rabbitmq-service, usuarios-service, reservas-service, frontend-nginx"
echo "📊 CloudWatch Logs: /ecs/usuarios-service, /ecs/reservas-service, /ecs/frontend-nginx, /ecs/redis-service, /ecs/rabbitmq-service"
echo ""
echo "🔍 Comandos úteis:"
echo "# Verificar status dos serviços:"
echo "aws ecs describe-services --cluster $CLUSTER_NAME --services usuarios-service reservas-service frontend-nginx redis-service rabbitmq-service --region $REGION"
echo ""
echo "# Ver logs dos serviços:"
echo "aws logs tail /ecs/usuarios-service --follow --region $REGION"
echo "aws logs tail /ecs/reservas-service --follow --region $REGION"
echo ""
echo "# Obter IPs públicos dos serviços:"
echo "aws ecs describe-tasks --cluster $CLUSTER_NAME --tasks \$(aws ecs list-tasks --cluster $CLUSTER_NAME --service-name frontend-nginx --query 'taskArns[0]' --output text --region $REGION) --query 'tasks[0].attachments[0].details[?name==\`networkInterfaceId\`].value' --output text --region $REGION"
echo ""
echo "💰 Custos estimados (Free Tier):"
echo "- ECS Fargate: 750 horas/mês grátis (5 containers x 150h = dentro do limite)"
echo "- RDS MySQL: 750 horas/mês grátis (db.t3.micro)"
echo "- ECR: 500MB grátis/mês"
echo "- CloudWatch Logs: 5GB grátis/mês"
echo ""
echo "🚀 Sistema distribuído na AWS está sendo provisionado!"
echo "⏳ Aguarde alguns minutos para todos os serviços ficarem disponíveis."