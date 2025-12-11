# Script para verificar status do deploy AWS - PowerShell
# Execute: .\check-aws-status.ps1

param(
    [string]$AwsRegion = "us-east-1",
    [string]$ClusterName = "sistema-reservas-cluster"
)

Write-Host "🔍 Verificando status do deploy AWS..." -ForegroundColor Cyan
Write-Host ""

# 1. Status do Cluster ECS
Write-Host "📊 Status do ECS Cluster:" -ForegroundColor Yellow
aws ecs describe-clusters --clusters $ClusterName --region $AwsRegion --query 'clusters[0].{Name:clusterName,Status:status,ActiveServices:activeServicesCount,RunningTasks:runningTasksCount}' --output table

Write-Host ""

# 2. Status dos Services
Write-Host "🚀 Status dos ECS Services:" -ForegroundColor Yellow
aws ecs describe-services --cluster $ClusterName --services redis-service rabbitmq-service usuarios-service reservas-service frontend-nginx --region $AwsRegion --query 'services[*].{Name:serviceName,Status:status,Running:runningCount,Desired:desiredCount,Pending:pendingCount}' --output table

Write-Host ""

# 3. Status do RDS
Write-Host "🗄️ Status do RDS:" -ForegroundColor Yellow
aws rds describe-db-instances --db-instance-identifier sistema-reservas-db --region $AwsRegion --query 'DBInstances[0].{Status:DBInstanceStatus,Endpoint:Endpoint.Address,Engine:Engine,Class:DBInstanceClass}' --output table

Write-Host ""

# 4. Obter IPs públicos dos serviços
Write-Host "🌐 IPs públicos dos serviços:" -ForegroundColor Yellow

$services = @("redis-service", "rabbitmq-service", "usuarios-service", "reservas-service", "frontend-nginx")

foreach ($service in $services) {
    Write-Host "Obtendo IP do $service..." -ForegroundColor Cyan
    
    # Obter ARN da task
    $taskArn = aws ecs list-tasks --cluster $ClusterName --service-name $service --region $AwsRegion --query 'taskArns[0]' --output text
    
    if ($taskArn -ne "None" -and $taskArn -ne "") {
        # Obter Network Interface ID
        $eniId = aws ecs describe-tasks --cluster $ClusterName --tasks $taskArn --region $AwsRegion --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' --output text
        
        if ($eniId -ne "None" -and $eniId -ne "") {
            # Obter IP público
            $publicIp = aws ec2 describe-network-interfaces --network-interface-ids $eniId --region $AwsRegion --query 'NetworkInterfaces[0].Association.PublicIp' --output text
            Write-Host "  $service`: $publicIp" -ForegroundColor Green
        } else {
            Write-Host "  $service`: ENI não encontrado" -ForegroundColor Red
        }
    } else {
        Write-Host "  $service`: Task não encontrada" -ForegroundColor Red
    }
}

Write-Host ""

# 5. URLs de acesso
Write-Host "🔗 URLs de acesso:" -ForegroundColor Yellow
Write-Host "  Frontend: https://[IP_DO_FRONTEND]" -ForegroundColor White
Write-Host "  API Usuários: http://[IP_DO_USUARIOS]:3000" -ForegroundColor White
Write-Host "  API Reservas: http://[IP_DO_RESERVAS]:3001" -ForegroundColor White
Write-Host "  RabbitMQ Management: http://[IP_DO_RABBITMQ]:15672 (admin/rabbitmq2024)" -ForegroundColor White
Write-Host ""

# 6. Comandos úteis
Write-Host "💡 Comandos úteis:" -ForegroundColor Yellow
Write-Host "# Ver logs em tempo real:" -ForegroundColor Cyan
Write-Host "aws logs tail /ecs/usuarios-service --follow --region $AwsRegion" -ForegroundColor White
Write-Host "aws logs tail /ecs/reservas-service --follow --region $AwsRegion" -ForegroundColor White
Write-Host ""
Write-Host "# Reiniciar um serviço:" -ForegroundColor Cyan
Write-Host "aws ecs update-service --cluster $ClusterName --service usuarios-service --force-new-deployment --region $AwsRegion" -ForegroundColor White