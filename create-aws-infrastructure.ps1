# Script para criar infraestrutura AWS completa
# Sistema de Reservas - ECS + RDS + ALB

param(
    [Parameter(Mandatory=$true)]
    [string]$AwsAccountId,
    
    [Parameter(Mandatory=$true)]
    [string]$AwsRegion = "us-east-1"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Criando Infraestrutura AWS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Variáveis
$ClusterName = "reservas-cluster"
$VpcName = "reservas-vpc"
$DbPassword = "ReservasDB123!"
$EcrRegistry = "$AwsAccountId.dkr.ecr.$AwsRegion.amazonaws.com"

Write-Host "Configuração:" -ForegroundColor Yellow
Write-Host "  AWS Account: $AwsAccountId"
Write-Host "  Região: $AwsRegion"
Write-Host "  Cluster: $ClusterName"
Write-Host ""

# Passo 1: Criar VPC e Subnets
Write-Host "[1/8] Criando VPC e Subnets..." -ForegroundColor Yellow

# Criar VPC
$VpcId = aws ec2 create-vpc --cidr-block "10.0.0.0/16" --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=$VpcName}]" --query "Vpc.VpcId" --output text --region $AwsRegion
Write-Host "[OK] VPC criada: $VpcId" -ForegroundColor Green

# Habilitar DNS
aws ec2 modify-vpc-attribute --vpc-id $VpcId --enable-dns-hostnames --region $AwsRegion
aws ec2 modify-vpc-attribute --vpc-id $VpcId --enable-dns-support --region $AwsRegion

# Criar Internet Gateway
$IgwId = aws ec2 create-internet-gateway --tag-specifications "ResourceType=internet-gateway,Tags=[{Key=Name,Value=$VpcName-igw}]" --query "InternetGateway.InternetGatewayId" --output text --region $AwsRegion
aws ec2 attach-internet-gateway --vpc-id $VpcId --internet-gateway-id $IgwId --region $AwsRegion
Write-Host "[OK] Internet Gateway criado: $IgwId" -ForegroundColor Green

# Criar Subnets Públicas
$SubnetPublic1 = aws ec2 create-subnet --vpc-id $VpcId --cidr-block "10.0.1.0/24" --availability-zone "${AwsRegion}a" --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$VpcName-public-1}]" --query "Subnet.SubnetId" --output text --region $AwsRegion
$SubnetPublic2 = aws ec2 create-subnet --vpc-id $VpcId --cidr-block "10.0.2.0/24" --availability-zone "${AwsRegion}b" --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$VpcName-public-2}]" --query "Subnet.SubnetId" --output text --region $AwsRegion

# Criar Subnets Privadas
$SubnetPrivate1 = aws ec2 create-subnet --vpc-id $VpcId --cidr-block "10.0.3.0/24" --availability-zone "${AwsRegion}a" --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$VpcName-private-1}]" --query "Subnet.SubnetId" --output text --region $AwsRegion
$SubnetPrivate2 = aws ec2 create-subnet --vpc-id $VpcId --cidr-block "10.0.4.0/24" --availability-zone "${AwsRegion}b" --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$VpcName-private-2}]" --query "Subnet.SubnetId" --output text --region $AwsRegion

Write-Host "[OK] Subnets criadas: $SubnetPublic1, $SubnetPublic2, $SubnetPrivate1, $SubnetPrivate2" -ForegroundColor Green

# Passo 2: Configurar Roteamento
Write-Host ""
Write-Host "[2/8] Configurando roteamento..." -ForegroundColor Yellow

# Criar Route Table para subnets públicas
$RouteTablePublic = aws ec2 create-route-table --vpc-id $VpcId --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=$VpcName-public-rt}]" --query "RouteTable.RouteTableId" --output text --region $AwsRegion
aws ec2 create-route --route-table-id $RouteTablePublic --destination-cidr-block "0.0.0.0/0" --gateway-id $IgwId --region $AwsRegion
aws ec2 associate-route-table --subnet-id $SubnetPublic1 --route-table-id $RouteTablePublic --region $AwsRegion
aws ec2 associate-route-table --subnet-id $SubnetPublic2 --route-table-id $RouteTablePublic --region $AwsRegion

Write-Host "[OK] Roteamento configurado" -ForegroundColor Green

# Passo 3: Criar Security Groups
Write-Host ""
Write-Host "[3/8] Criando Security Groups..." -ForegroundColor Yellow

