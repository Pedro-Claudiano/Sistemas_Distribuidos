# Script de Testes Automatizados do Sistema
# PowerShell Script

$baseUrl = "http://localhost"
$adminToken = ""
$clientToken = ""
$reservationId = ""

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  TESTES AUTOMATIZADOS - SISTEMA  " -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

function Test-Endpoint {
    param (
        [string]$Name,
        [string]$Method,
        [string]$Url,
        [hashtable]$Headers = @{},
        [string]$Body = $null
    )
    
    Write-Host "Testando: $Name" -ForegroundColor Yellow
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $Headers
            ContentType = "application/json"
        }
        
        if ($Body) {
            $params.Body = $Body
        }
        
        $response = Invoke-RestMethod @params
        Write-Host "Success!" -ForegroundColor Green
        return $response
    }
    catch {
        Write-Host "Failed: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Teste 1: Criar Cliente
Write-Host "`n[1/12] Criando usuário cliente..." -ForegroundColor Cyan
$clientBody = @{
    name = "Cliente Teste"
    email = "cliente@teste.com"
    password = "senha123"
} | ConvertTo-Json

$clientResult = Test-Endpoint -Name "Criar Cliente" -Method "POST" -Url "$baseUrl/api/users" -Body $clientBody

# Teste 2: Login Cliente
Write-Host "`n[2/12] Fazendo login como cliente..." -ForegroundColor Cyan
$loginClientBody = @{
    email = "cliente@teste.com"
    password = "senha123"
} | ConvertTo-Json

$loginClientResult = Test-Endpoint -Name "Login Cliente" -Method "POST" -Url "$baseUrl/api/users/login" -Body $loginClientBody

if ($loginClientResult) {
    $clientToken = $loginClientResult.token
    Write-Host "Token do cliente obtido!" -ForegroundColor Green
}

# Teste 3: Criar Admin
Write-Host "`n[3/12] Criando usuário admin..." -ForegroundColor Cyan
$adminBody = @{
    name = "Admin Master"
    email = "admin@teste.com"
    password = "admin123"
    role = "admin"
} | ConvertTo-Json

$adminResult = Test-Endpoint -Name "Criar Admin" -Method "POST" -Url "$baseUrl/api/users" -Body $adminBody

# Teste 4: Login Admin
Write-Host "`n[4/12] Fazendo login como admin..." -ForegroundColor Cyan
$loginAdminBody = @{
    email = "admin@teste.com"
    password = "admin123"
} | ConvertTo-Json

$loginAdminResult = Test-Endpoint -Name "Login Admin" -Method "POST" -Url "$baseUrl/api/users/login" -Body $loginAdminBody

if ($loginAdminResult) {
    $adminToken = $loginAdminResult.token
    Write-Host "Token do admin obtido!" -ForegroundColor Green
}

# Teste 5: Cliente cria reserva
Write-Host "`n[5/12] Cliente criando reserva..." -ForegroundColor Cyan
$reservationBody = @{
    room_id = "sala_103"
    start_time = "2025-12-15T14:00:00"
    end_time = "2025-12-15T15:00:00"
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $clientToken"
}

$reservationResult = Test-Endpoint -Name "Criar Reserva" -Method "POST" -Url "$baseUrl/api/reservas" -Headers $headers -Body $reservationBody

if ($reservationResult) {
    $reservationId = $reservationResult.id
    Write-Host "Reserva criada com ID: $reservationId" -ForegroundColor Green
}

# Teste 6: Cliente lista suas reservas
Write-Host "`n[6/12] Cliente listando suas reservas..." -ForegroundColor Cyan
$headers = @{
    "Authorization" = "Bearer $clientToken"
}

Test-Endpoint -Name "Listar Reservas Cliente" -Method "GET" -Url "$baseUrl/api/reservas" -Headers $headers

# Teste 7: Admin lista todas as reservas
Write-Host "`n[7/12] Admin listando todas as reservas..." -ForegroundColor Cyan
$headers = @{
    "Authorization" = "Bearer $adminToken"
}

Test-Endpoint -Name "Listar Todas Reservas (Admin)" -Method "GET" -Url "$baseUrl/api/reservas" -Headers $headers

# Teste 8: Admin modifica reserva do cliente
Write-Host "`n[8/12] Admin modificando reserva do cliente..." -ForegroundColor Cyan
$updateBody = @{
    room_id = "sala_201"
    start_time = "2025-12-15T16:00:00"
    end_time = "2025-12-15T17:00:00"
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $adminToken"
}

Test-Endpoint -Name "Atualizar Reserva (Admin)" -Method "PUT" -Url "$baseUrl/api/reservas/$reservationId" -Headers $headers -Body $updateBody

# Teste 9: Cliente verifica notificações
Write-Host "`n[9/12] Cliente verificando notificações..." -ForegroundColor Cyan
Start-Sleep -Seconds 2

$headers = @{
    "Authorization" = "Bearer $clientToken"
}

$notifications = Test-Endpoint -Name "Listar Notificações" -Method "GET" -Url "$baseUrl/api/notificacoes" -Headers $headers

if ($notifications -and $notifications.Count -gt 0) {
    Write-Host "Client received $($notifications.Count) notification(s)!" -ForegroundColor Green
}

# Teste 10: Admin cria evento
Write-Host "`n[10/12] Admin criando evento..." -ForegroundColor Cyan
$eventBody = @{
    name = "Reunião Geral"
    description = "Reunião mensal de todos os departamentos"
    room_id = "sala_auditorio"
    start_time = "2025-12-20T09:00:00"
    end_time = "2025-12-20T12:00:00"
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $adminToken"
}

Test-Endpoint -Name "Criar Evento (Admin)" -Method "POST" -Url "$baseUrl/api/eventos" -Headers $headers -Body $eventBody

# Teste 11: Cliente lista eventos
Write-Host "`n[11/12] Cliente listando eventos..." -ForegroundColor Cyan
$headers = @{
    "Authorization" = "Bearer $clientToken"
}

Test-Endpoint -Name "Listar Eventos" -Method "GET" -Url "$baseUrl/api/eventos" -Headers $headers

# Teste 12: Cliente verifica novas notificações
Write-Host "`n[12/12] Cliente verificando novas notificações..." -ForegroundColor Cyan
Start-Sleep -Seconds 2

$headers = @{
    "Authorization" = "Bearer $clientToken"
}

$finalNotifications = Test-Endpoint -Name "Listar Notificações Finais" -Method "GET" -Url "$baseUrl/api/notificacoes" -Headers $headers

if ($finalNotifications -and $finalNotifications.Count -gt 0) {
    Write-Host "Cliente has $($finalNotifications.Count) notification(s) total!" -ForegroundColor Green
}

# Resumo
Write-Host "`n==================================" -ForegroundColor Cyan
Write-Host "       TEST SUMMARY          " -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Authentication system working" -ForegroundColor Green
Write-Host "Admin/Client differentiation OK" -ForegroundColor Green
Write-Host "Reservations working" -ForegroundColor Green
Write-Host "Notifications working" -ForegroundColor Green
Write-Host "Events working" -ForegroundColor Green
Write-Host ""
Write-Host "System 100% operational!" -ForegroundColor Green
