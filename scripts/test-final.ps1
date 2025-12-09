Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TESTE FINAL - VALIDACAO COMPLETA      " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$baseUrl = "https://localhost"
$timestamp = Get-Date -Format "yyyyMMddHHmmss"

# Ignorar erros de certificado SSL
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

$testsPassed = 0
$testsFailed = 0

function Test-Step {
    param($name, $scriptBlock)
    Write-Host "`n[$name]" -ForegroundColor Yellow
    try {
        & $scriptBlock
        Write-Host "  [OK]" -ForegroundColor Green
        $script:testsPassed++
        return $true
    } catch {
        Write-Host "  [FALHA] $($_.Exception.Message)" -ForegroundColor Red
        $script:testsFailed++
        return $false
    }
}

# Teste 1: Health Check
Test-Step "Health Check" {
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET
}

# Teste 2: Criar Cliente
$clientEmail = "cliente_final_${timestamp}@teste.com"
Test-Step "Criar Cliente" {
    $clientBody = @{
        name = "Cliente Final"
        email = $clientEmail
        password = "senha123"
    } | ConvertTo-Json
    
    $script:client = Invoke-RestMethod -Uri "$baseUrl/api/users" -Method POST -Body $clientBody -ContentType "application/json"
}

# Teste 3: Login Cliente
Test-Step "Login Cliente" {
    $loginBody = @{
        email = $clientEmail
        password = "senha123"
    } | ConvertTo-Json
    
    $loginResult = Invoke-RestMethod -Uri "$baseUrl/api/users/login" -Method POST -Body $loginBody -ContentType "application/json"
    $script:clientToken = $loginResult.token
}

# Teste 4: Criar Admin
$adminEmail = "admin_final_${timestamp}@teste.com"
Test-Step "Criar Admin" {
    $adminBody = @{
        name = "Admin Final"
        email = $adminEmail
        password = "admin123"
        role = "admin"
    } | ConvertTo-Json
    
    $script:admin = Invoke-RestMethod -Uri "$baseUrl/api/users" -Method POST -Body $adminBody -ContentType "application/json"
}

# Teste 5: Login Admin
Test-Step "Login Admin" {
    $adminLoginBody = @{
        email = $adminEmail
        password = "admin123"
    } | ConvertTo-Json
    
    $adminLoginResult = Invoke-RestMethod -Uri "$baseUrl/api/users/login" -Method POST -Body $adminLoginBody -ContentType "application/json"
    $script:adminToken = $adminLoginResult.token
}

# Teste 6: Cliente Criar Reserva
$roomId = "sala_final_${timestamp}"
Test-Step "Cliente Criar Reserva" {
    $reservationBody = @{
        room_id = $roomId
        start_time = "2025-12-30T10:00:00"
        end_time = "2025-12-30T11:00:00"
    } | ConvertTo-Json
    
    $headers = @{ "Authorization" = "Bearer $clientToken" }
    $script:reservation = Invoke-RestMethod -Uri "$baseUrl/api/reservas" -Method POST -Body $reservationBody -ContentType "application/json" -Headers $headers
}

# Teste 7: Cliente Listar Suas Reservas
Test-Step "Cliente Listar Reservas" {
    $headers = @{ "Authorization" = "Bearer $clientToken" }
    $reservations = Invoke-RestMethod -Uri "$baseUrl/api/reservas" -Method GET -Headers $headers
    if ($reservations.Count -eq 0) { throw "Cliente deveria ter pelo menos 1 reserva" }
}

# Teste 8: Admin Listar Todas Reservas
Test-Step "Admin Listar Todas Reservas" {
    $headers = @{ "Authorization" = "Bearer $adminToken" }
    $allReservations = Invoke-RestMethod -Uri "$baseUrl/api/reservas" -Method GET -Headers $headers
    if ($allReservations.Count -eq 0) { throw "Admin deveria ver reservas no sistema" }
}

