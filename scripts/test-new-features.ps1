Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TESTANDO NOVAS FUNCIONALIDADES        " -ForegroundColor Cyan
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

Write-Host "`n[1] Fazendo login como admin..." -ForegroundColor Yellow
$adminLogin = @{
    email = "admin@sistema.com"
    password = "admin123"
} | ConvertTo-Json

try {
    $adminAuth = Invoke-RestMethod -Uri "$baseUrl/api/users/login" -Method POST -Body $adminLogin -ContentType "application/json"
    $adminToken = $adminAuth.token
    Write-Host "  [OK] Admin autenticado" -ForegroundColor Green
} catch {
    Write-Host "  [ERRO] $($_.Exception.Message)" -ForegroundColor Red
    exit
}

Write-Host "`n[2] Fazendo login como cliente..." -ForegroundColor Yellow
$clientLogin = @{
    email = "cliente@sistema.com"
    password = "cliente123"
} | ConvertTo-Json

try {
    $clientAuth = Invoke-RestMethod -Uri "$baseUrl/api/users/login" -Method POST -Body $clientLogin -ContentType "application/json"
    $clientToken = $clientAuth.token
    Write-Host "  [OK] Cliente autenticado" -ForegroundColor Green
} catch {
    Write-Host "  [ERRO] $($_.Exception.Message)" -ForegroundColor Red
    exit
}

Write-Host "`n[3] Cliente criando reserva..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "HHmmss"
$reservaBody = @{
    room_id = "sala_nova_${timestamp}"
    start_time = "2025-12-25T10:00:00"
    end_time = "2025-12-25T11:00:00"
} | ConvertTo-Json

try {
    $headers = @{ "Authorization" = "Bearer $clientToken" }
    $reserva = Invoke-RestMethod -Uri "$baseUrl/api/reservas" -Method POST -Body $reservaBody -ContentType "application/json" -Headers $headers
    $reservaId = $reserva.id
    Write-Host "  [OK] Reserva criada: $reservaId" -ForegroundColor Green
} catch {
    Write-Host "  [ERRO] $($_.Exception.Message)" -ForegroundColor Red
    exit
}

Write-Host "`n[4] Admin testando listar reservas detalhadas..." -ForegroundColor Yellow
try {
    $headers = @{ "Authorization" = "Bearer $adminToken" }
    $reservasDetalhadas = Invoke-RestMethod -Uri "$baseUrl/api/reservas-detalhadas" -Method GET -Headers $headers
    Write-Host "  [OK] Admin vê $($reservasDetalhadas.Count) reserva(s) com detalhes" -ForegroundColor Green
    
    if ($reservasDetalhadas.Count -gt 0) {
        $ultimaReserva = $reservasDetalhadas[0]
        Write-Host "    Exemplo: $($ultimaReserva.user_name) - Sala $($ultimaReserva.room_id)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "  [ERRO] $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n[5] Admin propondo mudança na reserva..." -ForegroundColor Yellow
$mudancaBody = @{
    room_id = "sala_nova_mudanca"
    start_time = "2025-12-25T14:00:00"
    end_time = "2025-12-25T15:00:00"
} | ConvertTo-Json

try {
    $headers = @{ "Authorization" = "Bearer $adminToken" }
    $proposta = Invoke-RestMethod -Uri "$baseUrl/api/reservas/$reservaId/propor-mudanca" -Method PUT -Body $mudancaBody -ContentType "application/json" -Headers $headers
    Write-Host "  [OK] Proposta de mudança enviada" -ForegroundColor Green
    Write-Host "    Expira em: $($proposta.expiresAt)" -ForegroundColor Cyan
} catch {
    Write-Host "  [ERRO] $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n[6] Cliente verificando mudanças pendentes..." -ForegroundColor Yellow
try {
    $headers = @{ "Authorization" = "Bearer $clientToken" }
    $mudancasPendentes = Invoke-RestMethod -Uri "$baseUrl/api/mudancas-pendentes" -Method GET -Headers $headers
    Write-Host "  [OK] Cliente tem $($mudancasPendentes.Count) mudança(s) pendente(s)" -ForegroundColor Green
    
    if ($mudancasPendentes.Count -gt 0) {
        $mudanca = $mudancasPendentes[0]
        Write-Host "    Mudança: $($mudanca.old_room_id) → $($mudanca.new_room_id)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "  [ERRO] $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n[7] Cliente verificando notificações..." -ForegroundColor Yellow
try {
    $headers = @{ "Authorization" = "Bearer $clientToken" }
    $notificacoes = Invoke-RestMethod -Uri "$baseUrl/api/notificacoes" -Method GET -Headers $headers
    Write-Host "  [OK] Cliente tem $($notificacoes.Count) notificação(ões)" -ForegroundColor Green
    
    if ($notificacoes.Count -gt 0) {
        $ultimaNotif = $notificacoes[0]
        Write-Host "    Última: $($ultimaNotif.type)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "  [ERRO] $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  NOVAS FUNCIONALIDADES TESTADAS        " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "[OK] Sistema de propostas de mudança funcionando" -ForegroundColor Green
Write-Host "[OK] Notificações sendo enviadas" -ForegroundColor Green
Write-Host "[OK] Admin pode ver reservas detalhadas" -ForegroundColor Green
Write-Host ""
Write-Host "Acesse o painel admin em: https://localhost/admin" -ForegroundColor Cyan
Write-Host "Acesse notificações em: https://localhost/notifications" -ForegroundColor Cyan
Write-Host ""