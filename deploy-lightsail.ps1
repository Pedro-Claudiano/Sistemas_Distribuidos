# Script de Deploy AWS Lightsail - Sistema de Reservas
# Execute com: .\deploy-lightsail.ps1

param(
    [Parameter(Mandatory=$false)]
    [string]$ServiceName = "reservas-app",
    
    [Parameter(Mandatory=$false)]
    [string]$DatabaseName = "reservas-db",
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1",
    
    [Parameter(Mandatory=$false)]
    [string]$DbPassword = "SuaSenhaSegura123!"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deploy AWS Lightsail - Reservas" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Função para verificar AWS CLI
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

# Função para verificar Docker
function Test-Docker {
    try {
        docker --version | Out-Null
        Write-Host "[OK] Docker encontrado" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "[ERRO] Docker não encontrado. Instale o Docker Desktop." -ForegroundColor Red
        return $false
    }
}

# Verificações
Write-Host "Verificando pré-requisitos..." -ForegroundColor Yellow
if (-not (Test-AwsCli)) { exit 1 }
if (-not (Test-Docker)) { exit 1 }

Write-Host ""
Write-Host "Configuração:" -ForegroundColor Yellow
Write-Host "  Service Name: $ServiceName"
Write-Host "  Database Name: $DatabaseName"
Write-Host "  Region: $Region"
Write-Host ""

# Passo 1: Verificar credenciais AWS
Write-Host "[1/8] Verificando credenciais AWS..." -ForegroundColor Yellow
try {
    $identity = aws sts get-caller-identity | ConvertFrom-Json
    Write-Host "[OK] Autenticado como: $($identity.Arn)" -ForegroundColor Green
} catch {
    Write-Host "[ERRO] Credenciais AWS inválidas. Execute: aws configure" -ForegroundColor Red
    exit 1
}

# Passo 2: Criar Container Service
Write-Host ""
Write-Host "[2/8] Criando Container Service..." -ForegroundColor Yellow
try {
    $existing = aws lightsail get-container-services --service-name $ServiceName 2>$null
    if ($existing) {
        Write-Host "[INFO] Container Service já existe" -ForegroundColor Cyan
    } else {
        aws lightsail create-container-service `
            --service-name $ServiceName `
            --power small `
            --scale 2 `
            --region $Region | Out-Null
        Write-Host "[OK] Container Service criado. Aguardando ficar ativo..." -ForegroundColor Green
        
        # Aguardar ficar ativo
        $maxWait = 300 # 5 minutos
        $waited = 0
        while ($waited -lt $maxWait) {
            $status = aws lightsail get-container-services --service-name $ServiceName | ConvertFrom-Json
            if ($status.containerServices[0].state -eq "ACTIVE") {
                Write-Host "[OK] Container Service está ativo!" -ForegroundColor Green
                break
            }
            Write-Host "[INFO] Aguardando... ($waited/$maxWait segundos)" -ForegroundColor Cyan
            Start-Sleep -Seconds 10
            $waited += 10
        }
    }
} catch {
    Write-Host "[ERRO] Falha ao criar Container Service: $_" -ForegroundColor Red
    exit 1
}

# Passo 3: Criar Banco de Dados
Write-Host ""
Write-Host "[3/8] Criando Banco de Dados..." -ForegroundColor Yellow
try {
    $existingDb = aws lightsail get-relational-database --relational-database-name $DatabaseName 2>$null
    if ($existingDb) {
        Write-Host "[INFO] Banco de dados já existe" -ForegroundColor Cyan
    } else {
        aws lightsail create-relational-database `
            --relational-database-name $DatabaseName `
            --relational-database-blueprint-id mysql_8_0 `
            --relational-database-bundle-id micro_2_0 `
            --master-database-name reservas_db `
            --master-username admin `
            --master-user-password $DbPassword `
            --region $Region | Out-Null
        Write-Host "[OK] Banco de dados criado. Aguardando ficar disponível..." -ForegroundColor Green
        Write-Host "[INFO] Isso pode levar 10-15 minutos. Aguarde..." -ForegroundColor Cyan
        
        # Aguardar ficar disponível
        $maxWait = 900 # 15 minutos
        $waited = 0
        while ($waited -lt $maxWait) {
            $dbStatus = aws lightsail get-relational-database --relational-database-name $DatabaseName | ConvertFrom-Json
            if ($dbStatus.relationalDatabase.state -eq "available") {
                Write-Host "[OK] Banco de dados está disponível!" -ForegroundColor Green
                break
            }
            Write-Host "[INFO] Aguardando... ($waited/$maxWait segundos)" -ForegroundColor Cyan
            Start-Sleep -Seconds 30
            $waited += 30
        }
    }
} catch {
    Write-Host "[AVISO] Falha ao criar banco de dados: $_" -ForegroundColor Yellow
    Write-Host "[INFO] Você pode criar manualmente depois" -ForegroundColor Cyan
}

# Passo 4: Obter endpoint do banco
Write-Host ""
Write-Host "[4/8] Obtendo endpoint do banco..." -ForegroundColor Yellow
try {
    $dbInfo = aws lightsail get-relational-database --relational-database-name $DatabaseName | ConvertFrom-Json
    $dbEndpoint = $dbInfo.relationalDatabase.masterEndpoint.address
    Write-Host "[OK] Endpoint: $dbEndpoint" -ForegroundColor Green
} catch {
    Write-Host "[AVISO] Não foi possível obter endpoint. Use 'localhost' temporariamente" -ForegroundColor Yellow
    $dbEndpoint = "localhost"
}

# Passo 5: Build das imagens
Write-Host ""
Write-Host "[5/8] Fazendo build das imagens Docker..." -ForegroundColor Yellow

Write-Host "[INFO] Building usuarios-service..." -ForegroundColor Cyan
Set-Location backend/servico-usuarios
docker build -t usuarios-service:latest . | Out-Null
Set-Location ../..
Write-Host "[OK] usuarios-service build concluído" -ForegroundColor Green

Write-Host "[INFO] Building reservas-service..." -ForegroundColor Cyan
Set-Location backend/servico-reservas
docker build -t reservas-service:latest . | Out-Null
Set-Location ../..
Write-Host "[OK] reservas-service build concluído" -ForegroundColor Green

# Passo 6: Push das imagens
Write-Host ""
Write-Host "[6/8] Enviando imagens para Lightsail..." -ForegroundColor Yellow

Write-Host "[INFO] Pushing usuarios-service..." -ForegroundColor Cyan
aws lightsail push-container-image `
    --service-name $ServiceName `
    --label usuarios-service `
    --image usuarios-service:latest
Write-Host "[OK] usuarios-service enviado" -ForegroundColor Green

Write-Host "[INFO] Pushing reservas-service..." -ForegroundColor Cyan
aws lightsail push-container-image `
    --service-name $ServiceName `
    --label reservas-service `
    --image reservas-service:latest
Write-Host "[OK] reservas-service enviado" -ForegroundColor Green

# Passo 7: Criar deployment configuration
Write-Host ""
Write-Host "[7/8] Criando configuração de deployment..." -ForegroundColor Yellow

$deploymentConfig = @{
    containers = @{
        "usuarios-service" = @{
            image = ":usuarios-service.latest"
            ports = @{
                "3000" = "HTTP"
            }
            environment = @{
                NODE_PORT = "3000"
                DB_HOST = $dbEndpoint
                DB_USER = "admin"
                DB_PASSWORD = $DbPassword
                DB_NAME = "reservas_db"
                DB_PORT = "3306"
                JWT_SECRET = "seu-jwt-secret-super-seguro-12345"
            }
        }
        "reservas-service" = @{
            image = ":reservas-service.latest"
            ports = @{
                "3001" = "HTTP"
            }
            environment = @{
                NODE_PORT = "3001"
                DB_HOST = $dbEndpoint
                DB_USER = "admin"
                DB_PASSWORD = $DbPassword
                DB_NAME = "reservas_db"
                DB_PORT = "3306"
                JWT_SECRET = "seu-jwt-secret-super-seguro-12345"
                REDIS_HOST = "localhost"
            }
        }
    }
    publicEndpoint = @{
        containerName = "usuarios-service"
        containerPort = 3000
        healthCheck = @{
            path = "/health"
        }
    }
}

$deploymentJson = $deploymentConfig | ConvertTo-Json -Depth 10
$deploymentJson | Out-File -FilePath "lightsail-deployment.json" -Encoding UTF8
Write-Host "[OK] Configuração criada: lightsail-deployment.json" -ForegroundColor Green

# Passo 8: Deploy
Write-Host ""
Write-Host "[8/8] Fazendo deploy..." -ForegroundColor Yellow
try {
    aws lightsail create-container-service-deployment `
        --service-name $ServiceName `
        --cli-input-json file://lightsail-deployment.json | Out-Null
    Write-Host "[OK] Deploy iniciado!" -ForegroundColor Green
} catch {
    Write-Host "[ERRO] Falha no deploy: $_" -ForegroundColor Red
    exit 1
}

# Resumo
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deploy Concluído!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Aguarde o deployment ficar ativo (5-10 minutos):" -ForegroundColor White
Write-Host "   aws lightsail get-container-services --service-name $ServiceName" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Obtenha a URL pública:" -ForegroundColor White
Write-Host "   aws lightsail get-container-services --service-name $ServiceName | findstr url" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Crie as tabelas no banco:" -ForegroundColor White
Write-Host "   mysql -h $dbEndpoint -u admin -p" -ForegroundColor Cyan
Write-Host "   (senha: $DbPassword)" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Teste a aplicação:" -ForegroundColor White
Write-Host "   curl https://SUA_URL/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ver logs:" -ForegroundColor Yellow
Write-Host "   aws lightsail get-container-log --service-name $ServiceName --container-name usuarios-service" -ForegroundColor Cyan
Write-Host ""
Write-Host "Custos estimados: ~`$55/mês" -ForegroundColor Yellow
Write-Host ""
