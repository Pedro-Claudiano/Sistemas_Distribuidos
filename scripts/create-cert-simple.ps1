# Script simples para criar certificados SSL

Write-Host "Criando certificados SSL auto-assinados..." -ForegroundColor Cyan

# Criar diretório
New-Item -ItemType Directory -Path "nginx-certs" -Force | Out-Null

# Criar arquivo de configuração OpenSSL
$opensslConfig = @"
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
x509_extensions = v3_req

[dn]
C=BR
ST=State
L=City
O=Organization
CN=localhost

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
IP.1 = 127.0.0.1
"@

$opensslConfig | Out-File -FilePath "nginx-certs\openssl.cnf" -Encoding ASCII

Write-Host "Arquivo de configuracao criado" -ForegroundColor Green
Write-Host ""
Write-Host "Execute os seguintes comandos para gerar os certificados:" -ForegroundColor Yellow
Write-Host ""
Write-Host "docker run --rm -v `${PWD}/nginx-certs:/certs alpine/openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /certs/server.key -out /certs/server.crt -config /certs/openssl.cnf" -ForegroundColor White
Write-Host ""
Write-Host "OU se tiver OpenSSL instalado:" -ForegroundColor Yellow
Write-Host ""
Write-Host "openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout nginx-certs\server.key -out nginx-certs\server.crt -config nginx-certs\openssl.cnf" -ForegroundColor White
