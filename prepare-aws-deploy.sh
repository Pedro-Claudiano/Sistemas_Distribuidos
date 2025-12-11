#!/bin/bash

# Script de preparação para deploy AWS
# Execute: chmod +x prepare-aws-deploy.sh && ./prepare-aws-deploy.sh

echo "🔧 Preparando ambiente para deploy AWS..."

# 1. Verificar pré-requisitos
echo "✅ Verificando pré-requisitos..."

# Verificar AWS CLI
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI não encontrado. Instale: https://aws.amazon.com/cli/"
    exit 1
fi

# Verificar Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não encontrado. Instale: https://docker.com/"
    exit 1
fi

# Verificar se Docker está rodando
if ! docker ps &> /dev/null; then
    echo "❌ Docker não está rodando. Inicie o Docker."
    exit 1
fi

# Verificar credenciais AWS
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ Credenciais AWS não configuradas. Execute: aws configure"
    exit 1
fi

echo "✅ Todos os pré-requisitos atendidos!"

# 2. Verificar estrutura do projeto
echo "📁 Verificando estrutura do projeto..."

required_dirs=(
    "backend/servico-usuarios"
    "backend/servico-reservas" 
    "frontend"
)

for dir in "${required_dirs[@]}"; do
    if [ ! -d "$dir" ]; then
        echo "❌ Diretório $dir não encontrado!"
        exit 1
    fi
done

required_files=(
    "backend/servico-usuarios/Dockerfile"
    "backend/servico-reservas/Dockerfile"
    "frontend/Dockerfile"
)

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Arquivo $file não encontrado!"
        exit 1
    fi
done

echo "✅ Estrutura do projeto OK!"

# 3. Testar builds locais
echo "🏗️ Testando builds locais..."

echo "Testando build usuarios-service..."
if ! docker build -t test-usuarios ./backend/servico-usuarios > /dev/null 2>&1; then
    echo "❌ Falha no build do usuarios-service"
    exit 1
fi

echo "Testando build reservas-service..."
if ! docker build -t test-reservas ./backend/servico-reservas > /dev/null 2>&1; then
    echo "❌ Falha no build do reservas-service"
    exit 1
fi

echo "Testando build frontend..."
if ! docker build -t test-frontend ./frontend > /dev/null 2>&1; then
    echo "❌ Falha no build do frontend"
    exit 1
fi

# Limpar imagens de teste
docker rmi test-usuarios test-reservas test-frontend > /dev/null 2>&1

echo "✅ Todos os builds funcionando!"

# 4. Verificar região AWS
REGION=$(aws configure get region)
if [ -z "$REGION" ]; then
    REGION="us-east-1"
    echo "⚠️ Região não configurada, usando us-east-1"
else
    echo "🌍 Região AWS: $REGION"
fi

# 5. Verificar Account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "📋 AWS Account ID: $ACCOUNT_ID"

# 6. Estimar custos
echo ""
echo "💰 Estimativa de custos AWS Free Tier:"
echo "  ✅ ECS Fargate: 750 horas/mês grátis (5 containers)"
echo "  ✅ RDS MySQL: 750 horas/mês grátis (db.t3.micro)"
echo "  ✅ ECR: 500MB grátis/mês"
echo "  ✅ CloudWatch: 5GB logs grátis/mês"
echo "  ⚠️ Data Transfer: 1GB grátis/mês"
echo ""
echo "📊 Uso estimado:"
echo "  - ECS: ~150 horas/mês por container (5 containers = 750h total)"
echo "  - RDS: ~720 horas/mês (dentro do limite)"
echo "  - ECR: ~200MB (imagens Docker)"
echo "  - Logs: ~1GB/mês"
echo ""

# 7. Próximos passos
echo "🚀 Ambiente preparado com sucesso!"
echo ""
echo "📋 Próximos passos:"
echo "1. Execute o deploy: ./deploy-aws.sh"
echo "2. Monitore o progresso: ./check-aws-status.sh"
echo "3. Para limpar recursos: ./cleanup-aws.sh"
echo ""
echo "⏱️ Tempo estimado de deploy: 10-15 minutos"
echo "💡 O deploy criará todos os recursos automaticamente"