# Teste 9: Admin Modificar Reserva
$newRoomId = "sala_modificada_${timestamp}"
Test-Step "Admin Modificar Reserva" {
    $updateBody = @{
        room_id = $newRoomId
        start_time = "2025-12-30T14:00:00"
        end_time = "2025-12-30T15:00:00"
    } | ConvertTo-Json
    
    $headers = @{ "Authorization" = "Bearer $adminToken" }
    $updated = Invoke-RestMethod -Uri "$baseUrl/api/reservas/$($reservation.id)" -Method PUT -Body $updateBody -ContentType "application/json" -Headers $headers
}

# Teste 10: Cliente Verificar Notificação
Start-Sleep -Seconds 2
Test-Step "Cliente Receber Notificacao" {
    $headers = @{ "Authorization" = "Bearer $clientToken" }
    $notifications = Invoke-RestMethod -Uri "$baseUrl/api/notificacoes" -Method GET -Headers $headers
    if ($notifications.Count -eq 0) { throw "Cliente deveria ter recebido notificacao" }
    Write-Host "    Notificacao: $($notifications[0].message)" -ForegroundColor Cyan
}

# Teste 11: Admin Criar Evento
$eventRoomId = "sala_evento_${timestamp}"
Test-Step "Admin Criar Evento" {
    $eventBody = @{
        name = "Evento Final ${timestamp}"
        description = "Teste final"
        room_id = $eventRoomId
        start_time = "2025-12-31T09:00:00"
        end_time = "2025-12-31T12:00:00"
    } | ConvertTo-Json
    
    $headers = @{ "Authorization" = "Bearer $adminToken" }
    $script:event = Invoke-RestMethod -Uri "$baseUrl/api/eventos" -Method POST -Body $eventBody -ContentType "application/json" -Headers $headers
}

# Teste 12: Cliente Listar Eventos
Test-Step "Cliente Listar Eventos" {
    $headers = @{ "Authorization" = "Bearer $clientToken" }
    $events = Invoke-RestMethod -Uri "$baseUrl/api/eventos" -Method GET -Headers $headers
    if ($events.Count -eq 0) { throw "Deveria haver eventos no sistema" }
}

# Teste 13: Cliente Receber Notificação de Evento
Start-Sleep -Seconds 2
Test-Step "Cliente Receber Notificacao de Evento" {
    $headers = @{ "Authorization" = "Bearer $clientToken" }
    $notifications = Invoke-RestMethod -Uri "$baseUrl/api/notificacoes" -Method GET -Headers $headers
    $eventNotif = $notifications | Where-Object { $_.type -eq "event_created" }
    if (-not $eventNotif) { throw "Cliente deveria ter recebido notificacao de evento" }
}

# Teste 14: Cliente Deletar Sua Reserva
Test-Step "Cliente Deletar Propria Reserva" {
    $headers = @{ "Authorization" = "Bearer $clientToken" }
    Invoke-RestMethod -Uri "$baseUrl/api/reservas/$($reservation.id)" -Method DELETE -Headers $headers
}

# Teste 15: Verificar Replicação MySQL
Test-Step "Replicacao MySQL" {
    $slaveStatus = docker exec mysql-secondary mysql -u root -proot_password_123 -e "SHOW SLAVE STATUS\G" 2>&1 | Out-String
    if ($slaveStatus -notmatch "Slave_IO_Running:\s+Yes") { throw "Slave_IO_Running nao esta Yes" }
    if ($slaveStatus -notmatch "Slave_SQL_Running:\s+Yes") { throw "Slave_SQL_Running nao esta Yes" }
    Write-Host "    IO: Yes, SQL: Yes" -ForegroundColor Cyan
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "           RESULTADO FINAL              " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Testes Passados: $testsPassed" -ForegroundColor Green
Write-Host "Testes Falhados: $testsFailed" -ForegroundColor $(if ($testsFailed -eq 0) { "Green" } else { "Red" })
Write-Host ""

if ($testsFailed -eq 0) {
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  SISTEMA 100% FUNCIONAL - TODOS OS    " -ForegroundColor Green
    Write-Host "  TESTES PASSARAM COM SUCESSO!         " -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Host "Alguns testes falharam. Verifique os logs." -ForegroundColor Yellow
}
Write-Host ""
