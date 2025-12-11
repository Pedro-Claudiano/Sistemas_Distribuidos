#!/bin/bash

# Script para verificar status do deploy AWS
# Execute: chmod +x check-aws-status.sh && ./check-aws-status.sh

REGION="us-east-1"
CLUSTER_NAME="sistema-reservas-cluster"

echo "🔍 Verificando status do deploy AWS..."
echo ""

# 1. Status do Cluster ECS
echo "📊 Status do ECS Cluster:"
aws ecs describe-clusters --clusters $CLUSTER_NAME --region $REGION --query 'clusters[0].{Name:clusterName,Status:status,ActiveServices:activeServicesCount,RunningTasks:runningTasksCount}' --output table

echo ""

# 2. Status dos Services
echo "🚀 Status dos ECS Services:"
aws ecs describe-services --cluster $CLUSTER_NAME --services redis-service rabbitmq-service usuarios-service reservas-service frontend-nginx --region $REGION --query 'services[*].{Name:serviceName,Status:status,Running:runningCount,Desired:desiredCount,Pending:pendingCount}' --output table

echo ""

# 3. Status das Tasks
echo "📋 Tasks em execução:"
aws ecs list-tasks --cluster $CLUSTER_NAME --region $REGION --query 'taskArns' --output table

echo ""

# 4. Status do RDS
echo "🗄️ Status do RDS:"
aws rds describe-db-instances --db-instance-identifier sistema-reservas-db --region $REGION --query 'DBInstances[0].{Status:DBInstanceStatus,Endpoint:Endpoint.Address,Engine:Engine,Class:DBInstanceClass}' --output table

echo ""

# 5. Obter IPs públicos dos serviços
echo "🌐 IPs públicos dos serviços:"

for service in redis-service rabbitmq-service usuarios-service reservas-service frontend-nginx; do
    echo "Obtendo IP do $service..."
    
    # Obter ARN da task
    TASK_ARN=$(aws ecs list-tasks --cluster $CLUSTER_NAME --service-name $service --region $REGION --query 'taskArns[0]' --output text)
    
    if [ "$TASK_ARN" != "None" ] && [ "$TASK_ARN" != "" ]; then
        # Obter Network Interface ID
        ENI_ID=$(aws ecs describe-tasks --cluster $CLUSTER_NAME --tasks $TASK_ARN --region $REGION --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' --output text)
        
        if [ "$ENI_ID" != "None" ] && [ "$ENI_ID" != "" ]; then
            # Obter IP público
            PUBLIC_IP=$(aws ec2 describe-network-interfaces --network-interface-ids $ENI_ID --region $REGION --query 'NetworkInterfaces[0].Association.PublicIp' --output text)
            echo "  $service: $PUBLIC_IP"
        else
            echo "  $service: ENI não encontrado"
        fi
    else
        echo "  $service: Task não encontrada"
    fi
done

echo ""

# 6. URLs de acesso
echo "🔗 URLs de acesso (quando disponíveis):"
echo "  Frontend: https://[IP_DO_FRONTEND]"
echo "  API Usuários: http://[IP_DO_USUARIOS]:3000"
echo "  API Reservas: http://[IP_DO_RESERVAS]:3001"
echo "  RabbitMQ Management: http://[IP_DO_RABBITMQ]:15672 (admin/rabbitmq2024)"
echo ""

# 7. Comandos úteis
echo "💡 Comandos úteis:"
echo "# Ver logs em tempo real:"
echo "aws logs tail /ecs/usuarios-service --follow --region $REGION"
echo "aws logs tail /ecs/reservas-service --follow --region $REGION"
echo ""
echo "# Reiniciar um serviço:"
echo "aws ecs update-service --cluster $CLUSTER_NAME --service usuarios-service --force-new-deployment --region $REGION"
echo ""
echo "# Escalar um serviço:"
echo "aws ecs update-service --cluster $CLUSTER_NAME --service usuarios-service --desired-count 2 --region $REGION"