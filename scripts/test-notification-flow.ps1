Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TESTE COMPLETO DE NOTIFICACOES         " -ForegroundColor Cyan
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

Write-Host "`n=== FASE 1: PREPARACAO ===" -ForegroundColor Magenta

Write-Host "`n[1.1] Login Admin..." -ForegroundColor Yellow
$adminLogin = @{
    email = "admin@admin.com"
    password = "admin123"
} | ConvertTo-Json

try {
    $adminAuth = Invoke-RestMethod -Uri "$baseUrl/api/users/login" -Method POST -Body $adminLogin -ContentType "application/json"
    $adminToken = $adminAuth.token
    Write-Host "  [OK] Admin logado: $($adminAuth.name)" -ForegroundColor Green
} catch {
    Write-Host "  [ERRO] $($_.Exception.Message)" -ForegroundColor Red
    exit
}

Write-Host "`n[1.2] Login Cliente..." -ForegroundColor Yellow
$clientLogin = @{
    email = "cliente@teste.com"
    password = "123456"
} | ConvertTo-Json

try {
    $clientAuth = Invoke-RestMethod -Uri "$baseUrl/api/users/login" -Method POST -Body $clientLogin -ContentType "application/json"
    $clientToken = $clientAuth.token
    Write-Host "  [OK] Cliente logado: $($clientAuth.name)" -ForegroundColor Green
} catch {
    Write-Host "  [ERRO] $($_.Exception.Message)" -ForegroundColor Red
    exit
}

Write-Host "`n=== FASE 2: CRIACAO DE RESERVA ===" -ForegroundColor Magenta

Write-Host "`n[2.1] Cliente criando nova reserva..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "HHmmss"
$reservaBody = @{
    room_id = "sala_notif_test_${timestamp}"
    start_time = "2025-12-25T14:00:00"
    end_time = "2025-12-25T15:00:00"
} | ConvertTo-Json

try {
    $headers = @{ "Authorization" = "Bearer $clientToken" }
    $reserva = Invoke-RestMethod -Uri "$baseUrl/api/reservas" -Method POST -Body $reservaBody -ContentType "application/json" -Headers $headers
    $reservaId = $reserva.id
    Write-Host "  [OK] Reserva criada: $reservaId" -ForegroundColor Green
    Write-Host "  [INFO] Sala: sala_notif_test_${timestamp}" -ForegroundColor Cyan
} catch {
    Write-Host "  [ERRO] $($_.Exception.Message)" -ForegroundColor Red
    exit
}

Write-Host "`n=== FASE 3: VERIFICACAO INICIAL DE NOTIFICACOES ===" -ForegroundColor Magenta

