# Script de Deploy AWS - Sistema de Reservas
# Execute com: .\deploy-aws.ps1

param(
    [Parameter(Mandatory=$true)]
    [string]$AwsAccountId,
    
    [Parameter(Mandatory=$true)]
    [string]$AwsRegion = "us-east-1",
    
    [Parameter(Mandatory=$false)]
    [string]$Environment = "prod"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deploy AWS - Sistema de Reservas" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Variáveis
$EcrRegistry = "$AwsAccountId.dkr.ecr.$AwsRegion.amazonaws.com"
$Services = @("usuarios-service", "reservas-service", "frontend-nginx")

# Função para verificar se AWS CLI está instalado
function Test-AwsCli {
    try {
        aws --version | Out-Null
        Write-Host "[OK] AWS CLI encontrado" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "[ERRO] AWS CLI não encontrado. Instale em: https://aws.amazon.com/cli/" -ForegroundColor Red
        return $false
    }
}

# Função para verificar se Docker está rodando
function Test-Docker {
    try {
        docker ps | Out-Null
        Write-Host "[OK] Docker está rodando" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "[ERRO] Docker não está rodando. Inicie o Docker Desktop." -ForegroundColor Red
        return $false
    }
}

# Verificações iniciais
Write-Host "Verificando pré-requisitos..." -ForegroundColor Yellow
if (-not (Test-AwsCli)) { exit 1 }
if (-not (Test-Docker)) { exit 1 }

Write-Host ""
Write-Host "Configuração:" -ForegroundColor Yellow
Write-Host "  AWS Account ID: $AwsAccountId"
Write-Host "  AWS Region: $AwsRegion"
Write-Host "  Environment: $Environment"
Write-Host ""

# Passo 1: Login no ECR
Write-Host "[1/6] Fazendo login no ECR..." -ForegroundColor Yellow
try {
    aws ecr get-login-password --region $AwsRegion | docker login --username AWS --password-stdin $EcrRegistry
    Write-Host "[OK] Login no ECR realizado com sucesso" -ForegroundColor Green
} catch {
    Write-Host "[ERRO] Falha no login do ECR: $_" -ForegroundColor Red
    exit 1
}

# Passo 2: Criar repositórios ECR (se não existirem)
Write-Host ""
Write-Host "[2/6] Criando repositórios ECR..." -ForegroundColor Yellow
foreach ($service in $Services) {
    try {
        aws ecr describe-repositories --repository-names $service --region $AwsRegion 2>$null | Out-Null
        Write-Host "[OK] Repositório $service já existe" -ForegroundColor Green
    } catch {
        Write-Host "[INFO] Criando repositório $service..." -ForegroundColor Cyan
        aws ecr create-repository --repository-name $service --region $AwsRegion | Out-Null
        Write-Host "[OK] Repositório $service criado" -ForegroundColor Green
    }
}

# Passo 3: Build das imagens
Write-Host ""
Write-Host "[3/6] Fazendo build das imagens Docker..." -ForegroundColor Yellow

# Build Serviço de Usuários
Write-Host "[INFO] Building usuarios-service..." -ForegroundColor Cyan
Set-Location backend/servico-usuarios
docker build -t usuarios-service:latest .
docker tag usuarios-service:latest "$EcrRegistry/usuarios-service:latest"
docker tag usuarios-service:latest "$EcrRegistry/usuarios-service:$Environment"
Set-Location ../..
Write-Host "[OK] usuarios-service build concluído" -ForegroundColor Green

# Build Serviço de Reservas
Write-Host "[INFO] Building reservas-service..." -ForegroundColor Cyan
Set-Location backend/servico-reservas
docker build -t reservas-service:latest .
docker tag reservas-service:latest "$EcrRegistry/reservas-service:latest"
docker tag reservas-service:latest "$EcrRegistry/reservas-service:$Environment"
Set-Location ../..
Write-Host "[OK] reservas-service build concluído" -ForegroundColor Green

# Build Frontend
Write-Host "[INFO] Building frontend-nginx..." -ForegroundColor Cyan
Set-Location frontend
docker build -t frontend-nginx:latest .
docker tag frontend-nginx:latest "$EcrRegistry/frontend-nginx:latest"
docker tag frontend-nginx:latest "$EcrRegistry/frontend-nginx:$Environment"
Set-Location ..
Write-Host "[OK] frontend-nginx build concluído" -ForegroundColor Green

# Passo 4: Push das imagens
Write-Host ""
Write-Host "[4/6] Fazendo push das imagens para ECR..." -ForegroundColor Yellow

Write-Host "[INFO] Pushing usuarios-service..." -ForegroundColor Cyan
docker push "$EcrRegistry/usuarios-service:latest"
docker push "$EcrRegistry/usuarios-service:$Environment"
Write-Host "[OK] usuarios-service enviado" -ForegroundColor Green

Write-Host "[INFO] Pushing reservas-service..." -ForegroundColor Cyan
docker push "$EcrRegistry/reservas-service:latest"
docker push "$EcrRegistry/reservas-service:$Environment"
Write-Host "[OK] reservas-service enviado" -ForegroundColor Green

Write-Host "[INFO] Pushing frontend-nginx..." -ForegroundColor Cyan
docker push "$EcrRegistry/frontend-nginx:latest"
docker push "$EcrRegistry/frontend-nginx:$Environment"
Write-Host "[OK] frontend-nginx enviado" -ForegroundColor Green

# Passo 5: Atualizar ECS Services (se existirem)
Write-Host ""
Write-Host "[5/6] Atualizando ECS Services..." -ForegroundColor Yellow

$ClusterName = "reservas-cluster"

try {
    # Verifica se o cluster existe
    aws ecs describe-clusters --clusters $ClusterName --region $AwsRegion | Out-Null
    
    # Atualiza serviço de usuários
    Write-Host "[INFO] Atualizando usuarios-service..." -ForegroundColor Cyan
    aws ecs update-service --cluster $ClusterName --service usuarios-service --force-new-deployment --region $AwsRegion | Out-Null
    Write-Host "[OK] usuarios-service atualizado" -ForegroundColor Green
    
    # Atualiza serviço de reservas
    Write-Host "[INFO] Atualizando reservas-service..." -ForegroundColor Cyan
    aws ecs update-service --cluster $ClusterName --service reservas-service --force-new-deployment --region $AwsRegion | Out-Null
    Write-Host "[OK] reservas-service atualizado" -ForegroundColor Green
    
} catch {
    Write-Host "[AVISO] Cluster ECS não encontrado. Pule este passo se for o primeiro deploy." -ForegroundColor Yellow
    Write-Host "[INFO] Siga o guia AWS_SETUP.md para criar a infraestrutura ECS." -ForegroundColor Cyan
}

# Passo 6: Resumo
Write-Host ""
Write-Host "[6/6] Deploy concluído!" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Resumo do Deploy" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Imagens enviadas para:" -ForegroundColor Yellow
Write-Host "  - $EcrRegistry/usuarios-service:$Environment"
Write-Host "  - $EcrRegistry/reservas-service:$Environment"
Write-Host "  - $EcrRegistry/frontend-nginx:$Environment"
Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Yellow
Write-Host "  1. Se for o primeiro deploy, siga o guia AWS_SETUP.md"
Write-Host "  2. Configure as variáveis de ambiente no ECS Task Definition"
Write-Host "  3. Verifique os logs: aws logs tail /ecs/usuarios-service --follow"
Write-Host "  4. Teste os endpoints do ALB"
Write-Host ""
Write-Host "Documentação completa: AWS_SETUP.md" -ForegroundColor Cyan
Write-Host ""
