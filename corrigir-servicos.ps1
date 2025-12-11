# Script para corrigir problemas nos serviços AWS
# Execute: .\corrigir-servicos.ps1

param(
    [string]$AwsRegion = "us-east-1",
    [string]$ClusterName = "sistema-reservas-cluster"
)

Write-Host "🔧 CORRIGINDO PROBLEMAS DOS SERVIÇOS" -ForegroundColor Yellow
Write-Host "====================================" -ForegroundColor Yellow
Write-Host ""

$AccountId = aws sts get-caller-identity --query Account --output text

# 1. Verificar e recriar repositórios ECR se necessário
Write-Host "📦 1. Verificando/Criando repositórios ECR..." -ForegroundColor Cyan
$repos = @("usuarios-service", "reservas-service", "frontend-nginx", "redis-service", "rabbitmq-service")

foreach ($repo in $repos) {
    try {
        aws ecr describe-repositories --repository-names $repo --region $AwsRegion | Out-Null
        Write-Host "  ✅ $repo já existe" -ForegroundColor Green
    } catch {
        Write-Host "  🔄 Criando $repo..." -ForegroundColor Yellow
        aws ecr create-repository --repository-name $repo --region $AwsRegion | Out-Null
        Write-Host "  ✅ $repo criado" -ForegroundColor Green
    }
}

# 2. Login no ECR
Write-Host ""
Write-Host "🔐 2. Fazendo login no ECR..." -ForegroundColor Cyan
aws ecr get-login-password --region $AwsRegion | docker login --username AWS --password-stdin "$AccountId.dkr.ecr.$AwsRegion.amazonaws.com"

# 3. Build e push das imagens que faltam
Write-Host ""
Write-Host "🏗️ 3. Verificando e fazendo build das imagens..." -ForegroundColor Cyan

# Verificar se as imagens existem nos repositórios
$imagesToBuild = @()

foreach ($repo in $repos) {
    try {
        $images = aws ecr list-images --repository-name $repo --region $AwsRegion --query 'imageIds' --output json | ConvertFrom-Json
        if ($images.Count -eq 0) {
            $imagesToBuild += $repo
            Write-Host "  ⚠️ $repo sem imagens - precisa build" -ForegroundColor Yellow
        } else {
            Write-Host "  ✅ $repo tem imagens" -ForegroundColor Green
        }
    } catch {
        $imagesToBuild += $repo
        Write-Host "  ❌ Erro ao verificar $repo" -ForegroundColor Red
    }
}