# Security Group para ALB
$AlbSgId = aws ec2 create-security-group --group-name "reservas-alb-sg" --description "Security Group para ALB" --vpc-id $VpcId --tag-specifications "ResourceType=security-group,Tags=[{Key=Name,Value=reservas-alb-sg}]" --query "GroupId" --output text --region $AwsRegion
aws ec2 authorize-security-group-ingress --group-id $AlbSgId --protocol tcp --port 80 --cidr "0.0.0.0/0" --region $AwsRegion
aws ec2 authorize-security-group-ingress --group-id $AlbSgId --protocol tcp --port 443 --cidr "0.0.0.0/0" --region $AwsRegion

# Security Group para ECS
$EcsSgId = aws ec2 create-security-group --group-name "reservas-ecs-sg" --description "Security Group para ECS" --vpc-id $VpcId --tag-specifications "ResourceType=security-group,Tags=[{Key=Name,Value=reservas-ecs-sg}]" --query "GroupId" --output text --region $AwsRegion
aws ec2 authorize-security-group-ingress --group-id $EcsSgId --protocol tcp --port 3000 --source-group $AlbSgId --region $AwsRegion
aws ec2 authorize-security-group-ingress --group-id $EcsSgId --protocol tcp --port 3001 --source-group $AlbSgId --region $AwsRegion
aws ec2 authorize-security-group-ingress --group-id $EcsSgId --protocol tcp --port 80 --source-group $AlbSgId --region $AwsRegion

# Security Group para RDS
$RdsSgId = aws ec2 create-security-group --group-name "reservas-rds-sg" --description "Security Group para RDS" --vpc-id $VpcId --tag-specifications "ResourceType=security-group,Tags=[{Key=Name,Value=reservas-rds-sg}]" --query "GroupId" --output text --region $AwsRegion
aws ec2 authorize-security-group-ingress --group-id $RdsSgId --protocol tcp --port 3306 --source-group $EcsSgId --region $AwsRegion

Write-Host "[OK] Security Groups criados: ALB=$AlbSgId, ECS=$EcsSgId, RDS=$RdsSgId" -ForegroundColor Green

# Passo 4: Criar RDS Subnet Group
Write-Host ""
Write-Host "[4/8] Criando RDS Subnet Group..." -ForegroundColor Yellow

aws rds create-db-subnet-group --db-subnet-group-name "reservas-db-subnet-group" --db-subnet-group-description "Subnet Group para RDS" --subnet-ids $SubnetPrivate1 $SubnetPrivate2 --tags "Key=Name,Value=reservas-db-subnet-group" --region $AwsRegion

Write-Host "[OK] RDS Subnet Group criado" -ForegroundColor Green

# Passo 5: Criar RDS MySQL
Write-Host ""
Write-Host "[5/8] Criando RDS MySQL..." -ForegroundColor Yellow

$DbIdentifier = "reservas-db"
aws rds create-db-instance --db-instance-identifier $DbIdentifier --db-instance-class "db.t3.micro" --engine "mysql" --master-username "admin" --master-user-password $DbPassword --allocated-storage 20 --vpc-security-group-ids $RdsSgId --db-subnet-group-name "reservas-db-subnet-group" --backup-retention-period 7 --storage-encrypted --tags "Key=Name,Value=$DbIdentifier" --region $AwsRegion

Write-Host "[OK] RDS MySQL sendo criado (pode levar 5-10 minutos)" -ForegroundColor Green

# Passo 6: Criar ECS Cluster
Write-Host ""
Write-Host "[6/8] Criando ECS Cluster..." -ForegroundColor Yellow

aws ecs create-cluster --cluster-name $ClusterName --capacity-providers "FARGATE" --default-capacity-provider-strategy "capacityProvider=FARGATE,weight=1" --tags "key=Name,value=$ClusterName" --region $AwsRegion

Write-Host "[OK] ECS Cluster criado: $ClusterName" -ForegroundColor Green

# Passo 7: Criar ALB
Write-Host ""
Write-Host "[7/8] Criando Application Load Balancer..." -ForegroundColor Yellow

$AlbArn = aws elbv2 create-load-balancer --name "reservas-alb" --subnets $SubnetPublic1 $SubnetPublic2 --security-groups $AlbSgId --tags "Key=Name,Value=reservas-alb" --query "LoadBalancers[0].LoadBalancerArn" --output text --region $AwsRegion

# Criar Target Groups
$TgUsuarios = aws elbv2 create-target-group --name "usuarios-tg" --protocol "HTTP" --port 3000 --vpc-id $VpcId --target-type "ip" --health-check-path "/health" --query "TargetGroups[0].TargetGroupArn" --output text --region $AwsRegion
$TgReservas = aws elbv2 create-target-group --name "reservas-tg" --protocol "HTTP" --port 3001 --vpc-id $VpcId --target-type "ip" --health-check-path "/health" --query "TargetGroups[0].TargetGroupArn" --output text --region $AwsRegion
$TgFrontend = aws elbv2 create-target-group --name "frontend-tg" --protocol "HTTP" --port 80 --vpc-id $VpcId --target-type "ip" --health-check-path "/" --query "TargetGroups[0].TargetGroupArn" --output text --region $AwsRegion

