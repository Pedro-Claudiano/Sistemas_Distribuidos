# Execute este script como ADMINISTRADOR da conta AWS (não como deploy-sd)
# Adiciona permissão iam:PassRole ao usuário deploy-sd

Write-Host "Adicionando permissão iam:PassRole ao usuário deploy-sd..." -ForegroundColor Yellow

# Criar política para PassRole
$passRolePolicy = @"
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": "iam:PassRole",
            "Resource": "arn:aws:iam::215665149732:role/ecsTaskExecutionRole"
        }
    ]
}
"@

$passRolePolicy | Out-File -FilePath "pass-role-policy.json" -Encoding UTF8

# Criar e anexar a política
aws iam create-policy --policy-name "ECSPassRolePolicy" --policy-document file://pass-role-policy.json --region us-east-1
aws iam attach-user-policy --user-name deploy-sd --policy-arn "arn:aws:iam::215665149732:policy/ECSPassRolePolicy" --region us-east-1

Remove-Item "pass-role-policy.json" -Force

Write-Host "[OK] Permissão adicionada com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "Agora execute como deploy-sd:" -ForegroundColor Cyan
Write-Host "aws ecs run-task --cluster reservas-cluster --task-definition usuarios-task --count 1 --launch-type FARGATE --network-configuration 'awsvpcConfiguration={subnets=[subnet-0d70acc95f24091f8],assignPublicIp=ENABLED}' --region us-east-1" -ForegroundColor White