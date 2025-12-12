# Deploy AWS Final - Usando comandos diretos
param(
    [Parameter(Mandatory=$true)]
    [string]$AwsAccountId,
    
    [Parameter(Mandatory=$true)]
    [string]$AwsRegion = "us-east-1"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deploy AWS Final" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$ClusterName = "reservas-cluster"
$EcrRegistry = "$AwsAccountId.dkr.ecr.$AwsRegion.amazonaws.com"

# Passo 1: Verificar se precisamos do ecsTaskExecutionRole
Write-Host "[1/4] Verificando ecsTaskExecutionRole..." -ForegroundColor Yellow

try {
    aws iam get-role --role-name ecsTaskExecutionRole --region $AwsRegion 2>$null | Out-Null
    Write-Host "[OK] ecsTaskExecutionRole já existe" -ForegroundColor Green
} catch {
    Write-Host "[INFO] Criando ecsTaskExecutionRole..." -ForegroundColor Cyan
    
    # Criar role
    $trustPolicy = @"
{
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
}
"@
    
    $trustPolicy | Out-File -FilePath "trust-policy.json" -Encoding UTF8
    aws iam create-role --role-name ecsTaskExecutionRole --assume-role-policy-document file://trust-policy.json --region $AwsRegion
    aws iam attach-role-policy --role-name ecsTaskExecutionRole --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy --region $AwsRegion
    Remove-Item "trust-policy.json" -Force
    
    Write-Host "[OK] ecsTaskExecutionRole criado" -ForegroundColor Green
}

# Passo 2: Registrar Task Definition usando comando direto
Write-Host ""
Write-Host "[2/4] Registrando Task Definition..." -ForegroundColor Yellow

$taskDefArn = aws ecs register-task-definition --family "usuarios-task" --network-mode "awsvpc" --requires-compatibilities "FARGATE" --cpu "256" --memory "512" --execution-role-arn "arn:aws:iam::${AwsAccountId}:role/ecsTaskExecutionRole" --container-definitions "[{`"name`":`"usuarios-container`",`"image`":`"$EcrRegistry/usuarios-service:prod`",`"portMappings`":[{`"containerPort`":3000,`"protocol`":`"tcp`"}],`"environment`":[{`"name`":`"NODE_ENV`",`"value`":`"production`"},{`"name`":`"NODE_PORT`",`"value`":`"3000`"},{`"name`":`"JWT_SECRET`",`"value`":`"jwt-secret-aws`"}],`"essential`":true,`"logConfiguration`":{`"logDriver`":`"awslogs`",`"options`":{`"awslogs-group`":`"/ecs/usuarios-service`",`"awslogs-region`":`"$AwsRegion`",`"awslogs-stream-prefix`":`"ecs`",`"awslogs-create-group`":`"true`"}}}]" --region $AwsRegion --query "taskDefinition.taskDefinitionArn" --output text

Write-Host "[OK] Task Definition registrada: $taskDefArn" -ForegroundColor Green

# Passo 3: Obter configuração de rede
Write-Host ""
Write-Host "[3/4] Configurando rede..." -ForegroundColor Yellow

$defaultVpc = aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query "Vpcs[0].VpcId" --output text --region $AwsRegion
$subnets = aws ec2 describe-subnets --filters "Name=vpc-id,Values=$defaultVpc" --query "Subnets[*].SubnetId" --output text --region $AwsRegion
$subnetArray = $subnets -split "`t"
$subnet1 = $subnetArray[0]

# Criar Security Group se não existir
try {
    $sgId = aws ec2 describe-security-groups --filters "Name=group-name,Values=ecs-fargate-sg" --query "SecurityGroups[0].GroupId" --output text --region $AwsRegion
    if ($sgId -eq "None") { throw "SG não existe" }
    Write-Host "[OK] Security Group já existe: $sgId" -ForegroundColor Green
} catch {
    Write-Host "[INFO] Criando Security Group..." -ForegroundColor Cyan
    $sgId = aws ec2 create-security-group --group-name "ecs-fargate-sg" --description "Security Group para ECS Fargate" --vpc-id $defaultVpc --query "GroupId" --output text --region $AwsRegion
    aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 3000 --cidr "0.0.0.0/0" --region $AwsRegion
    aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 80 --cidr "0.0.0.0/0" --region $AwsRegion
    Write-Host "[OK] Security Group criado: $sgId" -ForegroundColor Green
}

Write-Host "[INFO] VPC: $defaultVpc" -ForegroundColor Cyan
Write-Host "[INFO] Subnet: $subnet1" -ForegroundColor Cyan
Write-Host "[INFO] Security Group: $sgId" -ForegroundColor Cyan

# Passo 4: Executar Task
Write-Host ""
Write-Host "[4/4] Executando Task..." -ForegroundColor Yellow

$taskArn = aws ecs run-task --cluster $ClusterName --task-definition "usuarios-task" --count 1 --launch-type "FARGATE" --network-configuration "awsvpcConfiguration={subnets=[$subnet1],securityGroups=[$sgId],assignPublicIp=ENABLED}" --region $AwsRegion --query "tasks[0].taskArn" --output text

if ($taskArn -and $taskArn -ne "None") {
    Write-Host "[OK] Task executada: $taskArn" -ForegroundColor Green
    
    # Aguardar task ficar running
    Write-Host "[INFO] Aguardando task ficar ativa (pode levar 2-3 minutos)..." -ForegroundColor Cyan
    
    $maxAttempts = 12
    $attempt = 0
    do {
        Start-Sleep -Seconds 15
        $attempt++
        $taskStatus = aws ecs describe-tasks --cluster $ClusterName --tasks $taskArn --region $AwsRegion --query "tasks[0].lastStatus" --output text
        Write-Host "[INFO] Tentativa $attempt/$maxAttempts - Status: $taskStatus" -ForegroundColor Cyan
    } while ($taskStatus -ne "RUNNING" -and $attempt -lt $maxAttempts)
    
    if ($taskStatus -eq "RUNNING") {
        # Obter IP público
        $taskDetails = aws ecs describe-tasks --cluster $ClusterName --tasks $taskArn --region $AwsRegion --query "tasks[0].attachments[0].details" --output json | ConvertFrom-Json
        $networkInterface = ($taskDetails | Where-Object { $_.name -eq "networkInterfaceId" }).value
        
        if ($networkInterface) {
            $publicIp = aws ec2 describe-network-interfaces --network-interface-ids $networkInterface --query "NetworkInterfaces[0].Association.PublicIp" --output text --region $AwsRegion
            
            Write-Host ""
            Write-Host "========================================" -ForegroundColor Green
            Write-Host "  🎉 DEPLOY CONCLUÍDO COM SUCESSO!" -ForegroundColor Green
            Write-Host "========================================" -ForegroundColor Green
            Write-Host "Task ARN: $taskArn" -ForegroundColor Yellow
            Write-Host "Status: $taskStatus" -ForegroundColor Yellow
            Write-Host "IP Público: $publicIp" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "🌐 Teste sua API:" -ForegroundColor Cyan
            Write-Host "  http://${publicIp}:3000/health" -ForegroundColor White
            Write-Host "  http://${publicIp}:3000/api/usuarios" -ForegroundColor White
            Write-Host ""
            Write-Host "📋 Para verificar logs:" -ForegroundColor Cyan
            Write-Host "  aws logs tail /ecs/usuarios-service --follow --region $AwsRegion" -ForegroundColor White
            Write-Host ""
        } else {
            Write-Host "[AVISO] Task rodando mas não foi possível obter IP público" -ForegroundColor Yellow
        }
    } else {
        Write-Host "[ERRO] Task não ficou ativa. Status final: $taskStatus" -ForegroundColor Red
        Write-Host "Verifique os logs para mais detalhes:" -ForegroundColor Yellow
        Write-Host "  aws logs tail /ecs/usuarios-service --region $AwsRegion" -ForegroundColor White
    }
} else {
    Write-Host "[ERRO] Falha ao executar task" -ForegroundColor Red
}

Write-Host ""
Write-Host "Para parar a task (evitar custos):" -ForegroundColor Yellow
Write-Host "  aws ecs stop-task --cluster $ClusterName --task $taskArn --region $AwsRegion" -ForegroundColor White
Write-Host ""