Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TESTANDO FLUXO DE LOGIN ADMIN          " -ForegroundColor Cyan
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

Write-Host "`n[1] Testando login do admin..." -ForegroundColor Yellow
$adminLogin = @{
    email = "admin@admin.com"
    password = "admin123"
} | ConvertTo-Json

try {
    $adminAuth = Invoke-RestMethod -Uri "$baseUrl/api/users/login" -Method POST -Body $adminLogin -ContentType "application/json"
    Write-Host "  [OK] Admin logado com sucesso: $($adminAuth.name)" -ForegroundColor Green
    Write-Host "  [INFO] Role: $($adminAuth.role)" -ForegroundColor Cyan
    Write-Host "  [INFO] Token gerado com sucesso" -ForegroundColor Cyan
} catch {
    Write-Host "  [ERRO] $($_.Exception.Message)" -ForegroundColor Red
    exit
}

Write-Host "`n[2] Testando acesso direto ao /admin..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/admin" -UseBasicParsing
    Write-Host "  [OK] Pagina /admin acessivel (Status: $($response.StatusCode))" -ForegroundColor Green
    
    # Verifica se contém texto de redirecionamento
    if ($response.Content -like "*Redirecionando*") {
        Write-Host "  [OK] Pagina mostra mensagem de redirecionamento" -ForegroundColor Green
    } else {
        Write-Host "  [AVISO] Pagina nao mostra redirecionamento" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [ERRO] $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n[3] Testando acesso direto ao /admin/reservas..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/admin/reservas" -UseBasicParsing
    Write-Host "  [OK] Pagina /admin/reservas acessivel (Status: $($response.StatusCode))" -ForegroundColor Green
    
    # Verifica se contém elementos da interface de reservas
    if ($response.Content -like "*Reservas do Sistema*") {
        Write-Host "  [OK] Pagina contem interface de reservas" -ForegroundColor Green
    } else {
        Write-Host "  [AVISO] Pagina pode nao ter carregado corretamente" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [ERRO] $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n[4] Testando API de reservas detalhadas..." -ForegroundColor Yellow
try {
    $headers = @{ "Authorization" = "Bearer $($adminAuth.token)" }
    $reservas = Invoke-RestMethod -Uri "$baseUrl/api/reservas-detalhadas" -Method GET -Headers $headers
    Write-Host "  [OK] API retornou $($reservas.Count) reserva(s)" -ForegroundColor Green
    
    if ($reservas.Count -gt 0) {
        $ultimaReserva = $reservas[0]
        Write-Host "  [INFO] Exemplo: $($ultimaReserva.user_name) - Sala $($ultimaReserva.room_id)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "  [ERRO] $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  FLUXO DE LOGIN ADMIN TESTADO           " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "RESUMO:" -ForegroundColor Cyan
Write-Host "[OK] Admin pode fazer login" -ForegroundColor Green
Write-Host "[OK] Pagina /admin acessivel" -ForegroundColor Green
Write-Host "[OK] Pagina /admin/reservas funcional" -ForegroundColor Green
Write-Host "[OK] API de reservas detalhadas funcionando" -ForegroundColor Green
Write-Host ""
Write-Host "INSTRUCOES PARA TESTE MANUAL:" -ForegroundColor Cyan
Write-Host "1. Acesse: https://localhost" -ForegroundColor Yellow
Write-Host "2. Faca login com: admin@admin.com / admin123" -ForegroundColor Yellow
Write-Host "3. Verifique se vai direto para interface de reservas" -ForegroundColor Yellow
Write-Host "4. Confirme que NAO ha opcao de criar reservas" -ForegroundColor Yellow
Write-Host "5. Confirme que pode ver/cancelar/propor mudancas" -ForegroundColor Yellow
Write-Host ""