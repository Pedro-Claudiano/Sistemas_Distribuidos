# Script para gerar certificado SSL auto-assinado

Write-Host "Gerando certificado SSL auto-assinado..." -ForegroundColor Cyan

# Criar diretório se não existir
if (!(Test-Path "nginx-certs")) {
    New-Item -ItemType Directory -Path "nginx-certs" | Out-Null
}

# Gerar certificado usando OpenSSL (se disponível) ou criar com PowerShell
$certPath = "nginx-certs\server.crt"
$keyPath = "nginx-certs\server.key"

# Verificar se OpenSSL está disponível
$opensslAvailable = $null -ne (Get-Command openssl -ErrorAction SilentlyContinue)

if ($opensslAvailable) {
    Write-Host "Usando OpenSSL para gerar certificado..." -ForegroundColor Yellow
    
    # Gerar chave privada
    openssl genrsa -out $keyPath 2048 2>$null
    
    # Gerar certificado auto-assinado
    openssl req -new -x509 -key $keyPath -out $certPath -days 365 -subj "/C=BR/ST=State/L=City/O=Organization/CN=localhost" 2>$null
    
    Write-Host "Certificado SSL criado com sucesso!" -ForegroundColor Green
    Write-Host "  Certificado: $certPath" -ForegroundColor White
    Write-Host "  Chave: $keyPath" -ForegroundColor White
} else {
    Write-Host "OpenSSL nao encontrado. Usando metodo alternativo..." -ForegroundColor Yellow
    
    # Criar certificado auto-assinado usando PowerShell
    $cert = New-SelfSignedCertificate -DnsName "localhost" -CertStoreLocation "cert:\LocalMachine\My" -NotAfter (Get-Date).AddYears(1)
    
    # Exportar certificado
    $certPassword = ConvertTo-SecureString -String "password" -Force -AsPlainText
    Export-PfxCertificate -Cert $cert -FilePath "nginx-certs\server.pfx" -Password $certPassword | Out-Null
    
    # Converter PFX para PEM usando OpenSSL (se disponível) ou instruir usuário
    Write-Host "Certificado PFX criado em: nginx-certs\server.pfx" -ForegroundColor Green
    Write-Host "Senha: password" -ForegroundColor White
    Write-Host ""
    Write-Host "Para converter para formato PEM, execute:" -ForegroundColor Yellow
    Write-Host "  openssl pkcs12 -in nginx-certs\server.pfx -out nginx-certs\server.crt -clcerts -nokeys -passin pass:password" -ForegroundColor White
    Write-Host "  openssl pkcs12 -in nginx-certs\server.pfx -out nginx-certs\server.key -nocerts -nodes -passin pass:password" -ForegroundColor White
}

Write-Host ""
Write-Host "Certificado SSL pronto para uso!" -ForegroundColor Green
