# Deploy ECS Direto - Sem Task Definitions complexas
param(
    [Parameter(Mandatory=$true)]
    [string]$AwsAccountId,
    
    [Parameter(Mandatory=$true)]
    [string]$AwsRegion = "us-east-1"
)

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deploy ECS Direto" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$ClusterName = "reservas-cluster"
$EcrRegistry = "$AwsAccountId.dkr.ecr.$AwsRegion.amazonaws.com"

# Passo 1: Verificar cluster
Write-Host "[1/3] Verificando cluster ECS..." -ForegroundColor Yellow
try {
    $clusterInfo = aws ecs describe-clusters --clusters $ClusterName --region $AwsRegion --query "clusters[0].status" --output text
    if ($clusterInfo -eq "ACTIVE") {
        Write-Host "[OK] Cluster $ClusterName está ativo" -ForegroundColor Green
    } else {
        Write-Host "[INFO] Criando cluster..." -ForegroundColor Cyan
        aws ecs create-cluster --cluster-name $ClusterName --region $AwsRegion
        Write-Host "[OK] Cluster criado" -ForegroundColor Green
    }
} catch {
    Write-Host "[INFO] Criando cluster..." -ForegroundColor Cyan
    aws ecs create-cluster --cluster-name $ClusterName --region $AwsRegion
    Write-Host "[OK] Cluster criado" -ForegroundColor Green
}

# Passo 2: Criar Task Definitions usando arquivos JSON
Write-Host ""
Write-Host "[2/3] Criando Task Definitions..." -ForegroundColor Yellow

# Criar arquivo JSON para usuarios
@"
{
    "family": "usuarios-task",
    "networkMode": "awsvpc",
    "requiresCompatibilities": ["FARGATE"],
    "cpu": "256",
    "memory": "512",
    "executionRoleArn": "arn:aws:iam::$AwsAccountId:role/ecsTaskExecutionRole",
    "containerDefinitions": [
        {
            "name": "usuarios-container",
            "image": "$EcrRegistry/usuarios-service:prod",
            "portMappings": [
                {
                    "containerPort": 3000,
                    "protocol": "tcp"
                }
            ],
            "environment": [
                {"name": "NODE_ENV", "value": "production"},
                {"name": "NODE_PORT", "value": "3000"},
                {"name": "JWT_SECRET", "value": "jwt-secret-aws-producao"}
            ],
            "essential": true,
            "logConfiguration": {
                "logDriver": "awslogs",
                "options": {
                    "awslogs-group": "/ecs/usuarios-service",
                    "awslogs-region": "$AwsRegion",
                    "awslogs-stream-prefix": "ecs",
                    "awslogs-create-group": "true"
                }
            }
        }
    ]
}
"@ | Out-File -FilePath "usuarios-task.json" -Encoding UTF8

# Registrar task definition
Write-Host "[INFO] Registrando usuarios-task..." -ForegroundColor Cyan
aws ecs register-task-definition --cli-input-json file://usuarios-task.json --region $AwsRegion

# Passo 3: Executar task
Write-Host ""
Write-Host "[3/3] Executando task..." -ForegroundColor Yellow

# Obter VPC padrão
$defaultVpc = aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query "Vpcs[0].VpcId" --output text --region $AwsRegion
$defaultSubnets = aws ec2 describe-subnets --filters "Name=vpc-id,Values=$defaultVpc" --query "Subnets[0:2].SubnetId" --output text --region $AwsRegion
$subnetList = $defaultSubnets -split "`t"
$subnet1 = $subnetList[0]

Write-Host "[INFO] Usando VPC: $defaultVpc" -ForegroundColor Cyan
Write-Host "[INFO] Usando Subnet: $subnet1" -ForegroundColor Cyan

# Executar task
Write-Host "[INFO] Executando usuarios-service..." -ForegroundColor Cyan
$taskArn = aws ecs run-task --cluster $ClusterName --task-definition "usuarios-task" --count 1 --launch-type "FARGATE" --network-configuration "awsvpcConfiguration={subnets=[$subnet1],assignPublicIp=ENABLED}" --region $AwsRegion --query "tasks[0].taskArn" --output text

Write-Host "[OK] Task executada: $taskArn" -ForegroundColor Green

# Aguardar task ficar running
Write-Host "[INFO] Aguardando task ficar ativa..." -ForegroundColor Cyan
Start-Sleep -Seconds 30

# Verificar status
$taskStatus = aws ecs describe-tasks --cluster $ClusterName --tasks $taskArn --region $AwsRegion --query "tasks[0].lastStatus" --output text
Write-Host "[INFO] Status da task: $taskStatus" -ForegroundColor Cyan

# Obter IP público
$taskDetails = aws ecs describe-tasks --cluster $ClusterName --tasks $taskArn --region $AwsRegion --query "tasks[0].attachments[0].details" --output json | ConvertFrom-Json
$networkInterface = ($taskDetails | Where-Object { $_.name -eq "networkInterfaceId" }).value

if ($networkInterface) {
    $publicIp = aws ec2 describe-network-interfaces --network-interface-ids $networkInterface --query "NetworkInterfaces[0].Association.PublicIp" --output text --region $AwsRegion
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  Deploy Concluído!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Task ARN: $taskArn" -ForegroundColor Yellow
    Write-Host "Status: $taskStatus" -ForegroundColor Yellow
    Write-Host "IP Público: $publicIp" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Teste a API:" -ForegroundColor Cyan
    Write-Host "  curl http://${publicIp}:3000/health" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "[AVISO] Não foi possível obter IP público" -ForegroundColor Yellow
}

# Limpeza
Remove-Item "usuarios-task.json" -Force -ErrorAction SilentlyContinue

Write-Host "Para verificar logs:" -ForegroundColor Cyan
Write-Host "  aws logs tail /ecs/usuarios-service --follow --region $AwsRegion" -ForegroundColor White
Write-Host ""