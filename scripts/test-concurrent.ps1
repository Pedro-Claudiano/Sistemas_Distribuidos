# Teste de Lock Distribuído - Requisições Concorrentes
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TESTE DE LOCK DISTRIBUIDO            " -ForegroundColor Cyan
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

# Criar usuário e fazer login
Write-Host "`n[1] Criando usuario e fazendo login..." -ForegroundColor Yellow
$userBody = @{
    name = "Teste Concorrente"
    email = "concurrent$(Get-Random)@teste.com"
    password = "senha123"
} | ConvertTo-Json

$user = Invoke-RestMethod -Uri "$baseUrl/api/users" -Method POST -Body $userBody -ContentType "application/json"

$loginBody = @{
    email = $user.email
    password = "senha123"
} | ConvertTo-Json

$loginResult = Invoke-RestMethod -Uri "$baseUrl/api/users/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $loginResult.token
Write-Host "OK - Token obtido" -ForegroundColor Green

# Tentar criar 3 reservas simultâneas para a mesma sala/horário
Write-Host "`n[2] Enviando 3 requisicoes simultaneas para a mesma sala/horario..." -ForegroundColor Yellow

$reservationBody = @{
    room_id = "sala_teste_lock"
    start_time = "2025-12-25T10:00:00"
    end_time = "2025-12-25T11:00:00"
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $token"
}

$jobs = @()
for ($i = 1; $i -le 3; $i++) {
    $jobs += Start-Job -ScriptBlock {
        param($url, $body, $headers)
        
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
        
        try {
            $result = Invoke-RestMethod -Uri $url -Method POST -Body $body -ContentType "application/json" -Headers $headers
            return @{ Success = $true; Id = $result.id }
        } catch {
            return @{ Success = $false; Error = $_.Exception.Message }
        }
    } -ArgumentList "$baseUrl/api/reservas", $reservationBody, $headers
}

Write-Host "Aguardando conclusao das requisicoes..." -ForegroundColor Yellow
$results = $jobs | Wait-Job | Receive-Job
$jobs | Remove-Job

$successCount = ($results | Where-Object { $_.Success -eq $true }).Count
$failCount = ($results | Where-Object { $_.Success -eq $false }).Count

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "           RESULTADO                    " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Requisicoes bem-sucedidas: $successCount" -ForegroundColor Green
Write-Host "Requisicoes bloqueadas: $failCount" -ForegroundColor Yellow

if ($successCount -eq 1 -and $failCount -eq 2) {
    Write-Host "`n[OK] LOCK DISTRIBUIDO FUNCIONANDO!" -ForegroundColor Green
    Write-Host "Apenas 1 reserva foi criada, as outras 2 foram bloqueadas corretamente." -ForegroundColor Green
} else {
    Write-Host "`n[AVISO] Resultado inesperado." -ForegroundColor Yellow
    Write-Host "Esperado: 1 sucesso e 2 falhas" -ForegroundColor Yellow
}

Write-Host "`nDetalhes:" -ForegroundColor Cyan
foreach ($result in $results) {
    if ($result.Success) {
        Write-Host "  [SUCESSO] Reserva criada: $($result.Id)" -ForegroundColor Green
    } else {
        Write-Host "  [BLOQUEADO] $($result.Error)" -ForegroundColor Yellow
    }
}
