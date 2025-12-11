# Script para limpar recursos AWS - PowerShell
# Execute: .\cleanup-aws.ps1

param(
    [string]$AwsRegion = "us-east-1",
    [string]$ClusterName = "sistema-reservas-cluster"
)

Write-Host "🧹 Script de Limpeza AWS" -ForegroundColor Red
Write-Host "========================" -ForegroundColor Red
Write-Host ""
Write-Host "⚠️  ATENÇÃO: Este script irá deletar TODOS os recursos AWS criados!" -ForegroundColor Red
Write-Host "Isso inclui:" -ForegroundColor Yellow
Write-Host "  - ECS Services e Tasks" -ForegroundColor White
Write-Host "  - ECS Cluster" -ForegroundColor White
Write-Host "  - RDS MySQL Database" -ForegroundColor White
Write-Host "  - ECR Repositories" -ForegroundColor White
Write-Host "  - CloudWatch Log Groups" -ForegroundColor White
Write-Host ""

$confirm = Read-Host "Tem certeza que deseja continuar? Digite 'SIM' para confirmar"

if ($confirm -ne "SIM") {
    Write-Host "❌ Operação cancelada." -ForegroundColor Green
    exit 0
}

Write-Host ""
Write-Host "🗑️ Iniciando limpeza..." -ForegroundColor Red

# 1. Parar e deletar ECS Services
Write-Host "🚀 Deletando ECS Services..." -ForegroundColor Yellow
$services = @("redis-service", "rabbitmq-service", "usuarios-service", "reservas-service", "frontend-nginx")

foreach ($service in $services) {
    Write-Host "Parando $service..." -ForegroundColor Cyan
    aws ecs update-service --cluster $ClusterName --service $service --desired-count 0 --region $AwsRegion 2>$null
    
    Write-Host "Aguardando $service parar..." -ForegroundColor Cyan
    aws ecs wait services-stable --cluster $ClusterName --services $service --region $AwsRegion 2>$null
    
    Write-Host "Deletando $service..." -ForegroundColor Cyan
    aws ecs delete-service --cluster $ClusterName --service $service --region $AwsRegion 2>$null
}

# 2. Deletar Task Definitions
Write-Host "📋 Desregistrando Task Definitions..." -ForegroundColor Yellow
$families = @("redis-service", "rabbitmq-service", "usuarios-service", "reservas-service", "frontend-nginx")

foreach ($family in $families) {
    Write-Host "Desregistrando $family..." -ForegroundColor Cyan
    
    # Listar todas as revisões da task definition
    $revisions = aws ecs list-task-definitions --family-prefix $family --region $AwsRegion --query 'taskDefinitionArns' --output text
    
    if ($revisions) {
        $revisionList = $revisions -split "`t"
        foreach ($revision in $revisionList) {
            if ($revision.Trim()) {
                aws ecs deregister-task-definition --task-definition $revision.Trim() --region $AwsRegion 2>$null
            }
        }
    }
}

# 3. Deletar ECS Cluster
Write-Host "🐳 Deletando ECS Cluster..." -ForegroundColor Yellow
aws ecs delete-cluster --cluster $ClusterName --region $AwsRegion 2>$null

# 4. Deletar RDS Instance
Write-Host "🗄️ Deletando RDS Instance..." -ForegroundColor Yellow
aws rds delete-db-instance --db-instance-identifier sistema-reservas-db --skip-final-snapshot --delete-automated-backups --region $AwsRegion 2>$null

# 5. Deletar ECR Repositories
Write-Host "📦 Deletando ECR Repositories..." -ForegroundColor Yellow
$repos = @("usuarios-service", "reservas-service", "frontend-nginx", "redis-service", "rabbitmq-service")

foreach ($repo in $repos) {
    Write-Host "Deletando repositório $repo..." -ForegroundColor Cyan
    aws ecr delete-repository --repository-name $repo --force --region $AwsRegion 2>$null
}

# 6. Deletar CloudWatch Log Groups
Write-Host "📊 Deletando CloudWatch Log Groups..." -ForegroundColor Yellow
$logGroups = @("/ecs/usuarios-service", "/ecs/reservas-service", "/ecs/frontend-nginx", "/ecs/redis-service", "/ecs/rabbitmq-service")

foreach ($logGroup in $logGroups) {
    Write-Host "Deletando log group $logGroup..." -ForegroundColor Cyan
    aws logs delete-log-group --log-group-name $logGroup --region $AwsRegion 2>$null
}

# 7. IAM Role (opcional)
Write-Host "🔐 IAM Role..." -ForegroundColor Yellow
$deleteRole = Read-Host "Deseja deletar a IAM Role ecsTaskExecutionRole? Ela pode ser usada por outros projetos ECS (s/N)"

if ($deleteRole -eq "s" -or $deleteRole -eq "S") {
    Write-Host "Removendo policy da role..." -ForegroundColor Cyan
    aws iam detach-role-policy --role-name ecsTaskExecutionRole --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy --region $AwsRegion 2>$null
    
    Write-Host "Deletando role..." -ForegroundColor Cyan
    aws iam delete-role --role-name ecsTaskExecutionRole --region $AwsRegion 2>$null
} else {
    Write-Host "IAM Role mantida." -ForegroundColor Green
}

Write-Host ""
Write-Host "✅ Limpeza concluída!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Recursos removidos:" -ForegroundColor Cyan
Write-Host "  ✓ ECS Services (5)" -ForegroundColor Green
Write-Host "  ✓ ECS Task Definitions (5 famílias)" -ForegroundColor Green
Write-Host "  ✓ ECS Cluster" -ForegroundColor Green
Write-Host "  ✓ RDS MySQL Instance" -ForegroundColor Green
Write-Host "  ✓ ECR Repositories (5)" -ForegroundColor Green
Write-Host "  ✓ CloudWatch Log Groups (5)" -ForegroundColor Green
Write-Host ""
Write-Host "💰 Custos AWS foram interrompidos." -ForegroundColor Green
Write-Host "⏳ Alguns recursos podem levar alguns minutos para serem completamente removidos." -ForegroundColor Yellow