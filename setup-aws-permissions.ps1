# Script para configurar permissões AWS para deploy
# Execute como administrador da conta AWS

param(
    [Parameter(Mandatory=$true)]
    [string]$UserName = "deploy-sd"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Configurando Permissões AWS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Política para ECR (Docker Registry)
$EcrPolicy = @"
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ecr:GetAuthorizationToken",
                "ecr:BatchCheckLayerAvailability",
                "ecr:GetDownloadUrlForLayer",
                "ecr:BatchGetImage",
                "ecr:CreateRepository",
                "ecr:DescribeRepositories",
                "ecr:PutImage",
                "ecr:InitiateLayerUpload",
                "ecr:UploadLayerPart",
                "ecr:CompleteLayerUpload"
            ],
            "Resource": "*"
        }
    ]
}
"@

# Política para ECS (Container Service)
$EcsPolicy = @"
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ecs:*",
                "ec2:DescribeVpcs",
                "ec2:DescribeSubnets",
                "ec2:DescribeSecurityGroups",
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
                "logs:DescribeLogGroups",
                "logs:DescribeLogStreams"
            ],
            "Resource": "*"
        }
    ]
}
"@

# Política para RDS (Database)
$RdsPolicy = @"
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "rds:*",
                "ec2:DescribeVpcs",
                "ec2:DescribeSubnets",
                "ec2:DescribeSecurityGroups"
            ],
            "Resource": "*"
        }
    ]
}
"@

Write-Host "[1/4] Criando política ECR..." -ForegroundColor Yellow
$EcrPolicy | Out-File -FilePath "ecr-policy.json" -Encoding UTF8
aws iam create-policy --policy-name "DeployECRPolicy" --policy-document file://ecr-policy.json
aws iam attach-user-policy --user-name $UserName --policy-arn "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):policy/DeployECRPolicy"

Write-Host "[2/4] Criando política ECS..." -ForegroundColor Yellow
$EcsPolicy | Out-File -FilePath "ecs-policy.json" -Encoding UTF8
aws iam create-policy --policy-name "DeployECSPolicy" --policy-document file://ecs-policy.json
aws iam attach-user-policy --user-name $UserName --policy-arn "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):policy/DeployECSPolicy"

Write-Host "[3/4] Criando política RDS..." -ForegroundColor Yellow
$RdsPolicy | Out-File -FilePath "rds-policy.json" -Encoding UTF8
aws iam create-policy --policy-name "DeployRDSPolicy" --policy-document file://rds-policy.json
aws iam attach-user-policy --user-name $UserName --policy-arn "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):policy/DeployRDSPolicy"

Write-Host "[4/4] Limpando arquivos temporários..." -ForegroundColor Yellow
Remove-Item "ecr-policy.json", "ecs-policy.json", "rds-policy.json" -Force

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Permissões Configuradas!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Usuário $UserName agora tem permissões para:" -ForegroundColor Yellow
Write-Host "  ✅ ECR (Docker Registry)"
Write-Host "  ✅ ECS (Container Service)"
Write-Host "  ✅ RDS (Database)"
Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Cyan
Write-Host "  1. Inicie o Docker Desktop"
Write-Host "  2. Execute novamente: .\deploy-aws.ps1 -AwsAccountId '215665149732' -AwsRegion 'us-east-1'"
Write-Host ""