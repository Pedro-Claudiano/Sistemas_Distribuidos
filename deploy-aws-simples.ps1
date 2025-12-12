# Deploy AWS Simples - Sem erros de sintaxe
param(
    [Parameter(Mandatory=$true)]
    [string]$AwsAccountId,
    
    [Parameter(Mandatory=$true)]
    [string]$AwsRegion = "us-east-1"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deploy AWS Simples" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$ClusterName = "reservas-cluster"
$EcrRegistry = "$AwsAccountId.dkr.ecr.$AwsRegion.amazonaws.com"

# Passo 1: Verificar ecsTaskExecutionRole
Write-Host "[1/3] Verificando ecsTaskExecutionRole..." -ForegroundColor Yellow

try {
    aws iam get-role --role-name ecsTaskExecutionRole 2>$null | Out-Null
    Write-Host "[OK] ecsTaskExecutionRole existe" -ForegroundColor Green
} catch {
    Write-Host "[INFO] Criando ecsTaskExecutionRole..." -ForegroundColor Cyan
    
    $trustPolicy = '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ecs-tasks.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
    $trustPolicy | Out-File -FilePath "trust.json" -Encoding UTF8
    
    aws iam create-role --role-name ecsTaskExecutionRole --assume-role-policy-document file://trust.json
    aws iam attach-role-policy --role-name ecsTaskExecutionRole --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
    
    Remove-Item "trust.json" -Force
    Write-Host "[OK] ecsTaskExecutionRole criado" -ForegroundColor Green
}

# Passo 2: Criar Task Definition simples
Write-Host ""
Write-Host "[2/3] Criando Task Definition..." -ForegroundColor Yellow

$taskDef = @"
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
                {"name": "JWT_SECRET", "value": "jwt-secret-aws"}
            ],
            "essential": true
        }
    ]
}
"@

$taskDef | Out-File -FilePath "task.json" -Encoding UTF8
aws ecs register-task-definition --cli-input-json file://task.json --region $AwsRegion
Remove-Item "task.json" -Force

Write-Host "[OK] Task Definition criada" -ForegroundColor Green

# Passo 3: Executar Task
Write-Host ""
Write-Host "[3/3] Executando Task..." -ForegroundColor Yellow

# Obter VPC e subnet padrão
$vpc = aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query "Vpcs[0].VpcId" --output text --region $AwsRegion
$subnet = aws ec2 describe-subnets --filters "Name=vpc-id,Values=$vpc" --query "Subnets[0].SubnetId" --output text --region $AwsRegion

Write-Host "[INFO] VPC: $vpc" -ForegroundColor Cyan
Write-Host "[INFO] Subnet: $subnet" -ForegroundColor Cyan

# Executar task
$taskArn = aws ecs run-task --cluster $ClusterName --task-definition "usuarios-task" --count 1 --launch-type "FARGATE" --network-configuration "awsvpcConfiguration={subnets=[$subnet],assignPublicIp=ENABLED}" --region $AwsRegion --query "tasks[0].taskArn" --output text

if ($taskArn -and $taskArn -ne "None") {
    Write-Host "[OK] Task executada: $taskArn" -ForegroundColor Green
    
    Write-Host "[INFO] Aguardando task ficar ativa..." -ForegroundColor Cyan
    Start-Sleep -Seconds 60
    
    $status = aws ecs describe-tasks --cluster $ClusterName --tasks $taskArn --region $AwsRegion --query "tasks[0].lastStatus" --output text
    Write-Host "[INFO] Status: $status" -ForegroundColor Cyan
    
    if ($status -eq "RUNNING") {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  SUCESSO! Task rodando na AWS" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "Task ARN: $taskArn" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Para verificar logs:" -ForegroundColor Cyan
        Write-Host "aws logs tail /ecs/usuarios-service --region $AwsRegion" -ForegroundColor White
        Write-Host ""
        Write-Host "Para parar (evitar custos):" -ForegroundColor Yellow
        Write-Host "aws ecs stop-task --cluster $ClusterName --task $taskArn --region $AwsRegion" -ForegroundColor White
    } else {
        Write-Host "[AVISO] Task status: $status" -ForegroundColor Yellow
    }
} else {
    Write-Host "[ERRO] Falha ao executar task" -ForegroundColor Red
}

Write-Host ""