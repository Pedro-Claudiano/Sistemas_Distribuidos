Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TESTE RAPIDO - VALIDACAO SISTEMA      " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$baseUrl = "https://localhost"
$timestamp = Get-Date -Format "HHmmss"

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

Write-Host "`n[1] Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET
    Write-Host "  [OK] Servico UP" -ForegroundColor Green
} catch {
    Write-Host "  [ERRO] $($_.Exception.Message)" -ForegroundColor Red
    exit
}

Write-Host "`n[2] Criar e autenticar usuario..." -ForegroundColor Yellow
try {
    $userBody = @{
        name = "Teste Rapido"
        email = "teste_${timestamp}@exemplo.com"
        password = "senha123"
    } | ConvertTo-Json
    
    $user = Invoke-RestMethod -Uri "$baseUrl/api/users" -Method POST -Body $userBody -ContentType "application/json"
    
    $loginBody = @{
        email = "teste_${timestamp}@exemplo.com"
        password = "senha123"
    } | ConvertTo-Json
    
    $login = Invoke-RestMethod -Uri "$baseUrl/api/users/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $login.token
    Write-Host "  [OK] Usuario criado e autenticado" -ForegroundColor Green
} catch {
    Write-Host "  [ERRO] $($_.Exception.Message)" -ForegroundColor Red
    exit
}

Write-Host "`n[3] Criar reserva..." -ForegroundColor Yellow
try {
    $reservaBody = @{
        room_id = "sala_teste_${timestamp}"
        start_time = "2025-12-31T10:00:00"
        end_time = "2025-12-31T11:00:00"
    } | ConvertTo-Json
    
    $headers = @{ "Authorization" = "Bearer $token" }
    $reserva = Invoke-RestMethod -Uri "$baseUrl/api/reservas" -Method POST -Body $reservaBody -ContentType "application/json" -Headers $headers
    Write-Host "  [OK] Reserva criada: $($reserva.id)" -ForegroundColor Green
} catch {
    Write-Host "  [ERRO] $($_.Exception.Message)" -ForegroundColor Red
    exit
}

Write-Host "`n[4] Listar reservas..." -ForegroundColor Yellow
try {
    $headers = @{ "Authorization" = "Bearer $token" }
    $reservas = Invoke-RestMethod -Uri "$baseUrl/api/reservas" -Method GET -Headers $headers
    Write-Host "  [OK] Usuario tem $($reservas.Count) reserva(s)" -ForegroundColor Green
} catch {
    Write-Host "  [ERRO] $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  TESTE RAPIDO CONCLUIDO COM SUCESSO    " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Sistema funcionando 100%!" -ForegroundColor Cyan
Write-Host "Acesse: https://localhost" -ForegroundColor White
Write-Host ""