# Build das imagens que faltam
if ($imagesToBuild.Count -gt 0) {
    Write-Host ""
    Write-Host "🔨 Fazendo build das imagens necessárias..." -ForegroundColor Yellow
    
    foreach ($repo in $imagesToBuild) {
        Write-Host "Building $repo..." -ForegroundColor Cyan
        
        switch ($repo) {
            "usuarios-service" {
                if (Test-Path "backend/servico-usuarios/Dockerfile") {
                    docker build -t $repo ./backend/servico-usuarios
                    docker tag "$repo`:latest" "$AccountId.dkr.ecr.$AwsRegion.amazonaws.com/$repo`:latest"
                    docker push "$AccountId.dkr.ecr.$AwsRegion.amazonaws.com/$repo`:latest"
                    Write-Host "  ✅ $repo build concluído" -ForegroundColor Green
                } else {
                    Write-Host "  ❌ Dockerfile não encontrado para $repo" -ForegroundColor Red
                }
            }
            "reservas-service" {
                if (Test-Path "backend/servico-reservas/Dockerfile") {
                    docker build -t $repo ./backend/servico-reservas
                    docker tag "$repo`:latest" "$AccountId.dkr.ecr.$AwsRegion.amazonaws.com/$repo`:latest"
                    docker push "$AccountId.dkr.ecr.$AwsRegion.amazonaws.com/$repo`:latest"
                    Write-Host "  ✅ $repo build concluído" -ForegroundColor Green
                } else {
                    Write-Host "  ❌ Dockerfile não encontrado para $repo" -ForegroundColor Red
                }
            }
            "frontend-nginx" {
                if (Test-Path "frontend/Dockerfile") {
                    docker build -t $repo ./frontend
                    docker tag "$repo`:latest" "$AccountId.dkr.ecr.$AwsRegion.amazonaws.com/$repo`:latest"
                    docker push "$AccountId.dkr.ecr.$AwsRegion.amazonaws.com/$repo`:latest"
                    Write-Host "  ✅ $repo build concluído" -ForegroundColor Green
                } else {
                    Write-Host "  ❌ Dockerfile não encontrado para $repo" -ForegroundColor Red
                }
            }
            "redis-service" {
                docker pull redis:7-alpine
                docker tag redis:7-alpine "$AccountId.dkr.ecr.$AwsRegion.amazonaws.com/$repo`:latest"
                docker push "$AccountId.dkr.ecr.$AwsRegion.amazonaws.com/$repo`:latest"
                Write-Host "  ✅ $repo (Redis) push concluído" -ForegroundColor Green
            }
            "rabbitmq-service" {
                docker pull rabbitmq:3-management-alpine
                docker tag rabbitmq:3-management-alpine "$AccountId.dkr.ecr.$AwsRegion.amazonaws.com/$repo`:latest"
                docker push "$AccountId.dkr.ecr.$AwsRegion.amazonaws.com/$repo`:latest"
                Write-Host "  ✅ $repo (RabbitMQ) push concluído" -ForegroundColor Green
            }
        }
    }
}

# 4. Recriar task definitions
Write-Host ""
Write-Host "📋 4. Recriando Task Definitions..." -ForegroundColor Cyan

# Obter endpoint do RDS
try {
    $DbEndpoint = aws rds describe-db-instances --db-instance-identifier sistema-reservas-db --query 'DBInstances[0].Endpoint.Address' --output text --region $AwsRegion
    Write-Host "  ✅ RDS Endpoint: $DbEndpoint" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️ RDS não encontrado, usando localhost" -ForegroundColor Yellow
    $DbEndpoint = "localhost"
}

# Criar task definitions atualizadas
$taskDefinitions = @{
    "redis-service" = @{
        family = "redis-service"
        cpu = "256"
        memory = "512"
        image = "$AccountId.dkr.ecr.$AwsRegion.amazonaws.com/redis-service:latest"
        port = 6379
        environment = @()
    }
    "rabbitmq-service" = @{
        family = "rabbitmq-service"
        cpu = "256"
        memory = "512"
        image = "$AccountId.dkr.ecr.$AwsRegion.amazonaws.com/rabbitmq-service:latest"
        port = 5672
        environment = @(
            @{name="RABBITMQ_DEFAULT_USER"; value="admin"},
            @{name="RABBITMQ_DEFAULT_PASS"; value="rabbitmq2024"}
        )
    }
    "reservas-service" = @{
        family = "reservas-service"
        cpu = "256"
        memory = "512"
        image = "$AccountId.dkr.ecr.$AwsRegion.amazonaws.com/reservas-service:latest"
        port = 3001
        environment = @(
            @{name="NODE_PORT"; value="3001"},
            @{name="DB_HOST"; value=$DbEndpoint},
            @{name="DB_USER"; value="admin"},
            @{name="DB_PASSWORD"; value="SistemaReservas2024!"},
            @{name="DB_NAME"; value="sistema_reservas"},
            @{name="DB_PORT"; value="3306"},
            @{name="JWT_SECRET"; value="jwt-secret-super-seguro-2024"},
            @{name="REDIS_HOST"; value="localhost"},
            @{name="RABBITMQ_HOST"; value="localhost"},
            @{name="RABBITMQ_USER"; value="admin"},
            @{name="RABBITMQ_PASS"; value="rabbitmq2024"}
        )
    }
    "frontend-nginx" = @{
        family = "frontend-nginx"
        cpu = "256"
        memory = "512"
        image = "$AccountId.dkr.ecr.$AwsRegion.amazonaws.com/frontend-nginx:latest"
        port = 80
        environment = @()
    }
}

