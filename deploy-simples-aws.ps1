# Deploy Simples AWS - Apenas ECS com imagens já enviadas
# Execute após ter enviado as imagens com deploy-aws.ps1

param(
    [Parameter(Mandatory=$true)]
    [string]$AwsAccountId,
    
    [Parameter(Mandatory=$true)]
    [string]$AwsRegion = "us-east-1"
)

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deploy Simples AWS - ECS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Variáveis
$ClusterName = "reservas-cluster"
$EcrRegistry = "$AwsAccountId.dkr.ecr.$AwsRegion.amazonaws.com"

Write-Host "Configuração:" -ForegroundColor Yellow
Write-Host "  AWS Account: $AwsAccountId"
Write-Host "  Região: $AwsRegion"
Write-Host "  Registry: $EcrRegistry"
Write-Host ""

# Passo 1: Verificar se as imagens existem
Write-Host "[1/4] Verificando imagens no ECR..." -ForegroundColor Yellow

$Images = @("usuarios-service", "reservas-service", "frontend-nginx")
foreach ($image in $Images) {
    try {
        $result = aws ecr describe-images --repository-name $image --image-ids imageTag=prod --region $AwsRegion 2>$null
        if ($result) {
            Write-Host "[OK] Imagem $image:prod encontrada" -ForegroundColor Green
        } else {
            Write-Host "[ERRO] Imagem $image:prod não encontrada" -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "[ERRO] Não foi possível verificar imagem $image" -ForegroundColor Red
        exit 1
    }
}

# Passo 2: Criar ECS Cluster (se não existir)
Write-Host ""
Write-Host "[2/4] Criando ECS Cluster..." -ForegroundColor Yellow

try {
    aws ecs describe-clusters --clusters $ClusterName --region $AwsRegion 2>$null | Out-Null
    Write-Host "[OK] Cluster $ClusterName já existe" -ForegroundColor Green
} catch {
    Write-Host "[INFO] Criando cluster $ClusterName..." -ForegroundColor Cyan
    aws ecs create-cluster --cluster-name $ClusterName --region $AwsRegion
    Write-Host "[OK] Cluster $ClusterName criado" -ForegroundColor Green
}

# Passo 3: Criar Task Definitions simplificadas
Write-Host ""
Write-Host "[3/4] Criando Task Definitions..." -ForegroundColor Yellow

# Task Definition para Usuários (simplificada)
$TaskDefUsuarios = @{
    family = "usuarios-task"
    networkMode = "awsvpc"
    requiresCompatibilities = @("FARGATE")
    cpu = "256"
    memory = "512"
    executionRoleArn = "arn:aws:iam::${AwsAccountId}:role/ecsTaskExecutionRole"
    containerDefinitions = @(
        @{
            name = "usuarios-container"
            image = "$EcrRegistry/usuarios-service:prod"
            portMappings = @(
                @{
                    containerPort = 3000
                    protocol = "tcp"
                }
            )
            environment = @(
                @{name = "NODE_ENV"; value = "production"},
                @{name = "NODE_PORT"; value = "3000"},
                @{name = "DB_HOST"; value = "localhost"},
                @{name = "DB_USER"; value = "root"},
                @{name = "DB_PASSWORD"; value = "password"},
                @{name = "DB_NAME"; value = "reservas_db"},
                @{name = "DB_PORT"; value = "3306"},
                @{name = "JWT_SECRET"; value = "jwt-secret-aws-producao"}
            )
            essential = $true
        }
    )
}

# Task Definition para Reservas (simplificada)
$TaskDefReservas = @"
{
    "family": "reservas-task",
    "networkMode": "bridge",
    "requiresCompatibilities": ["EC2"],
    "cpu": "256",
    "memory": "512",
    "containerDefinitions": [
        {
            "name": "reservas-container",
            "image": "$EcrRegistry/reservas-service:prod",
            "portMappings": [
                {
                    "containerPort": 3001,
                    "hostPort": 3001,
                    "protocol": "tcp"
                }
            ],
            "environment": [
                {"name": "NODE_ENV", "value": "production"},
                {"name": "NODE_PORT", "value": "3001"},
                {"name": "DB_HOST", "value": "localhost"},
                {"name": "DB_USER", "value": "root"},
                {"name": "DB_PASSWORD", "value": "password"},
                {"name": "DB_NAME", "value": "reservas_db"},
                {"name": "DB_PORT", "value": "3306"},
                {"name": "JWT_SECRET", "value": "jwt-secret-aws-producao"}
            ],
            "essential": true
        }
    ]
}
"@

# Task Definition para Frontend (simplificada)
$TaskDefFrontend = @"
{
    "family": "frontend-task",
    "networkMode": "bridge",
    "requiresCompatibilities": ["EC2"],
    "cpu": "256",
    "memory": "512",
    "containerDefinitions": [
        {
            "name": "frontend-container",
            "image": "$EcrRegistry/frontend-nginx:prod",
            "portMappings": [
                {
                    "containerPort": 80,
                    "hostPort": 80,
                    "protocol": "tcp"
                }
            ],
            "essential": true
        }
    ]
}
"@

# Salvar e registrar Task Definitions
$TaskDefUsuarios | Out-File -FilePath "usuarios-task-simple.json" -Encoding UTF8
$TaskDefReservas | Out-File -FilePath "reservas-task-simple.json" -Encoding UTF8
$TaskDefFrontend | Out-File -FilePath "frontend-task-simple.json" -Encoding UTF8

Write-Host "[INFO] Registrando task definition usuarios..." -ForegroundColor Cyan
aws ecs register-task-definition --cli-input-json file://usuarios-task-simple.json --region $AwsRegion

Write-Host "[INFO] Registrando task definition reservas..." -ForegroundColor Cyan
aws ecs register-task-definition --cli-input-json file://reservas-task-simple.json --region $AwsRegion

Write-Host "[INFO] Registrando task definition frontend..." -ForegroundColor Cyan
aws ecs register-task-definition --cli-input-json file://frontend-task-simple.json --region $AwsRegion

Write-Host "[OK] Task Definitions registradas" -ForegroundColor Green

# Passo 4: Executar Tasks
Write-Host ""
Write-Host "[4/4] Executando Tasks no ECS..." -ForegroundColor Yellow

Write-Host "[INFO] Executando task usuarios-service..." -ForegroundColor Cyan
$TaskUsuarios = aws ecs run-task --cluster $ClusterName --task-definition "usuarios-task" --count 1 --launch-type "EC2" --region $AwsRegion --query "tasks[0].taskArn" --output text

Write-Host "[INFO] Executando task reservas-service..." -ForegroundColor Cyan
$TaskReservas = aws ecs run-task --cluster $ClusterName --task-definition "reservas-task" --count 1 --launch-type "EC2" --region $AwsRegion --query "tasks[0].taskArn" --output text

Write-Host "[INFO] Executando task frontend-service..." -ForegroundColor Cyan
$TaskFrontend = aws ecs run-task --cluster $ClusterName --task-definition "frontend-task" --count 1 --launch-type "EC2" --region $AwsRegion --query "tasks[0].taskArn" --output text

# Limpeza
Remove-Item "usuarios-task-simple.json", "reservas-task-simple.json", "frontend-task-simple.json" -Force -ErrorAction SilentlyContinue

Write-Host "[OK] Tasks executadas" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Deploy Simples Concluído!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Tasks executadas:" -ForegroundColor Yellow
Write-Host "  ✅ Usuários: $TaskUsuarios"
Write-Host "  ✅ Reservas: $TaskReservas"
Write-Host "  ✅ Frontend: $TaskFrontend"
Write-Host ""
Write-Host "Para verificar status:" -ForegroundColor Cyan
Write-Host "  aws ecs describe-tasks --cluster $ClusterName --tasks $TaskUsuarios --region $AwsRegion"
Write-Host ""
Write-Host "Para ver logs:" -ForegroundColor Cyan
Write-Host "  aws ecs describe-tasks --cluster $ClusterName --tasks $TaskUsuarios --region $AwsRegion --query 'tasks[0].containers[0].reason'"
Write-Host ""
Write-Host "NOTA: Este é um deploy simples para teste." -ForegroundColor Yellow
Write-Host "Para produção completa, use o script create-aws-infrastructure.ps1" -ForegroundColor Yellow
Write-Host ""