# Criar Listener
$ListenerArn = aws elbv2 create-listener --load-balancer-arn $AlbArn --protocol "HTTP" --port 80 --default-actions "Type=forward,TargetGroupArn=$TgFrontend" --query "Listeners[0].ListenerArn" --output text --region $AwsRegion

# Criar regras de roteamento
aws elbv2 create-rule --listener-arn $ListenerArn --priority 100 --conditions "Field=path-pattern,Values=/api/usuarios*" --actions "Type=forward,TargetGroupArn=$TgUsuarios" --region $AwsRegion
aws elbv2 create-rule --listener-arn $ListenerArn --priority 200 --conditions "Field=path-pattern,Values=/api/reservas*" --actions "Type=forward,TargetGroupArn=$TgReservas" --region $AwsRegion

Write-Host "[OK] ALB criado com Target Groups e regras de roteamento" -ForegroundColor Green

# Passo 8: Criar Task Definitions e Services
Write-Host ""
Write-Host "[8/8] Criando Task Definitions e Services..." -ForegroundColor Yellow

# Aguardar RDS ficar disponível
Write-Host "[INFO] Aguardando RDS ficar disponível..." -ForegroundColor Cyan
aws rds wait db-instance-available --db-instance-identifier $DbIdentifier --region $AwsRegion

# Obter endpoint do RDS
$DbEndpoint = aws rds describe-db-instances --db-instance-identifier $DbIdentifier --query "DBInstances[0].Endpoint.Address" --output text --region $AwsRegion

# Task Definition para Usuários
$TaskDefUsuarios = @"
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
                {"name": "DB_HOST", "value": "$DbEndpoint"},
                {"name": "DB_USER", "value": "admin"},
                {"name": "DB_PASSWORD", "value": "$DbPassword"},
                {"name": "DB_NAME", "value": "reservas_db"},
                {"name": "DB_PORT", "value": "3306"},
                {"name": "JWT_SECRET", "value": "jwt-secret-super-seguro-producao-2024"}
            ],
            "logConfiguration": {
                "logDriver": "awslogs",
                "options": {
                    "awslogs-group": "/ecs/usuarios-service",
                    "awslogs-region": "$AwsRegion",
                    "awslogs-stream-prefix": "ecs"
                }
            }
        }
    ]
}
"@

# Task Definition para Reservas
$TaskDefReservas = @"
{
    "family": "reservas-task",
    "networkMode": "awsvpc",
    "requiresCompatibilities": ["FARGATE"],
    "cpu": "256",
    "memory": "512",
    "executionRoleArn": "arn:aws:iam::$AwsAccountId:role/ecsTaskExecutionRole",
    "containerDefinitions": [
        {
            "name": "reservas-container",
            "image": "$EcrRegistry/reservas-service:prod",
            "portMappings": [
                {
                    "containerPort": 3001,
                    "protocol": "tcp"
                }
            ],
            "environment": [
                {"name": "NODE_ENV", "value": "production"},
                {"name": "NODE_PORT", "value": "3001"},
                {"name": "DB_HOST", "value": "$DbEndpoint"},
                {"name": "DB_USER", "value": "admin"},
                {"name": "DB_PASSWORD", "value": "$DbPassword"},
                {"name": "DB_NAME", "value": "reservas_db"},
                {"name": "DB_PORT", "value": "3306"},
                {"name": "JWT_SECRET", "value": "jwt-secret-super-seguro-producao-2024"}
            ],
            "logConfiguration": {
                "logDriver": "awslogs",
                "options": {
                    "awslogs-group": "/ecs/reservas-service",
                    "awslogs-region": "$AwsRegion",
                    "awslogs-stream-prefix": "ecs"
                }
            }
        }
    ]
}
"@

# Task Definition para Frontend
$TaskDefFrontend = @"
{
    "family": "frontend-task",
    "networkMode": "awsvpc",
    "requiresCompatibilities": ["FARGATE"],
    "cpu": "256",
    "memory": "512",
    "executionRoleArn": "arn:aws:iam::$AwsAccountId:role/ecsTaskExecutionRole",
    "containerDefinitions": [
        {
            "name": "frontend-container",
            "image": "$EcrRegistry/frontend-nginx:prod",
            "portMappings": [
                {
                    "containerPort": 80,
                    "protocol": "tcp"
                }
            ],
            "logConfiguration": {
                "logDriver": "awslogs",
                "options": {
                    "awslogs-group": "/ecs/frontend-service",
                    "awslogs-region": "$AwsRegion",
                    "awslogs-stream-prefix": "ecs"
                }
            }
        }
    ]
}
"@

