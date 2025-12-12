# Adicionar permissões CloudWatch Logs
param(
    [Parameter(Mandatory=$true)]
    [string]$UserName = "deploy-sd"
)

Write-Host "Adicionando permissões CloudWatch Logs..." -ForegroundColor Yellow

$CloudWatchPolicy = @"
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
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

$CloudWatchPolicy | Out-File -FilePath "cloudwatch-policy.json" -Encoding UTF8
aws iam create-policy --policy-name "DeployCloudWatchPolicy" --policy-document file://cloudwatch-policy.json
aws iam attach-user-policy --user-name $UserName --policy-arn "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):policy/DeployCloudWatchPolicy"
Remove-Item "cloudwatch-policy.json" -Force

Write-Host "[OK] Permissões CloudWatch adicionadas" -ForegroundColor Green