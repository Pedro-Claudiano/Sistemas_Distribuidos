#!/bin/bash

# Script para limpar recursos AWS
# Execute: chmod +x cleanup-aws.sh && ./cleanup-aws.sh

REGION="us-east-1"
CLUSTER_NAME="sistema-reservas-cluster"

echo "🧹 Iniciando limpeza dos recursos AWS..."
echo "⚠️  ATENÇÃO: Este script irá deletar TODOS os recursos criados!"
echo ""

read -p "Tem certeza que deseja continuar? (digite 'SIM' para confirmar): " confirm

if [ "$confirm" != "SIM" ]; then
    echo "❌ Operação cancelada."
    exit 0
fi

echo ""
echo "🗑️ Iniciando limpeza..."

# 1. Parar e deletar ECS Services
echo "🚀 Deletando ECS Services..."
for service in redis-service rabbitmq-service usuarios-service reservas-service frontend-nginx; do
    echo "Parando $service..."
    aws ecs update-service --cluster $CLUSTER_NAME --service $service --desired-count 0 --region $REGION 2>/dev/null || true
    
    echo "Aguardando $service parar..."
    aws ecs wait services-stable --cluster $CLUSTER_NAME --services $service --region $REGION 2>/dev/null || true
    
    echo "Deletando $service..."
    aws ecs delete-service --cluster $CLUSTER_NAME --service $service --region $REGION 2>/dev/null || true
done

# 2. Deletar Task Definitions (desregistrar)
echo "📋 Desregistrando Task Definitions..."
for family in redis-service rabbitmq-service usuarios-service reservas-service frontend-nginx; do
    echo "Desregistrando $family..."
    
    # Listar todas as revisões da task definition
    REVISIONS=$(aws ecs list-task-definitions --family-prefix $family --region $REGION --query 'taskDefinitionArns' --output text)
    
    for revision in $REVISIONS; do
        aws ecs deregister-task-definition --task-definition $revision --region $REGION 2>/dev/null || true
    done
done

# 3. Deletar ECS Cluster
echo "🐳 Deletando ECS Cluster..."
aws ecs delete-cluster --cluster $CLUSTER_NAME --region $REGION 2>/dev/null || true

# 4. Deletar RDS Instance
echo "🗄️ Deletando RDS Instance..."
aws rds delete-db-instance \
    --db-instance-identifier sistema-reservas-db \
    --skip-final-snapshot \
    --delete-automated-backups \
    --region $REGION 2>/dev/null || true

# 5. Deletar ECR Repositories
echo "📦 Deletando ECR Repositories..."
for repo in usuarios-service reservas-service frontend-nginx redis-service rabbitmq-service; do
    echo "Deletando repositório $repo..."
    aws ecr delete-repository --repository-name $repo --force --region $REGION 2>/dev/null || true
done

# 6. Deletar CloudWatch Log Groups
echo "📊 Deletando CloudWatch Log Groups..."
for log_group in /ecs/usuarios-service /ecs/reservas-service /ecs/frontend-nginx /ecs/redis-service /ecs/rabbitmq-service; do
    echo "Deletando log group $log_group..."
    aws logs delete-log-group --log-group-name $log_group --region $REGION 2>/dev/null || true
done

# 7. Deletar IAM Role (opcional - pode ser usado por outros projetos)
echo "🔐 Deletando IAM Role..."
read -p "Deseja deletar a IAM Role ecsTaskExecutionRole? Ela pode ser usada por outros projetos ECS (s/N): " delete_role

if [ "$delete_role" = "s" ] || [ "$delete_role" = "S" ]; then
    echo "Removendo policy da role..."
    aws iam detach-role-policy --role-name ecsTaskExecutionRole --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy --region $REGION 2>/dev/null || true
    
    echo "Deletando role..."
    aws iam delete-role --role-name ecsTaskExecutionRole --region $REGION 2>/dev/null || true
else
    echo "IAM Role mantida."
fi

echo ""
echo "✅ Limpeza concluída!"
echo ""
echo "📋 Recursos removidos:"
echo "  ✓ ECS Services (5)"
echo "  ✓ ECS Task Definitions (5 famílias)"
echo "  ✓ ECS Cluster"
echo "  ✓ RDS MySQL Instance"
echo "  ✓ ECR Repositories (5)"
echo "  ✓ CloudWatch Log Groups (5)"
echo ""
echo "💰 Custos AWS foram interrompidos."
echo "⏳ Alguns recursos podem levar alguns minutos para serem completamente removidos."
echo ""
echo "🔍 Para verificar se tudo foi removido:"
echo "aws ecs describe-clusters --clusters $CLUSTER_NAME --region $REGION"
echo "aws rds describe-db-instances --db-instance-identifier sistema-reservas-db --region $REGION"