# Script para diagnosticar problemas no deploy AWS
# Execute: .\diagnosticar-problemas.ps1

param(
    [string]$AwsRegion = "us-east-1",
    [string]$ClusterName = "sistema-reservas-cluster"
)

Write-Host "🔍 DIAGNÓSTICO DE PROBLEMAS AWS" -ForegroundColor Yellow
Write-Host "===============================" -ForegroundColor Yellow
Write-Host ""

# 1. Verificar se o cluster existe
Write-Host "📊 1. Verificando ECS Cluster..." -ForegroundColor Cyan
try {
    $clusterInfo = aws ecs describe-clusters --clusters $ClusterName --region $AwsRegion --query 'clusters[0]' --output json | ConvertFrom-Json
    Write-Host "✅ Cluster existe: $($clusterInfo.clusterName)" -ForegroundColor Green
    Write-Host "   Status: $($clusterInfo.status)" -ForegroundColor White
    Write-Host "   Tasks ativas: $($clusterInfo.runningTasksCount)" -ForegroundColor White
    Write-Host "   Serviços ativos: $($clusterInfo.activeServicesCount)" -ForegroundColor White
} catch {
    Write-Host "❌ Erro ao verificar cluster" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 2. Verificar serviços detalhadamente
Write-Host "🚀 2. Verificando cada serviço..." -ForegroundColor Cyan
$services = @("redis-service", "rabbitmq-service", "usuarios-service", "reservas-service", "frontend-nginx")

foreach ($service in $services) {
    Write-Host "Verificando $service..." -ForegroundColor Yellow
    
    try {
        $serviceInfo = aws ecs describe-services --cluster $ClusterName --services $service --region $AwsRegion --query 'services[0]' --output json | ConvertFrom-Json
        
        Write-Host "  Status: $($serviceInfo.status)" -ForegroundColor White
        Write-Host "  Desejado: $($serviceInfo.desiredCount)" -ForegroundColor White
        Write-Host "  Rodando: $($serviceInfo.runningCount)" -ForegroundColor White
        Write-Host "  Pendente: $($serviceInfo.pendingCount)" -ForegroundColor White
        
        # Verificar eventos do serviço
        if ($serviceInfo.events) {
            Write-Host "  Últimos eventos:" -ForegroundColor Magenta
            $serviceInfo.events | Select-Object -First 3 | ForEach-Object {
                Write-Host "    $($_.createdAt): $($_.message)" -ForegroundColor Gray
            }
        }
        
        # Verificar tasks
        $tasks = aws ecs list-tasks --cluster $ClusterName --service-name $service --region $AwsRegion --query 'taskArns' --output json | ConvertFrom-Json
        
        if ($tasks.Count -gt 0) {
            Write-Host "  Tasks encontradas: $($tasks.Count)" -ForegroundColor White
            
            # Verificar status da primeira task
            $taskInfo = aws ecs describe-tasks --cluster $ClusterName --tasks $tasks[0] --region $AwsRegion --query 'tasks[0]' --output json | ConvertFrom-Json
            Write-Host "  Status da task: $($taskInfo.lastStatus)" -ForegroundColor White
            
            if ($taskInfo.stoppedReason) {
                Write-Host "  Motivo da parada: $($taskInfo.stoppedReason)" -ForegroundColor Red
            }
        } else {
            Write-Host "  ❌ Nenhuma task encontrada" -ForegroundColor Red
        }
        
    } catch {
        Write-Host "  ❌ Serviço não encontrado ou erro" -ForegroundColor Red
    }
    
    Write-Host ""
}

# 3. Verificar task definitions
Write-Host "📋 3. Verificando Task Definitions..." -ForegroundColor Cyan
foreach ($service in $services) {
    try {
        $taskDef = aws ecs describe-task-definition --task-definition $service --region $AwsRegion --query 'taskDefinition.status' --output text
        Write-Host "  $service`: $taskDef" -ForegroundColor White
    } catch {
        Write-Host "  $service`: ❌ Não encontrada" -ForegroundColor Red
    }
}

Write-Host ""

# 4. Verificar ECR repositories
Write-Host "📦 4. Verificando ECR Repositories..." -ForegroundColor Cyan
$repos = @("usuarios-service", "reservas-service", "frontend-nginx", "redis-service", "rabbitmq-service")

foreach ($repo in $repos) {
    try {
        $repoInfo = aws ecr describe-repositories --repository-names $repo --region $AwsRegion --query 'repositories[0]' --output json | ConvertFrom-Json
        
        # Verificar se tem imagens
        $images = aws ecr list-images --repository-name $repo --region $AwsRegion --query 'imageIds' --output json | ConvertFrom-Json
        
        Write-Host "  $repo`: ✅ Existe ($($images.Count) imagens)" -ForegroundColor Green
    } catch {
        Write-Host "  $repo`: ❌ Não encontrado" -ForegroundColor Red
    }
}

Write-Host ""

# 5. Verificar RDS
Write-Host "🗄️ 5. Verificando RDS..." -ForegroundColor Cyan
try {
    $rdsInfo = aws rds describe-db-instances --db-instance-identifier sistema-reservas-db --region $AwsRegion --query 'DBInstances[0]' --output json | ConvertFrom-Json
    Write-Host "  Status: $($rdsInfo.DBInstanceStatus)" -ForegroundColor White
    Write-Host "  Endpoint: $($rdsInfo.Endpoint.Address)" -ForegroundColor White
} catch {
    Write-Host "  ❌ RDS não encontrado" -ForegroundColor Red
}

Write-Host ""

# 6. Verificar logs dos serviços com problemas
Write-Host "📊 6. Verificando logs dos serviços..." -ForegroundColor Cyan
foreach ($service in $services) {
    if ($service -ne "usuarios-service") {  # Pular o que está funcionando
        Write-Host "Logs do $service (últimas 10 linhas):" -ForegroundColor Yellow
        try {
            aws logs tail "/ecs/$service" --since 1h --region $AwsRegion | Select-Object -Last 10
        } catch {
            Write-Host "  ❌ Sem logs disponíveis" -ForegroundColor Red
        }
        Write-Host ""
    }
}

Write-Host ""
Write-Host "🔧 PRÓXIMOS PASSOS RECOMENDADOS:" -ForegroundColor Green
Write-Host "1. Se task definitions não existem: Execute novamente o deploy" -ForegroundColor White
Write-Host "2. Se imagens ECR não existem: Problema no build/push das imagens" -ForegroundColor White
Write-Host "3. Se tasks param: Verificar logs acima para erros específicos" -ForegroundColor White
Write-Host "4. Execute: .\corrigir-servicos.ps1 (script que vou criar)" -ForegroundColor White