foreach ($taskDef in $taskDefinitions.GetEnumerator()) {
    $name = $taskDef.Key
    $config = $taskDef.Value
    
    Write-Host "  Criando task definition para $name..." -ForegroundColor Yellow
    
    $taskDefJson = @{
        family = $config.family
        networkMode = "awsvpc"
        requiresCompatibilities = @("FARGATE")
        cpu = $config.cpu
        memory = $config.memory
        executionRoleArn = "arn:aws:iam::$AccountId`:role/ecsTaskExecutionRole"
        containerDefinitions = @(
            @{
                name = $name
                image = $config.image
                portMappings = @(
                    @{
                        containerPort = $config.port
                        protocol = "tcp"
                    }
                )
                environment = $config.environment
                logConfiguration = @{
                    logDriver = "awslogs"
                    options = @{
                        "awslogs-group" = "/ecs/$name"
                        "awslogs-region" = $AwsRegion
                        "awslogs-stream-prefix" = "ecs"
                    }
                }
            }
        )
    } | ConvertTo-Json -Depth 10
    
    # Salvar em arquivo temporário
    $taskDefJson | Out-File -FilePath "$name-task.json" -Encoding UTF8
    
    # Registrar task definition
    try {
        aws ecs register-task-definition --cli-input-json "file://$name-task.json" --region $AwsRegion | Out-Null
        Write-Host "  ✅ Task definition $name registrada" -ForegroundColor Green
    } catch {
        Write-Host "  ❌ Erro ao registrar task definition $name" -ForegroundColor Red
    }
    
    # Limpar arquivo temporário
    Remove-Item "$name-task.json" -ErrorAction SilentlyContinue
}

# 5. Recriar serviços que não estão funcionando
Write-Host ""
Write-Host "🚀 5. Recriando serviços problemáticos..." -ForegroundColor Cyan

# Obter subnets
$subnets = aws ec2 describe-subnets --filters "Name=default-for-az,Values=true" --query 'Subnets[0:2].SubnetId' --output text --region $AwsRegion
$subnetList = $subnets -replace "`t", ","

Write-Host "  Usando subnets: $subnetList" -ForegroundColor White

$servicesToCreate = @("redis-service", "rabbitmq-service", "reservas-service", "frontend-nginx")

foreach ($service in $servicesToCreate) {
    Write-Host "  Verificando serviço $service..." -ForegroundColor Yellow
    
    try {
        # Tentar atualizar o serviço existente
        aws ecs update-service --cluster $ClusterName --service $service --desired-count 1 --force-new-deployment --region $AwsRegion | Out-Null
        Write-Host "  ✅ Serviço $service atualizado" -ForegroundColor Green
    } catch {
        # Se não existe, criar novo
        Write-Host "  🔄 Criando serviço $service..." -ForegroundColor Yellow
        try {
            aws ecs create-service --cluster $ClusterName --service-name $service --task-definition $service --desired-count 1 --launch-type FARGATE --network-configuration "awsvpcConfiguration={subnets=[$subnetList],assignPublicIp=ENABLED}" --region $AwsRegion | Out-Null
            Write-Host "  ✅ Serviço $service criado" -ForegroundColor Green
        } catch {
            Write-Host "  ❌ Erro ao criar serviço $service" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "⏳ Aguardando serviços ficarem estáveis (2 minutos)..." -ForegroundColor Yellow
Start-Sleep -Seconds 120

Write-Host ""
Write-Host "✅ CORREÇÃO CONCLUÍDA!" -ForegroundColor Green
Write-Host "Execute agora: .\check-aws-status.ps1" -ForegroundColor Cyan