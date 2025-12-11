Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CRIANDO USUARIOS PARA DEMONSTRACAO    " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$baseUrl = "https://localhost"

# Ignorar erros SSL
add-type @"
    using System.Net;
    using System.Security.Cryptography.X509Certificates;
    public class TrustAllCertsPolicy : ICertificatePolicy {
        public bool CheckValidationResult(
            ServicePoint srvPoint, X509Certificate certificate,
            WebRequest request, int certificateProblem) {
            return true;
        }
    }
"@
[System.Net.ServicePointManager]::CertificatePolicy = New-Object TrustAllCertsPolicy
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12

# Criar Cliente
Write-Host "`nCriando cliente padrao..." -ForegroundColor Yellow
$clientBody = @{
    name = "Cliente Demo"
    email = "cliente@sistema.com"
    password = "cliente123"
} | ConvertTo-Json

try {
    $client = Invoke-RestMethod -Uri "$baseUrl/api/users" -Method POST -Body $clientBody -ContentType "application/json"
    Write-Host "  [OK] Cliente criado!" -ForegroundColor Green
} catch {
    if ($_.Exception.Message -match "409") {
        Write-Host "  [INFO] Cliente ja existe" -ForegroundColor Yellow
    }
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "        USUARIOS PARA DEMONSTRACAO      " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "ADMIN:" -ForegroundColor Red
Write-Host "  Email: admin@sistema.com" -ForegroundColor White
Write-Host "  Senha: admin123" -ForegroundColor White
Write-Host "  Pode: Ver todas reservas, modificar, deletar, criar eventos" -ForegroundColor Gray
Write-Host ""
Write-Host "CLIENTE:" -ForegroundColor Blue
Write-Host "  Email: cliente@sistema.com" -ForegroundColor White
Write-Host "  Senha: cliente123" -ForegroundColor White
Write-Host "  Pode: Criar reservas, ver apenas suas reservas, receber notificacoes" -ForegroundColor Gray
Write-Host ""
Write-Host "Acesse: https://localhost" -ForegroundColor Cyan
Write-Host "Use o arquivo testes.http para testar as APIs" -ForegroundColor Yellow
Write-Host ""