#!/bin/bash

# Script para atualizar IPs dos serviços após deploy
# Execute após o deploy inicial: ./update-service-ips.sh

REGION="us-east-1"
CLUSTER_NAME="sistema-reservas-cluster"

echo "🔄 Atualizando IPs dos serviços..."

# Função para obter IP de um serviço
get_service_ip() {
    local service_name=$1
    local task_arn=$(aws ecs list-tasks --cluster $CLUSTER_NAME --service-name $service_name --region $REGION --query 'taskArns[0]' --output text)
    
    if [ "$task_arn" != "None" ] && [ "$task_arn" != "" ]; then
        local eni_id=$(aws ecs describe-tasks --cluster $CLUSTER_NAME --tasks $task_arn --region $REGION --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' --output text)
        
        if [ "$eni_id" != "None" ] && [ "$eni_id" != "" ]; then
            local public_ip=$(aws ec2 describe-network-interfaces --network-interface-ids $eni_id --region $REGION --query 'NetworkInterfaces[0].Association.PublicIp' --output text)
            echo $public_ip
        fi
    fi
}

# Aguardar todos os serviços ficarem estáveis
echo "⏳ Aguardando serviços ficarem estáveis..."
aws ecs wait services-stable --cluster $CLUSTER_NAME --services redis-service rabbitmq-service --region $REGION

# Obter IPs
echo "📍 Obtendo IPs dos serviços..."
REDIS_IP=$(get_service_ip "redis-service")
RABBITMQ_IP=$(get_service_ip "rabbitmq-service")

echo "Redis IP: $REDIS_IP"
echo "RabbitMQ IP: $RABBITMQ_IP"

if [ -z "$REDIS_IP" ] || [ -z "$RABBITMQ_IP" ]; then
    echo "❌ Não foi possível obter IPs. Aguarde mais alguns minutos e tente novamente."
    exit 1
fi

# Obter endpoint do RDS
DB_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier sistema-reservas-db --query 'DBInstances[0].Endpoint.Address' --output text --region $REGION)

# Criar nova task definition para reservas-service com IPs corretos
cat > reservas-service-updated-task.json << EOF
{
  "family": "reservas-service",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "reservas-service",
      "image": "$(aws sts get-caller-identity --query Account --output text).dkr.ecr.$REGION.amazonaws.com/reservas-service:latest",
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
        {"name": "DB_PASSWORD", "value": "SistemaReservas2024!"},
        {"name": "DB_NAME", "value": "sistema_reservas"},
        {"name": "DB_PORT", "value": "3306"},
        {"name": "JWT_SECRET", "value": "jwt-secret-super-seguro-2024"},
        {"name": "REDIS_HOST", "value": "$REDIS_IP"},
        {"name": "RABBITMQ_HOST", "value": "$RABBITMQ_IP"},
        {"name": "RABBITMQ_USER", "value": "admin"},
        {"name": "RABBITMQ_PASS", "value": "rabbitmq2024"}
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

# Registrar nova task definition
echo "📋 Atualizando task definition do reservas-service..."
aws ecs register-task-definition --cli-input-json file://reservas-service-updated-task.json --region $REGION

# Atualizar serviço
echo "🔄 Atualizando serviço reservas-service..."
aws ecs update-service --cluster $CLUSTER_NAME --service reservas-service --force-new-deployment --region $REGION

# Limpar arquivo temporário
rm -f reservas-service-updated-task.json

echo "✅ IPs atualizados com sucesso!"
echo ""
echo "📋 Configuração final:"
echo "  Redis: $REDIS_IP:6379"
echo "  RabbitMQ: $RABBITMQ_IP:5672"
echo "  Database: $DB_ENDPOINT:3306"
echo ""
echo "⏳ Aguarde alguns minutos para o serviço de reservas reiniciar com os novos IPs."