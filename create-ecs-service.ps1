# Script para criar o serviço ECS
param(
    [string]$ClusterName = "reservas-cluster",
    [string]$ServiceName = "usuarios-service"
)

Write-Host "🔄 Criando serviço ECS..." -ForegroundColor Yellow

# Obter subnets da VPC padrão
$subnets = aws ec2 describe-subnets --query "Subnets[0:2].SubnetId" --output text
$subnetArray = $subnets -split "`t"
$subnet1 = $subnetArray[0]
$subnet2 = $subnetArray[1]

Write-Host "📍 Usando subnets: $subnet1, $subnet2" -ForegroundColor Cyan

# Obter security group padrão
$securityGroup = aws ec2 describe-security-groups --query "SecurityGroups[?GroupName=='default'].GroupId" --output text

Write-Host "🔒 Usando security group: $securityGroup" -ForegroundColor Cyan

# Criar o serviço
$networkConfig = @{
    awsvpcConfiguration = @{
        subnets = @($subnet1, $subnet2)
        securityGroups = @($securityGroup)
        assignPublicIp = "ENABLED"
    }
} | ConvertTo-Json -Depth 3 -Compress

Write-Host "🚀 Criando serviço..." -ForegroundColor Yellow

aws ecs create-service `
    --cluster $ClusterName `
    --service-name $ServiceName `
    --task-definition usuarios-task-no-db:1 `
    --desired-count 1 `
    --launch-type FARGATE `
    --network-configuration $networkConfig

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Serviço criado com sucesso!" -ForegroundColor Green
    
    Write-Host "🔄 Aguardando serviço ficar estável..." -ForegroundColor Yellow
    aws ecs wait services-stable --cluster $ClusterName --services $ServiceName
    
    Write-Host "📋 Status do serviço:" -ForegroundColor Cyan
    aws ecs describe-services --cluster $ClusterName --services $ServiceName --query "services[0].{Status:status,Running:runningCount,Desired:desiredCount}"
} else {
    Write-Host "❌ Erro ao criar serviço" -ForegroundColor Red
}