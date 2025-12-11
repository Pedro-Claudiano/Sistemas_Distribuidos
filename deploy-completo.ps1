# Script de deploy completo AWS Free Tier - PowerShell
# Execute: .\deploy-completo.ps1

param(
    [string]$AwsRegion = "us-east-1"
)

Write-Host "🚀 DEPLOY COMPLETO AWS FREE TIER" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Verificar pré-requisitos
Write-Host "📋 Verificando pré-requisitos..." -ForegroundColor Yellow

# AWS CLI
try {
    aws --version | Out-Null
    Write-Host "✅ AWS CLI encontrado" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS CLI não encontrado. Instale: https://aws.amazon.com/cli/" -ForegroundColor Red
    exit 1
}

# Docker
try {
    docker --version | Out-Null
    Write-Host "✅ Docker encontrado" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker não encontrado. Instale: https://docker.com/" -ForegroundColor Red
    exit 1
}

# Docker rodando
try {
    docker ps | Out-Null
    Write-Host "✅ Docker está rodando" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker não está rodando. Inicie o Docker Desktop." -ForegroundColor Red
    exit 1
}

# Credenciais AWS
try {
    aws sts get-caller-identity | Out-Null
    Write-Host "✅ Credenciais AWS configuradas" -ForegroundColor Green
} catch {
    Write-Host "❌ Credenciais AWS não configuradas. Execute: aws configure" -ForegroundColor Red
    exit 1
}

$AccountId = aws sts get-caller-identity --query Account --output text
Write-Host "📋 AWS Account ID: $AccountId" -ForegroundColor Cyan
Write-Host "🌍 Região: $AwsRegion" -ForegroundColor Cyan

Write-Host ""
Write-Host "💰 Este deploy usará apenas recursos FREE TIER:" -ForegroundColor Green
Write-Host "  ✅ ECS Fargate: 750h/mês grátis" -ForegroundColor Green
Write-Host "  ✅ RDS MySQL: 750h/mês grátis" -ForegroundColor Green
Write-Host "  ✅ ECR: 500MB grátis/mês" -ForegroundColor Green
Write-Host "  ✅ CloudWatch: 5GB logs grátis/mês" -ForegroundColor Green
Write-Host ""

$confirm = Read-Host "Deseja continuar com o deploy? (s/N)"
if ($confirm -ne "s" -and $confirm -ne "S") {
    Write-Host "❌ Deploy cancelado." -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "🚀 Iniciando deploy automático..." -ForegroundColor Yellow
Write-Host "⏱️ Tempo estimado: 15-20 minutos" -ForegroundColor Yellow
Write-Host ""

# Executar deploy usando WSL ou Git Bash
Write-Host "📋 Executando deploy via bash..." -ForegroundColor Yellow

if (Get-Command wsl -ErrorAction SilentlyContinue) {
    Write-Host "Usando WSL..." -ForegroundColor Cyan
    wsl bash -c "./deploy-aws.sh"
} elseif (Get-Command bash -ErrorAction SilentlyContinue) {
    Write-Host "Usando Git Bash..." -ForegroundColor Cyan
    bash ./deploy-aws.sh
} else {
    Write-Host "❌ Bash não encontrado. Instale WSL ou Git Bash." -ForegroundColor Red
    Write-Host "Alternativa: Execute manualmente no Git Bash: ./deploy-aws.sh" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "🎉 DEPLOY FINALIZADO!" -ForegroundColor Green
Write-Host "=====================" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Próximos passos:" -ForegroundColor Yellow
Write-Host "1. Execute para ver status: .\check-aws-status.ps1" -ForegroundColor White
Write-Host "2. Acesse sua aplicação nos IPs mostrados" -ForegroundColor White
Write-Host "3. Para limpar recursos: .\cleanup-aws.ps1" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Sua aplicação está rodando na AWS de forma distribuída!" -ForegroundColor Green