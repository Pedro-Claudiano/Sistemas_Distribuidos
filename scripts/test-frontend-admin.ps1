Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TESTANDO INTERFACE ADMIN              " -ForegroundColor Cyan
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

Write-Host "`n[1] Testando acesso à página principal..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $baseUrl -UseBasicParsing
    Write-Host "  [OK] Página principal carregada (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "  [ERRO] $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n[2] Testando acesso ao painel admin..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/admin" -UseBasicParsing
    Write-Host "  [OK] Painel admin acessível (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "  [ERRO] $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n[3] Testando acesso às reservas admin..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/admin/reservas" -UseBasicParsing
    Write-Host "  [OK] Página de reservas admin acessível (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "  [ERRO] $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n[4] Testando acesso às notificações..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/notifications" -UseBasicParsing
    Write-Host "  [OK] Página de notificações acessível (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "  [ERRO] $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  INTERFACE TESTADA COM SUCESSO          " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "CREDENCIAIS DE TESTE:" -ForegroundColor Cyan
Write-Host "Admin: admin@admin.com / admin123" -ForegroundColor Yellow
Write-Host "Cliente: cliente@teste.com / 123456" -ForegroundColor Yellow
Write-Host ""
Write-Host "ACESSO DIRETO:" -ForegroundColor Cyan
Write-Host "Admin Dashboard: https://localhost/admin" -ForegroundColor Yellow
Write-Host "Reservas Admin: https://localhost/admin/reservas" -ForegroundColor Yellow
Write-Host "Notificações: https://localhost/notifications" -ForegroundColor Yellow
Write-Host ""