# Criar Log Groups (com tratamento de erro)
Write-Host "[INFO] Criando Log Groups..." -ForegroundColor Cyan
try {
    aws logs create-log-group --log-group-name "/ecs/usuarios-service" --region $AwsRegion 2>$null
    Write-Host "[OK] Log group usuarios-service criado" -ForegroundColor Green
} catch {
    Write-Host "[AVISO] Log group usuarios-service pode já existir" -ForegroundColor Yellow
}

try {
    aws logs create-log-group --log-group-name "/ecs/reservas-service" --region $AwsRegion 2>$null
    Write-Host "[OK] Log group reservas-service criado" -ForegroundColor Green
} catch {
    Write-Host "[AVISO] Log group reservas-service pode já existir" -ForegroundColor Yellow
}

try {
    aws logs create-log-group --log-group-name "/ecs/frontend-service" --region $AwsRegion 2>$null
    Write-Host "[OK] Log group frontend-service criado" -ForegroundColor Green
} catch {
    Write-Host "[AVISO] Log group frontend-service pode já existir" -ForegroundColor Yellow
}

# Registrar Task Definitions
$TaskDefUsuarios | Out-File -FilePath "usuarios-task.json" -Encoding UTF8
$TaskDefReservas | Out-File -FilePath "reservas-task.json" -Encoding UTF8
$TaskDefFrontend | Out-File -FilePath "frontend-task.json" -Encoding UTF8

aws ecs register-task-definition --cli-input-json file://usuarios-task.json --region $AwsRegion
aws ecs register-task-definition --cli-input-json file://reservas-task.json --region $AwsRegion
aws ecs register-task-definition --cli-input-json file://frontend-task.json --region $AwsRegion

# Criar Services
aws ecs create-service --cluster $ClusterName --service-name "usuarios-service" --task-definition "usuarios-task" --desired-count 1 --launch-type "FARGATE" --network-configuration "awsvpcConfiguration={subnets=[$SubnetPrivate1,$SubnetPrivate2],securityGroups=[$EcsSgId],assignPublicIp=DISABLED}" --load-balancers "targetGroupArn=$TgUsuarios,containerName=usuarios-container,containerPort=3000" --region $AwsRegion

aws ecs create-service --cluster $ClusterName --service-name "reservas-service" --task-definition "reservas-task" --desired-count 1 --launch-type "FARGATE" --network-configuration "awsvpcConfiguration={subnets=[$SubnetPrivate1,$SubnetPrivate2],securityGroups=[$EcsSgId],assignPublicIp=DISABLED}" --load-balancers "targetGroupArn=$TgReservas,containerName=reservas-container,containerPort=3001" --region $AwsRegion

aws ecs create-service --cluster $ClusterName --service-name "frontend-service" --task-definition "frontend-task" --desired-count 1 --launch-type "FARGATE" --network-configuration "awsvpcConfiguration={subnets=[$SubnetPrivate1,$SubnetPrivate2],securityGroups=[$EcsSgId],assignPublicIp=DISABLED}" --load-balancers "targetGroupArn=$TgFrontend,containerName=frontend-container,containerPort=80" --region $AwsRegion

# Limpeza
Remove-Item "usuarios-task.json", "reservas-task.json", "frontend-task.json" -Force

Write-Host "[OK] Task Definitions e Services criados" -ForegroundColor Green

# Obter URL do ALB
$AlbDnsName = aws elbv2 describe-load-balancers --load-balancer-arns $AlbArn --query "LoadBalancers[0].DNSName" --output text --region $AwsRegion

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Infraestrutura AWS Criada!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Recursos criados:" -ForegroundColor Yellow
Write-Host "  ✅ VPC: $VpcId"
Write-Host "  ✅ ECS Cluster: $ClusterName"
Write-Host "  ✅ RDS MySQL: $DbEndpoint"
Write-Host "  ✅ ALB: $AlbDnsName"
Write-Host ""
Write-Host "URLs da aplicação:" -ForegroundColor Cyan
Write-Host "  🌐 Frontend: http://$AlbDnsName"
Write-Host "  🔗 API Usuários: http://$AlbDnsName/api/usuarios"
Write-Host "  🔗 API Reservas: http://$AlbDnsName/api/reservas"
Write-Host ""
Write-Host "Credenciais do banco:" -ForegroundColor Yellow
Write-Host "  Host: $DbEndpoint"
Write-Host "  Usuário: admin"
Write-Host "  Senha: $DbPassword"
Write-Host "  Database: reservas_db"
Write-Host ""
Write-Host "Aguarde 5-10 minutos para os serviços ficarem disponíveis!" -ForegroundColor Cyan
Write-Host ""