Write-Host "`n[3.1] Verificando notificacoes iniciais do cliente..." -ForegroundColor Yellow
try {
    $headers = @{ "Authorization" = "Bearer $clientToken" }
    $notifIniciais = Invoke-RestMethod -Uri "$baseUrl/api/notificacoes" -Method GET -Headers $headers
    Write-Host "  [INFO] Cliente tem $($notifIniciais.Count) notificacao(oes) iniciais" -ForegroundColor Cyan
} catch {
    Write-Host "  [ERRO] $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== FASE 4: ADMIN PROPOE MUDANCA ===" -ForegroundColor Magenta

Write-Host "`n[4.1] Admin propondo mudanca na reserva..." -ForegroundColor Yellow
$mudancaBody = @{
    room_id = "sala_nova_${timestamp}"
    start_time = "2025-12-25T16:00:00"
    end_time = "2025-12-25T17:00:00"
} | ConvertTo-Json

try {
    $headers = @{ "Authorization" = "Bearer $adminToken" }
    $proposta = Invoke-RestMethod -Uri "$baseUrl/api/reservas/$reservaId/propor-mudanca" -Method PUT -Body $mudancaBody -ContentType "application/json" -Headers $headers
    Write-Host "  [OK] Proposta de mudanca enviada!" -ForegroundColor Green
    Write-Host "  [INFO] Expira em: $($proposta.expiresAt)" -ForegroundColor Cyan
} catch {
    Write-Host "  [ERRO] $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  [INFO] Detalhes do erro: $($_.Exception.Response)" -ForegroundColor Yellow
    exit
}

Write-Host "`n=== FASE 5: VERIFICACAO DE NOTIFICACOES APOS MUDANCA ===" -ForegroundColor Magenta

Write-Host "`n[5.1] Aguardando processamento..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

Write-Host "`n[5.2] Verificando notificacoes do cliente apos mudanca..." -ForegroundColor Yellow
try {
    $headers = @{ "Authorization" = "Bearer $clientToken" }
    $notifAposMudanca = Invoke-RestMethod -Uri "$baseUrl/api/notificacoes" -Method GET -Headers $headers
    Write-Host "  [INFO] Cliente tem $($notifAposMudanca.Count) notificacao(oes) apos mudanca" -ForegroundColor Cyan
    
    $novasNotif = $notifAposMudanca.Count - $notifIniciais.Count
    Write-Host "  [INFO] $novasNotif nova(s) notificacao(oes) recebida(s)" -ForegroundColor Cyan
    
    # Verifica se há notificação de mudança
    $notifMudanca = $notifAposMudanca | Where-Object { $_.type -eq "change_request" } | Select-Object -First 1
    if ($notifMudanca) {
        Write-Host "  [OK] NOTIFICACAO DE MUDANCA ENCONTRADA!" -ForegroundColor Green
        Write-Host "  [INFO] Mensagem: $($notifMudanca.message)" -ForegroundColor Cyan
        Write-Host "  [INFO] Criada em: $($notifMudanca.created_at)" -ForegroundColor Cyan
        Write-Host "  [INFO] Lida: $($notifMudanca.is_read)" -ForegroundColor Cyan
    } else {
        Write-Host "  [AVISO] Notificacao de mudanca NAO encontrada" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [ERRO] $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n[5.3] Verificando mudancas pendentes..." -ForegroundColor Yellow
try {
    $headers = @{ "Authorization" = "Bearer $clientToken" }
    $mudancasPendentes = Invoke-RestMethod -Uri "$baseUrl/api/mudancas-pendentes" -Method GET -Headers $headers
    Write-Host "  [INFO] Cliente tem $($mudancasPendentes.Count) mudanca(s) pendente(s)" -ForegroundColor Cyan
    
    if ($mudancasPendentes.Count -gt 0) {
        $mudanca = $mudancasPendentes[0]
        Write-Host "  [OK] MUDANCA PENDENTE ENCONTRADA!" -ForegroundColor Green
        Write-Host "  [INFO] De: Sala $($mudanca.old_room_id) -> Sala $($mudanca.new_room_id)" -ForegroundColor Cyan
        Write-Host "  [INFO] Horario: $($mudanca.old_start_time) -> $($mudanca.new_start_time)" -ForegroundColor Cyan
        Write-Host "  [INFO] Expira em: $($mudanca.expires_at)" -ForegroundColor Cyan
    } else {
        Write-Host "  [AVISO] Nenhuma mudanca pendente encontrada" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [ERRO] $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== FASE 6: VERIFICACAO DO RABBITMQ ===" -ForegroundColor Magenta

Write-Host "`n[6.1] Verificando status do RabbitMQ..." -ForegroundColor Yellow
try {
    $rabbitStatus = docker exec rabbitmq rabbitmqctl status
    if ($rabbitStatus -like "*running*") {
        Write-Host "  [OK] RabbitMQ esta rodando" -ForegroundColor Green
    } else {
        Write-Host "  [AVISO] Status do RabbitMQ incerto" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [INFO] Nao foi possivel verificar RabbitMQ via CLI" -ForegroundColor Yellow
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  TESTE DE NOTIFICACOES COMPLETO         " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

Write-Host "`nRESUMO DO TESTE:" -ForegroundColor Cyan
Write-Host "1. Admin e Cliente logados com sucesso" -ForegroundColor White
Write-Host "2. Cliente criou reserva: $reservaId" -ForegroundColor White
Write-Host "3. Admin propôs mudança na reserva" -ForegroundColor White
Write-Host "4. Sistema processou a proposta" -ForegroundColor White

if ($notifMudanca -and $mudancasPendentes.Count -gt 0) {
    Write-Host "`n[SUCESSO] NOTIFICACOES FUNCIONANDO 100%!" -ForegroundColor Green
    Write-Host "- Notificacao criada e enviada ao cliente" -ForegroundColor Green
    Write-Host "- Mudanca pendente registrada corretamente" -ForegroundColor Green
    Write-Host "- Cliente pode ver e responder a mudanca" -ForegroundColor Green
} else {
    Write-Host "`n[ATENCAO] Verificar sistema de notificacoes" -ForegroundColor Yellow
    Write-Host "- Pode haver delay no processamento" -ForegroundColor Yellow
    Write-Host "- Verificar logs do RabbitMQ e backend" -ForegroundColor Yellow
}

Write-Host "`nTESTE MANUAL RECOMENDADO:" -ForegroundColor Cyan
Write-Host "1. Login como cliente: cliente@teste.com / 123456" -ForegroundColor Yellow
Write-Host "2. Acesse: https://localhost/notifications" -ForegroundColor Yellow
Write-Host "3. Verifique se ha notificacoes de mudanca" -ForegroundColor Yellow
Write-Host "4. Teste aprovar/rejeitar a mudanca proposta" -ForegroundColor Yellow
Write-Host ""