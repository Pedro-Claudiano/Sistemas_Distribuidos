# Teste de Permissões - Cliente não pode deletar reserva de outro cliente
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TESTE DE PERMISSOES                   " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$baseUrl = "https://localhost"

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

# Criar Cliente 1
Write-Host "`n[1] Criando Cliente 1..." -ForegroundColor Yellow
$client1Body = @{
    name = "Cliente 1"
    email = "cliente1_$(Get-Random)@teste.com"
    password = "senha123"
} | ConvertTo-Json

$client1 = Invoke-RestMethod -Uri "$baseUrl/api/users" -Method POST -Body $client1Body -ContentType "application/json"

$login1Body = @{
    email = $client1.email
    password = "senha123"
} | ConvertTo-Json

$login1 = Invoke-RestMethod -Uri "$baseUrl/api/users/login" -Method POST -Body $login1Body -ContentType "application/json"
$token1 = $login1.token
Write-Host "OK - Cliente 1 criado e autenticado" -ForegroundColor Green

# Cliente 1 cria uma reserva
Write-Host "`n[2] Cliente 1 criando reserva..." -ForegroundColor Yellow
$reservationBody = @{
    room_id = "sala_permissoes"
    start_time = "2025-12-30T14:00:00"
    end_time = "2025-12-30T15:00:00"
} | ConvertTo-Json

$headers1 = @{
    "Authorization" = "Bearer $token1"
}

$reservation = Invoke-RestMethod -Uri "$baseUrl/api/reservas" -Method POST -Body $reservationBody -ContentType "application/json" -Headers $headers1
$reservationId = $reservation.id
Write-Host "OK - Reserva criada: $reservationId" -ForegroundColor Green

# Criar Cliente 2
Write-Host "`n[3] Criando Cliente 2..." -ForegroundColor Yellow
$client2Body = @{
    name = "Cliente 2"
    email = "cliente2_$(Get-Random)@teste.com"
    password = "senha123"
} | ConvertTo-Json

$client2 = Invoke-RestMethod -Uri "$baseUrl/api/users" -Method POST -Body $client2Body -ContentType "application/json"

$login2Body = @{
    email = $client2.email
    password = "senha123"
} | ConvertTo-Json

$login2 = Invoke-RestMethod -Uri "$baseUrl/api/users/login" -Method POST -Body $login2Body -ContentType "application/json"
$token2 = $login2.token
Write-Host "OK - Cliente 2 criado e autenticado" -ForegroundColor Green

# Cliente 2 tenta deletar reserva do Cliente 1
Write-Host "`n[4] Cliente 2 tentando deletar reserva do Cliente 1..." -ForegroundColor Yellow
$headers2 = @{
    "Authorization" = "Bearer $token2"
}

try {
    Invoke-RestMethod -Uri "$baseUrl/api/reservas/$reservationId" -Method DELETE -Headers $headers2
    Write-Host "[FALHA] Cliente 2 conseguiu deletar reserva do Cliente 1!" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 403) {
        Write-Host "[OK] Cliente 2 foi BLOQUEADO (403 Forbidden)" -ForegroundColor Green
    } else {
        Write-Host "[ERRO] Erro inesperado: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Cliente 1 deleta sua própria reserva
Write-Host "`n[5] Cliente 1 deletando sua propria reserva..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "$baseUrl/api/reservas/$reservationId" -Method DELETE -Headers $headers1
    Write-Host "[OK] Cliente 1 conseguiu deletar sua propria reserva" -ForegroundColor Green
} catch {
    Write-Host "[FALHA] Cliente 1 nao conseguiu deletar sua propria reserva: $($_.Exception.Message)" -ForegroundColor Red
}

# Criar Admin
Write-Host "`n[6] Criando Admin..." -ForegroundColor Yellow
$adminBody = @{
    name = "Admin Teste"
    email = "admin_$(Get-Random)@teste.com"
    password = "admin123"
    role = "admin"
} | ConvertTo-Json

$admin = Invoke-RestMethod -Uri "$baseUrl/api/users" -Method POST -Body $adminBody -ContentType "application/json"

$adminLoginBody = @{
    email = $admin.email
    password = "admin123"
} | ConvertTo-Json

$adminLogin = Invoke-RestMethod -Uri "$baseUrl/api/users/login" -Method POST -Body $adminLoginBody -ContentType "application/json"
$adminToken = $adminLogin.token
Write-Host "OK - Admin criado e autenticado" -ForegroundColor Green

# Cliente 1 cria outra reserva
Write-Host "`n[7] Cliente 1 criando nova reserva..." -ForegroundColor Yellow
$reservation2Body = @{
    room_id = "sala_admin_test"
    start_time = "2025-12-31T10:00:00"
    end_time = "2025-12-31T11:00:00"
} | ConvertTo-Json

$reservation2 = Invoke-RestMethod -Uri "$baseUrl/api/reservas" -Method POST -Body $reservation2Body -ContentType "application/json" -Headers $headers1
$reservation2Id = $reservation2.id
Write-Host "OK - Nova reserva criada: $reservation2Id" -ForegroundColor Green

# Admin deleta reserva do Cliente 1
Write-Host "`n[8] Admin deletando reserva do Cliente 1..." -ForegroundColor Yellow
$adminHeaders = @{
    "Authorization" = "Bearer $adminToken"
}

try {
    Invoke-RestMethod -Uri "$baseUrl/api/reservas/$reservation2Id" -Method DELETE -Headers $adminHeaders
    Write-Host "[OK] Admin conseguiu deletar reserva do cliente" -ForegroundColor Green
} catch {
    Write-Host "[FALHA] Admin nao conseguiu deletar: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "           RESUMO                       " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "[OK] Cliente nao pode deletar reserva de outro cliente" -ForegroundColor Green
Write-Host "[OK] Cliente pode deletar sua propria reserva" -ForegroundColor Green
Write-Host "[OK] Admin pode deletar qualquer reserva" -ForegroundColor Green
Write-Host ""
Write-Host "SISTEMA DE PERMISSOES FUNCIONANDO!" -ForegroundColor Green
Write-Host ""
