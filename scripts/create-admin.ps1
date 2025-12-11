Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CRIANDO ADMIN PARA DEMONSTRACAO       " -ForegroundColor Cyan
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

Write-Host "`nCriando admin padrao..." -ForegroundColor Yellow

$adminBody = @{
    name = "Administrador"
    email = "admin@sistema.com"
    password = "admin123"
    role = "admin"
} | ConvertTo-Json

try {
    $admin = Invoke-RestMethod -Uri "$baseUrl/api/users" -Method POST -Body $adminBody -ContentType "application/json"
    Write-Host "  [OK] Admin criado com sucesso!" -ForegroundColor Green
} catch {
    if ($_.Exception.Message -match "409") {
        Write-Host "  [INFO] Admin ja existe" -ForegroundColor Yellow
    } else {
        Write-Host "  [ERRO] $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`nTestando login do admin..." -ForegroundColor Yellow

$loginBody = @{
    email = "admin@sistema.com"
    password = "admin123"
} | ConvertTo-Json

try {
    $login = Invoke-RestMethod -Uri "$baseUrl/api/users/login" -Method POST -Body $loginBody -ContentType "application/json"
    Write-Host "  [OK] Login realizado com sucesso!" -ForegroundColor Green
    Write-Host "  Token: $($login.token.Substring(0,20))..." -ForegroundColor Cyan
} catch {
    Write-Host "  [ERRO] $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "           CREDENCIAIS ADMIN            " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Email:    admin@sistema.com" -ForegroundColor White
Write-Host "Senha:    admin123" -ForegroundColor White
Write-Host "Role:     admin" -ForegroundColor White
Write-Host ""
Write-Host "Acesse: https://localhost" -ForegroundColor Cyan
Write-Host ""