# Script de Teste Local - Sistema de Reservas
# Execute com: .\test-local.ps1

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Teste Local - Sistema de Reservas" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Função para verificar se um serviço está respondendo
function Test-ServiceHealth {
    param(
        [string]$ServiceName,
        [string]$Url,
        [int]$MaxRetries = 10
    )
    
    Write-Host "[INFO] Testando $ServiceName..." -ForegroundColor Cyan
    
    for ($i = 1; $i -le $MaxRetries; $i++) {
        try {
            $response = Invoke-WebRequest -Uri $Url -Method Get -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                Write-Host "[OK] $ServiceName está saudável!" -ForegroundColor Green
                return $true
            }
        } catch {
            Write-Host "[TENTATIVA $i/$MaxRetries] $ServiceName ainda não está pronto..." -ForegroundColor Yellow
            Start-Sleep -Seconds 3
        }
    }
    
    Write-Host "[ERRO] $ServiceName não respondeu após $MaxRetries tentativas" -ForegroundColor Red
    return $false
}

# Passo 1: Verificar se Docker está rodando
Write-Host "[1/7] Verificando Docker..." -ForegroundColor Yellow
try {
    docker ps | Out-Null
    Write-Host "[OK] Docker está rodando" -ForegroundColor Green
} catch {
    Write-Host "[ERRO] Docker não está rodando. Inicie o Docker Desktop." -ForegroundColor Red
    exit 1
}

# Passo 2: Verificar arquivo .env
Write-Host ""
Write-Host "[2/7] Verificando arquivo .env..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "[OK] Arquivo .env encontrado" -ForegroundColor Green
} else {
    Write-Host "[ERRO] Arquivo .env não encontrado!" -ForegroundColor Red
    Write-Host "[INFO] Copie .env.exemple para .env e configure as variáveis" -ForegroundColor Cyan
    exit 1
}

# Passo 3: Parar containers antigos
Write-Host ""
Write-Host "[3/7] Parando containers antigos..." -ForegroundColor Yellow
docker-compose down -v
Write-Host "[OK] Containers antigos removidos" -ForegroundColor Green

# Passo 4: Subir os serviços
Write-Host ""
Write-Host "[4/7] Subindo serviços com Docker Compose..." -ForegroundColor Yellow
docker-compose up --build -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERRO] Falha ao subir os serviços" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Serviços iniciados" -ForegroundColor Green

# Passo 5: Aguardar serviços ficarem prontos
Write-Host ""
Write-Host "[5/7] Aguardando serviços ficarem prontos..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Testar MySQL
if (-not (Test-ServiceHealth "MySQL" "http://localhost:3307" -MaxRetries 5)) {
    Write-Host "[AVISO] MySQL pode não estar pronto, mas continuando..." -ForegroundColor Yellow
}

# Testar Redis
Write-Host "[INFO] Verificando Redis..." -ForegroundColor Cyan
try {
    docker exec redis_lock redis-cli ping | Out-Null
    Write-Host "[OK] Redis está respondendo" -ForegroundColor Green
} catch {
    Write-Host "[ERRO] Redis não está respondendo" -ForegroundColor Red
}

# Passo 6: Criar tabelas no banco
Write-Host ""
Write-Host "[6/7] Criando tabelas no banco de dados..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
try {
    node create-tables.js
    Write-Host "[OK] Tabelas criadas com sucesso" -ForegroundColor Green
} catch {
    Write-Host "[ERRO] Falha ao criar tabelas: $_" -ForegroundColor Red
    Write-Host "[INFO] Verifique os logs: docker-compose logs mysql-primary" -ForegroundColor Cyan
}

# Passo 7: Testar endpoints
Write-Host ""
Write-Host "[7/7] Testando endpoints da API..." -ForegroundColor Yellow

# Aguardar serviços backend
Start-Sleep -Seconds 5

# Testar Serviço de Usuários
if (Test-ServiceHealth "Serviço de Usuários" "https://localhost/health") {
    Write-Host "[OK] Serviço de Usuários está funcionando" -ForegroundColor Green
} else {
    Write-Host "[ERRO] Serviço de Usuários não está respondendo" -ForegroundColor Red
    Write-Host "[INFO] Verifique os logs: docker-compose logs usuarios-service" -ForegroundColor Cyan
}

# Testar Serviço de Reservas
if (Test-ServiceHealth "Serviço de Reservas" "http://localhost:3001/health") {
    Write-Host "[OK] Serviço de Reservas está funcionando" -ForegroundColor Green
} else {
    Write-Host "[ERRO] Serviço de Reservas não está respondendo" -ForegroundColor Red
    Write-Host "[INFO] Verifique os logs: docker-compose logs reservas-service" -ForegroundColor Cyan
}

# Testar Frontend
if (Test-ServiceHealth "Frontend" "https://localhost") {
    Write-Host "[OK] Frontend está funcionando" -ForegroundColor Green
} else {
    Write-Host "[ERRO] Frontend não está respondendo" -ForegroundColor Red
    Write-Host "[INFO] Verifique os logs: docker-compose logs frontend" -ForegroundColor Cyan
}

# Resumo
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Resumo dos Testes" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "URLs de Acesso:" -ForegroundColor Yellow
Write-Host "  Frontend:           https://localhost" -ForegroundColor White
Write-Host "  API Usuários:       https://localhost/api/users" -ForegroundColor White
Write-Host "  API Reservas:       http://localhost:3001/reservas" -ForegroundColor White
Write-Host "  Demo:               https://localhost/demo" -ForegroundColor White
Write-Host ""
Write-Host "Comandos Úteis:" -ForegroundColor Yellow
Write-Host "  Ver logs:           docker-compose logs -f" -ForegroundColor White
Write-Host "  Ver logs específico: docker-compose logs -f usuarios-service" -ForegroundColor White
Write-Host "  Parar serviços:     docker-compose down" -ForegroundColor White
Write-Host "  Reiniciar:          docker-compose restart" -ForegroundColor White
Write-Host ""
Write-Host "Teste Manual:" -ForegroundColor Yellow
Write-Host "  1. Abra https://localhost no navegador" -ForegroundColor White
Write-Host "  2. Registre um novo usuário" -ForegroundColor White
Write-Host "  3. Faça login" -ForegroundColor White
Write-Host "  4. Crie uma reserva" -ForegroundColor White
Write-Host "  5. Teste o lock abrindo duas abas e reservando a mesma sala" -ForegroundColor White
Write-Host ""
Write-Host "Arquivo de testes HTTP: testes.http" -ForegroundColor Cyan
Write-Host "  (Use Thunder Client ou REST Client no VS Code)" -ForegroundColor Cyan
Write-Host ""
